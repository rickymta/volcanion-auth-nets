import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ResponseUtils } from '../utils';

// General rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: ResponseUtils.error('Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiting
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: ResponseUtils.error('Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Registration rate limiting
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per hour
  message: ResponseUtils.error('Quá nhiều lần đăng ký từ IP này, vui lòng thử lại sau 1 giờ'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiting
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: ResponseUtils.error('Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Email verification rate limiting
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 email verification requests per hour
  message: ResponseUtils.error('Quá nhiều yêu cầu gửi email xác thực, vui lòng thử lại sau 1 giờ'),
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiting for authenticated users
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs for authenticated users
  message: ResponseUtils.error('Quá nhiều yêu cầu API, vui lòng thử lại sau'),
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 file uploads per hour
  message: ResponseUtils.error('Quá nhiều lần tải file, vui lòng thử lại sau 1 giờ'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom rate limiter for specific endpoints
export const createCustomLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: ResponseUtils.error(message || 'Quá nhiều yêu cầu, vui lòng thử lại sau'),
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Advanced rate limiting with Redis (for production)
export class AdvancedRateLimiter {
  static async checkRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    key: string,
    limit: number,
    windowMs: number,
    message?: string
  ): Promise<void> {
    try {
      const { redisClient } = await import('../config/database');
      
      const currentTime = Date.now();
      const windowStart = currentTime - windowMs;
      
      // Clean old entries
      await redisClient.zRemRangeByScore(key, 0, windowStart);
      
      // Count current requests
      const requestCount = await redisClient.zCard(key);
      
      if (requestCount >= limit) {
        res.status(429).json(ResponseUtils.error(message || 'Quá nhiều yêu cầu, vui lòng thử lại sau'));
        return;
      }
      
      // Add current request
      await redisClient.zAdd(key, [{ score: currentTime, value: `${currentTime}-${Math.random()}` }]);
      await redisClient.expire(key, Math.ceil(windowMs / 1000));
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on Redis error
    }
  }

  static loginAttempts(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const email = req.body.email;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `login_attempts:${email}:${ip}`;
      
      await this.checkRateLimit(req, res, next, key, maxAttempts, windowMs, 
        'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau');
    };
  }

  static emailRequests(maxRequests: number = 3, windowMs: number = 60 * 60 * 1000) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const email = req.body.email;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `email_requests:${email}:${ip}`;
      
      await this.checkRateLimit(req, res, next, key, maxRequests, windowMs,
        'Quá nhiều yêu cầu gửi email, vui lòng thử lại sau');
    };
  }

  static apiRequests(maxRequests: number = 1000, windowMs: number = 15 * 60 * 1000) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user?.accountId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `api_requests:${userId}:${ip}`;
      
      await this.checkRateLimit(req, res, next, key, maxRequests, windowMs,
        'Quá nhiều yêu cầu API, vui lòng thử lại sau');
    };
  }
}
