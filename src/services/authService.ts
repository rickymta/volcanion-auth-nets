import { RowDataPacket } from 'mysql2';
import { pool, redisClient } from '../config/database';
import { RefreshToken, PasswordReset, EmailVerification, JwtTokens, TokenPayload } from '../types';
import { PasswordUtils, JwtUtils, DateUtils } from '../utils';
import { AccountService } from './accountService';

export class AuthService {
  // Refresh Token Management
  static async saveRefreshToken(
    accountId: number, 
    token: string, 
    deviceInfo?: string, 
    ipAddress?: string
  ): Promise<void> {
    const tokenHash = PasswordUtils.hashToken(token);
    const expiresAt = DateUtils.addDays(new Date(), 7);

    const query = `
      INSERT INTO refresh_tokens (account_id, token_hash, expires_at, device_info, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [accountId, tokenHash, expiresAt, deviceInfo, ipAddress]);
  }

  static async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = PasswordUtils.hashToken(token);
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? AND is_revoked = 0 AND expires_at > NOW()
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [tokenHash]);
    return rows.length > 0 ? rows[0] as RefreshToken : null;
  }

  static async revokeRefreshToken(token: string): Promise<boolean> {
    const tokenHash = PasswordUtils.hashToken(token);
    const query = 'UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?';
    const [result] = await pool.execute(query, [tokenHash]);
    
    return (result as any).affectedRows > 0;
  }

  static async revokeAllRefreshTokens(accountId: number): Promise<void> {
    const query = 'UPDATE refresh_tokens SET is_revoked = 1 WHERE account_id = ?';
    await pool.execute(query, [accountId]);
  }

  static async cleanupExpiredTokens(): Promise<void> {
    const query = 'DELETE FROM refresh_tokens WHERE expires_at < NOW()';
    await pool.execute(query);
  }

  // Password Reset
  static async createPasswordReset(accountId: number): Promise<string> {
    const token = PasswordUtils.generateSecureToken();
    const tokenHash = PasswordUtils.hashToken(token);
    const expiresAt = DateUtils.addHours(new Date(), 1); // 1 hour expiry

    const query = `
      INSERT INTO password_resets (account_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `;

    await pool.execute(query, [accountId, tokenHash, expiresAt]);
    return token;
  }

  static async findPasswordReset(token: string): Promise<PasswordReset | null> {
    const tokenHash = PasswordUtils.hashToken(token);
    const query = `
      SELECT * FROM password_resets 
      WHERE token_hash = ? AND is_used = 0 AND expires_at > NOW()
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [tokenHash]);
    return rows.length > 0 ? rows[0] as PasswordReset : null;
  }

  static async usePasswordReset(token: string): Promise<boolean> {
    const tokenHash = PasswordUtils.hashToken(token);
    const query = 'UPDATE password_resets SET is_used = 1 WHERE token_hash = ?';
    const [result] = await pool.execute(query, [tokenHash]);
    
    return (result as any).affectedRows > 0;
  }

  // Email Verification
  static async createEmailVerification(accountId: number): Promise<string> {
    const token = PasswordUtils.generateSecureToken();
    const tokenHash = PasswordUtils.hashToken(token);
    const expiresAt = DateUtils.addHours(new Date(), 24); // 24 hours expiry

    const query = `
      INSERT INTO email_verifications (account_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `;

    await pool.execute(query, [accountId, tokenHash, expiresAt]);
    return token;
  }

