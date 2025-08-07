import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenPayload, JwtTokens } from '../types';

export class PasswordUtils {
  static async hash(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export class JwtUtils {
  static generateTokens(payload: TokenPayload): JwtTokens {
    const accessSecret = process.env.JWT_ACCESS_SECRET!;
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const accessTokenOptions: SignOptions = {
      expiresIn: accessExpiresIn as any,
      issuer: 'volcanion-auth',
      audience: 'volcanion-app'
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: refreshExpiresIn as any,
      issuer: 'volcanion-auth',
      audience: 'volcanion-app'
    };

    const accessToken = jwt.sign(payload, accessSecret, accessTokenOptions);

    const refreshToken = jwt.sign(
      { accountId: payload.accountId, email: payload.email },
      refreshSecret,
      refreshTokenOptions
    );

    // Calculate expiration time in seconds
    const expiresIn = this.getTokenExpirationTime(accessExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  static verifyAccessToken(token: string): TokenPayload {
    const secret = process.env.JWT_ACCESS_SECRET!;
    return jwt.verify(token, secret, {
      issuer: 'volcanion-auth',
      audience: 'volcanion-app'
    }) as TokenPayload;
  }

  static verifyRefreshToken(token: string): { accountId: number; email: string } {
    const secret = process.env.JWT_REFRESH_SECRET!;
    return jwt.verify(token, secret, {
      issuer: 'volcanion-auth',
      audience: 'volcanion-app'
    }) as { accountId: number; email: string };
  }

  private static getTokenExpirationTime(expiresIn: string): number {
    // Convert expiration time to seconds
    const match = expiresIn.match(/^(\d+)([mhd])$/);
    if (!match) return 15 * 60; // Default 15 minutes

    const [, value, unit] = match;
    const numValue = parseInt(value);

    switch (unit) {
      case 'm': return numValue * 60;
      case 'h': return numValue * 60 * 60;
      case 'd': return numValue * 24 * 60 * 60;
      default: return 15 * 60;
    }
  }
}

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password: string): boolean {
    // At least 8 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static isValidPhone(phone: string): boolean {
    // Vietnamese phone number format
    const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
    return phoneRegex.test(phone);
  }

  static sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
  }
}

export class DateUtils {
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86400000);
  }

  static isExpired(date: Date): boolean {
    return new Date() > date;
  }

  static formatDate(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
}

export class ResponseUtils {
  static success<T>(data: T, message: string = 'Success') {
    return {
      success: true,
      message,
      data
    };
  }

  static error(message: string, errors?: any[]) {
    return {
      success: false,
      message,
      errors
    };
  }

  static paginated<T>(data: T[], total: number, page: number, limit: number, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}
