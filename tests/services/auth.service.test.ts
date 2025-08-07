// Mock all dependencies first
jest.mock('../../src/services/accountService');
jest.mock('../../src/utils');

import { AuthService } from '../../src/services/authService';
import { AccountService } from '../../src/services/accountService';
import { PasswordUtils, JwtUtils, DateUtils } from '../../src/utils';
import { pool, redisClient } from '../../src/config/database';

// Type the mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedis = redisClient as jest.Mocked<typeof redisClient>;
const mockAccountService = AccountService as jest.Mocked<typeof AccountService>;
const mockPasswordUtils = PasswordUtils as jest.Mocked<typeof PasswordUtils>;
const mockJwtUtils = JwtUtils as jest.Mocked<typeof JwtUtils>;
const mockDateUtils = DateUtils as jest.Mocked<typeof DateUtils>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveRefreshToken', () => {
    it('should save refresh token successfully', async () => {
      const mockExpiresAt = new Date('2024-12-31');
      
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockDateUtils.addDays.mockReturnValue(mockExpiresAt);
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      await AuthService.saveRefreshToken(1, 'refresh_token', 'device_info', '192.168.1.1');

      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('refresh_token');
      expect(mockDateUtils.addDays).toHaveBeenCalledWith(expect.any(Date), 7);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.any(Array)
      );
    });
  });

  describe('findRefreshToken', () => {
    it('should find valid refresh token', async () => {
      const mockToken = {
        id: 1,
        account_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date('2024-12-31'),
        is_revoked: 0
      };

      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([[mockToken]] as any);

      const result = await AuthService.findRefreshToken('refresh_token');

      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('refresh_token');
      expect(result).toEqual(mockToken);
    });

    it('should return null when token not found', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AuthService.findRefreshToken('invalid_token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AuthService.revokeRefreshToken('refresh_token');

      expect(result).toBe(true);
    });
  });

  describe('createPasswordReset', () => {
    it('should create password reset token', async () => {
      const mockExpiresAt = new Date('2024-12-31T01:00:00Z');
      
      mockPasswordUtils.generateSecureToken.mockReturnValue('secure_token');
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockDateUtils.addHours.mockReturnValue(mockExpiresAt);
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AuthService.createPasswordReset(1);

      expect(mockPasswordUtils.generateSecureToken).toHaveBeenCalled();
      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('secure_token');
      expect(mockDateUtils.addHours).toHaveBeenCalledWith(expect.any(Date), 1);
      expect(result).toBe('secure_token');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const mockAccountWithPermissions = {
        id: 1,
        email: 'test@example.com',
        first_name: undefined,
        last_name: undefined,
        phone: undefined,
        date_of_birth: undefined,
        gender: undefined,
        avatar_url: undefined,
        is_verified: true,
        is_active: true,
        last_login: undefined,
        created_at: new Date(),
        updated_at: new Date(),
        permissions: ['read_users', 'write_users'],
        roles: ['user']
      };
      
      const mockTokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 3600
      };

      mockAccountService.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordUtils.compare.mockResolvedValue(true);
      mockAccountService.getAccountWithPermissions.mockResolvedValue(mockAccountWithPermissions);
      mockJwtUtils.generateTokens.mockReturnValue(mockTokens);
      
      // Mock the saveRefreshToken method
      jest.spyOn(AuthService, 'saveRefreshToken').mockResolvedValue();
      mockAccountService.updateLastLogin.mockResolvedValue();

      const result = await AuthService.login('test@example.com', 'password', 'device', '192.168.1.1');

      expect(mockAccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordUtils.compare).toHaveBeenCalledWith('password', 'hashed_password');
      expect(result).toEqual(mockTokens);
    });

    it('should return null for non-existent user', async () => {
      mockAccountService.findByEmail.mockResolvedValue(null);

      const result = await AuthService.login('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const mockSessionData = { userId: 1, role: 'admin' };
      
      mockPasswordUtils.generateSecureToken.mockReturnValue('session_token');
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await AuthService.createSession(1, mockSessionData, 3600);

      expect(mockPasswordUtils.generateSecureToken).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'session:1:session_token',
        3600,
        JSON.stringify(mockSessionData)
      );
      expect(result).toBe('session_token');
    });
  });

  describe('getSession', () => {
    it('should get session successfully', async () => {
      const mockSessionData = { userId: 1, role: 'admin' };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await AuthService.getSession(1, 'session_token');

      expect(mockRedis.get).toHaveBeenCalledWith('session:1:session_token');
      expect(result).toEqual(mockSessionData);
    });

    it('should return null when session not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await AuthService.getSession(1, 'nonexistent_session');

      expect(mockRedis.get).toHaveBeenCalledWith('session:1:nonexistent_session');
      expect(result).toBeNull();
    });
  });

  describe('recordLoginAttempt', () => {
    it('should clear attempts on successful login', async () => {
      mockRedis.get.mockResolvedValue('3');
      mockRedis.del.mockResolvedValue(1);

      await AuthService.recordLoginAttempt('test@example.com', true, '192.168.1.1');

      expect(mockRedis.get).toHaveBeenCalledWith('login_attempts:test@example.com:192.168.1.1');
      expect(mockRedis.del).toHaveBeenCalledWith('login_attempts:test@example.com:192.168.1.1');
    });

    it('should increment attempts on failed login', async () => {
      mockRedis.get.mockResolvedValue('2');
      mockRedis.setEx.mockResolvedValue('OK');

      await AuthService.recordLoginAttempt('test@example.com', false, '192.168.1.1');

      expect(mockRedis.get).toHaveBeenCalledWith('login_attempts:test@example.com:192.168.1.1');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'login_attempts:test@example.com:192.168.1.1',
        900,
        '3'
      );
    });
  });

  describe('isAccountLocked', () => {
    it('should return true when account is locked', async () => {
      jest.spyOn(AuthService, 'getLoginAttempts').mockResolvedValue(5);

      const result = await AuthService.isAccountLocked('test@example.com', '192.168.1.1');

      expect(AuthService.getLoginAttempts).toHaveBeenCalledWith('test@example.com', '192.168.1.1');
      expect(result).toBe(true);
    });

    it('should return false when account is not locked', async () => {
      jest.spyOn(AuthService, 'getLoginAttempts').mockResolvedValue(3);

      const result = await AuthService.isAccountLocked('test@example.com', '192.168.1.1');

      expect(result).toBe(false);
    });
  });

  describe('getLoginAttempts', () => {
    it('should return login attempts count', async () => {
      mockRedis.get.mockResolvedValue('3');

      const result = await AuthService.getLoginAttempts('test@example.com', '192.168.1.1');

      expect(mockRedis.get).toHaveBeenCalledWith('login_attempts:test@example.com:192.168.1.1');
      expect(result).toBe(3);
    });

    it('should return 0 when no attempts recorded', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await AuthService.getLoginAttempts('test@example.com', '192.168.1.1');

      expect(result).toBe(0);
    });
  });

  describe('findPasswordReset', () => {
    it('should find valid password reset token', async () => {
      const mockReset = {
        id: 1,
        account_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date('2024-12-31'),
        is_used: 0
      };

      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([[mockReset]] as any);

      const result = await AuthService.findPasswordReset('reset_token');

      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('reset_token');
      expect(result).toEqual(mockReset);
    });

    it('should return null when token not found', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AuthService.findPasswordReset('invalid_token');

      expect(result).toBeNull();
    });
  });

  describe('usePasswordReset', () => {
    it('should mark password reset as used', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AuthService.usePasswordReset('reset_token');

      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('reset_token');
      expect(result).toBe(true);
    });

    it('should return false when token not found', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AuthService.usePasswordReset('invalid_token');

      expect(result).toBe(false);
    });
  });

  describe('createEmailVerification', () => {
    it('should create email verification token', async () => {
      const mockExpiresAt = new Date('2024-12-31T24:00:00Z');
      
      mockPasswordUtils.generateSecureToken.mockReturnValue('secure_token');
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockDateUtils.addHours.mockReturnValue(mockExpiresAt);
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AuthService.createEmailVerification(1);

      expect(mockPasswordUtils.generateSecureToken).toHaveBeenCalled();
      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('secure_token');
      expect(mockDateUtils.addHours).toHaveBeenCalledWith(expect.any(Date), 24);
      expect(result).toBe('secure_token');
    });
  });

  describe('findEmailVerification', () => {
    it('should find valid email verification token', async () => {
      const mockVerification = {
        id: 1,
        account_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date('2024-12-31'),
        is_used: 0
      };

      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([[mockVerification]] as any);

      const result = await AuthService.findEmailVerification('verification_token');

      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('verification_token');
      expect(result).toEqual(mockVerification);
    });

    it('should return null when token not found', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AuthService.findEmailVerification('invalid_token');

      expect(result).toBeNull();
    });
  });

  describe('useEmailVerification', () => {
    it('should mark email verification as used', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AuthService.useEmailVerification('verification_token');

      expect(mockPasswordUtils.hashToken).toHaveBeenCalledWith('verification_token');
      expect(result).toBe(true);
    });

    it('should return false when token not found', async () => {
      mockPasswordUtils.hashToken.mockReturnValue('hashed_token');
      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AuthService.useEmailVerification('invalid_token');

      expect(result).toBe(false);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const mockDecoded = { accountId: 1, email: 'test@example.com' };
      const mockTokenRecord = {
        id: 1,
        account_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date('2024-12-31'),
        is_revoked: false,
        device_info: 'device',
        ip_address: '192.168.1.1',
        created_at: new Date()
      };
      const mockAccountWithPermissions = {
        id: 1,
        email: 'test@example.com',
        first_name: undefined,
        last_name: undefined,
        phone: undefined,
        date_of_birth: undefined,
        gender: undefined,
        avatar_url: undefined,
        is_verified: true,
        is_active: true,
        last_login: undefined,
        created_at: new Date(),
        updated_at: new Date(),
        permissions: ['read_users'],
        roles: ['user']
      };
      const mockNewTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600
      };

      mockJwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      jest.spyOn(AuthService, 'findRefreshToken').mockResolvedValue(mockTokenRecord);
      mockAccountService.getAccountWithPermissions.mockResolvedValue(mockAccountWithPermissions);
      mockJwtUtils.generateTokens.mockReturnValue(mockNewTokens);
      jest.spyOn(AuthService, 'revokeRefreshToken').mockResolvedValue(true);
      jest.spyOn(AuthService, 'saveRefreshToken').mockResolvedValue();

      const result = await AuthService.refreshTokens('old_refresh_token');

      expect(result).toEqual(mockNewTokens);
    });

    it('should return null when refresh token is invalid', async () => {
      mockJwtUtils.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await AuthService.refreshTokens('invalid_token');

      expect(result).toBeNull();
    });

    it('should return null when token not found in database', async () => {
      const mockDecoded = { accountId: 1, email: 'test@example.com' };

      mockJwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      jest.spyOn(AuthService, 'findRefreshToken').mockResolvedValue(null);

      const result = await AuthService.refreshTokens('nonexistent_token');

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      jest.spyOn(AuthService, 'revokeRefreshToken').mockResolvedValue(true);

      const result = await AuthService.logout('refresh_token');

      expect(result).toBe(true);
    });

    it('should handle logout failure', async () => {
      jest.spyOn(AuthService, 'revokeRefreshToken').mockResolvedValue(false);

      const result = await AuthService.logout('invalid_token');

      expect(result).toBe(false);
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions successfully', async () => {
      jest.spyOn(AuthService, 'revokeAllRefreshTokens').mockResolvedValue();
      mockRedis.keys.mockResolvedValue(['session:1:token1', 'session:1:token2']);
      mockRedis.del.mockResolvedValue(2);

      await AuthService.logoutAll(1);

      expect(AuthService.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
      expect(mockRedis.keys).toHaveBeenCalledWith('session:1:*');
      expect(mockRedis.del).toHaveBeenCalledWith(['session:1:token1', 'session:1:token2']);
    });

    it('should handle no redis sessions', async () => {
      jest.spyOn(AuthService, 'revokeAllRefreshTokens').mockResolvedValue();
      mockRedis.keys.mockResolvedValue([]);

      await AuthService.logoutAll(1);

      expect(AuthService.revokeAllRefreshTokens).toHaveBeenCalledWith(1);
      expect(mockRedis.keys).toHaveBeenCalledWith('session:1:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await AuthService.deleteSession(1, 'session_token');

      expect(mockRedis.del).toHaveBeenCalledWith('session:1:session_token');
      expect(result).toBe(true);
    });

    it('should return false when session not found', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await AuthService.deleteSession(1, 'nonexistent_session');

      expect(result).toBe(false);
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await AuthService.extendSession(1, 'session_token', 7200);

      expect(mockRedis.expire).toHaveBeenCalledWith('session:1:session_token', 7200);
      expect(result).toBe(true);
    });

    it('should extend session with default expiry', async () => {
      mockRedis.expire.mockResolvedValue(1);

      await AuthService.extendSession(1, 'session_token');

      expect(mockRedis.expire).toHaveBeenCalledWith('session:1:session_token', 86400);
    });

    it('should return false when session not found', async () => {
      mockRedis.expire.mockResolvedValue(0);

      const result = await AuthService.extendSession(1, 'nonexistent_session');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should revoke all refresh tokens for account', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 3 }] as any);

      await AuthService.revokeAllRefreshTokens(1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET is_revoked = 1 WHERE account_id = ?',
        [1]
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 2 }] as any);

      await AuthService.cleanupExpiredTokens();

      expect(mockPool.execute).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
      );
    });
  });
});