  static async findEmailVerification(token: string): Promise<EmailVerification | null> {
    const tokenHash = PasswordUtils.hashToken(token);
    const query = `
      SELECT * FROM email_verifications 
      WHERE token_hash = ? AND is_used = 0 AND expires_at > NOW()
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [tokenHash]);
    return rows.length > 0 ? rows[0] as EmailVerification : null;
  }

  static async useEmailVerification(token: string): Promise<boolean> {
    const tokenHash = PasswordUtils.hashToken(token);
    const query = 'UPDATE email_verifications SET is_used = 1 WHERE token_hash = ?';
    const [result] = await pool.execute(query, [tokenHash]);
    
    return (result as any).affectedRows > 0;
  }

  // Login/Logout
  static async login(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<JwtTokens | null> {
    const account = await AccountService.findByEmail(email);
    if (!account) return null;

    const isValidPassword = await PasswordUtils.compare(password, account.password);
    if (!isValidPassword) return null;

    // Get user permissions for JWT payload
    const accountWithPermissions = await AccountService.getAccountWithPermissions(account.id);
    
    const payload: TokenPayload = {
      accountId: account.id,
      email: account.email,
      permissions: accountWithPermissions?.permissions || []
    };

    const tokens = JwtUtils.generateTokens(payload);
    
    // Save refresh token
    await this.saveRefreshToken(account.id, tokens.refreshToken, deviceInfo, ipAddress);
    
    // Update last login
    await AccountService.updateLastLogin(account.id);

    return tokens;
  }

  static async refreshTokens(refreshToken: string): Promise<JwtTokens | null> {
    try {
      // Verify refresh token
      const decoded = JwtUtils.verifyRefreshToken(refreshToken);
      
      // Check if token exists in database and is not revoked
      const tokenRecord = await this.findRefreshToken(refreshToken);
      if (!tokenRecord) return null;

      // Get fresh user data with permissions
      const accountWithPermissions = await AccountService.getAccountWithPermissions(decoded.accountId);
      if (!accountWithPermissions) return null;

      const payload: TokenPayload = {
        accountId: accountWithPermissions.id,
        email: accountWithPermissions.email,
        permissions: accountWithPermissions.permissions
      };

      // Generate new tokens
      const newTokens = JwtUtils.generateTokens(payload);
      
      // Revoke old refresh token
      await this.revokeRefreshToken(refreshToken);
      
      // Save new refresh token
      await this.saveRefreshToken(
        decoded.accountId, 
        newTokens.refreshToken, 
        tokenRecord.device_info, 
        tokenRecord.ip_address
      );

      return newTokens;
    } catch (error) {
      return null;
    }
  }

  static async logout(refreshToken: string): Promise<boolean> {
    return await this.revokeRefreshToken(refreshToken);
  }

  static async logoutAll(accountId: number): Promise<void> {
    await this.revokeAllRefreshTokens(accountId);
    
    // Also clear any cached sessions in Redis
    const pattern = `session:${accountId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  // Session Management with Redis
  static async createSession(accountId: number, sessionData: any, expiresInSeconds: number = 86400): Promise<string> {
    const sessionId = PasswordUtils.generateSecureToken();
    const sessionKey = `session:${accountId}:${sessionId}`;
    
    await redisClient.setEx(sessionKey, expiresInSeconds, JSON.stringify(sessionData));
    return sessionId;
  }

  static async getSession(accountId: number, sessionId: string): Promise<any | null> {
    const sessionKey = `session:${accountId}:${sessionId}`;
    const sessionData = await redisClient.get(sessionKey);
    
    return sessionData ? JSON.parse(sessionData) : null;
  }

  static async deleteSession(accountId: number, sessionId: string): Promise<boolean> {
    const sessionKey = `session:${accountId}:${sessionId}`;
    const result = await redisClient.del(sessionKey);
    
    return result > 0;
  }

  static async extendSession(accountId: number, sessionId: string, expiresInSeconds: number = 86400): Promise<boolean> {
    const sessionKey = `session:${accountId}:${sessionId}`;
    const result = await redisClient.expire(sessionKey, expiresInSeconds);
    
    return result === 1;
  }

  // Rate limiting and security
  static async recordLoginAttempt(email: string, success: boolean, ipAddress?: string): Promise<void> {
    const key = `login_attempts:${email}:${ipAddress}`;
    const attempts = await redisClient.get(key);
    const currentAttempts = attempts ? parseInt(attempts) : 0;

    if (success) {
      // Clear login attempts on successful login
      await redisClient.del(key);
    } else {
      // Increment failed attempts
      const newAttempts = currentAttempts + 1;
      await redisClient.setEx(key, 900, newAttempts.toString()); // 15 minutes expiry
    }
  }

  static async getLoginAttempts(email: string, ipAddress?: string): Promise<number> {
    const key = `login_attempts:${email}:${ipAddress}`;
    const attempts = await redisClient.get(key);
    return attempts ? parseInt(attempts) : 0;
  }

  static async isAccountLocked(email: string, ipAddress?: string): Promise<boolean> {
    const attempts = await this.getLoginAttempts(email, ipAddress);
    return attempts >= 5; // Lock after 5 failed attempts
  }
}
