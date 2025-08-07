import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Mock express-rate-limit before imports
jest.mock('express-rate-limit');
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;

// Mock ResponseUtils
jest.mock('../../src/utils', () => ({
  ResponseUtils: {
    error: jest.fn((message: string) => ({ success: false, message }))
  }
}));

// Mock database config
jest.mock('../../src/config/database', () => ({
  redisClient: {
    zRemRangeByScore: jest.fn(),
    zCard: jest.fn(),
    zAdd: jest.fn(),
    expire: jest.fn()
  }
}));

import {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  apiLimiter,
  uploadLimiter,
  createCustomLimiter,
  AdvancedRateLimiter
} from '../../src/middleware/rateLimiter';
import { ResponseUtils } from '../../src/utils';

describe('Rate Limiter Middleware', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      body: {},
      user: undefined
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    // Mock rate limit middleware function
    const mockLimiterFunction = jest.fn((req, res, next) => next()) as any;
    mockRateLimit.mockReturnValue(mockLimiterFunction);
  });

  describe('Basic Rate Limiters', () => {
    it('should have all rate limiters defined as functions', () => {
      expect(typeof generalLimiter).toBe('function');
      expect(typeof loginLimiter).toBe('function');
      expect(typeof registerLimiter).toBe('function');
      expect(typeof passwordResetLimiter).toBe('function');
      expect(typeof emailVerificationLimiter).toBe('function');
      expect(typeof apiLimiter).toBe('function');
      expect(typeof uploadLimiter).toBe('function');
    });

    it('should call express rate limit for each limiter creation', () => {
      // Reset the mock before testing
      mockRateLimit.mockClear();
      
      // Import again to trigger limiter creation
      jest.resetModules();
      require('../../src/middleware/rateLimiter');
      
      // Should have been called 7 times (for each basic limiter)
      expect(mockRateLimit).toHaveBeenCalledTimes(7);
    });
  });

  describe('Custom Limiter', () => {
    it('should create custom limiter function', () => {
      const limiter = createCustomLimiter(30000, 10, 'Custom message');
      expect(typeof limiter).toBe('function');
    });

    it('should call ResponseUtils.error when creating custom limiter', () => {
      createCustomLimiter(30000, 10, 'Test message');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Test message');
    });

    it('should use default message when not provided', () => {
      createCustomLimiter(30000, 10);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Quá nhiều yêu cầu, vui lòng thử lại sau');
    });
  });

  describe('AdvancedRateLimiter', () => {
    let mockRedisClient: any;

    beforeEach(async () => {
      const { redisClient } = await import('../../src/config/database');
      mockRedisClient = redisClient;
    });

    describe('checkRateLimit', () => {
      it('should allow request when within rate limit', async () => {
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(3);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        await AdvancedRateLimiter.checkRateLimit(
          mockReq as Request,
          mockRes as Response,
          mockNext,
          'test-key',
          5,
          60000
        );

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should block request when rate limit exceeded', async () => {
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(6);

        await AdvancedRateLimiter.checkRateLimit(
          mockReq as Request,
          mockRes as Response,
          mockNext,
          'test-key',
          5,
          60000,
          'Custom error message'
        );

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Custom error message');
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should use default message when rate limit exceeded and no custom message provided', async () => {
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(6);

        await AdvancedRateLimiter.checkRateLimit(
          mockReq as Request,
          mockRes as Response,
          mockNext,
          'test-key',
          5,
          60000
        );

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Quá nhiều yêu cầu, vui lòng thử lại sau');
      });

      it('should continue on Redis error', async () => {
        mockRedisClient.zRemRangeByScore.mockRejectedValue(new Error('Redis error'));
        console.error = jest.fn();

        await AdvancedRateLimiter.checkRateLimit(
          mockReq as Request,
          mockRes as Response,
          mockNext,
          'test-key',
          5,
          60000
        );

        expect(console.error).toHaveBeenCalledWith('Rate limiting error:', expect.any(Error));
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('loginAttempts', () => {
      it('should create login attempts limiter with email and IP key', async () => {
        mockReq.body = { email: 'test@example.com' };
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(3);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.loginAttempts(5, 60000);
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
          'login_attempts:test@example.com:127.0.0.1',
          0,
          expect.any(Number)
        );
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle missing email in request body', async () => {
        mockReq.body = {};
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(3);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.loginAttempts();
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
          'login_attempts:undefined:127.0.0.1',
          0,
          expect.any(Number)
        );
      });
    });

    describe('emailRequests', () => {
      it('should create email requests limiter with email and IP key', async () => {
        mockReq.body = { email: 'test@example.com' };
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(2);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.emailRequests(3, 60000);
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
          'email_requests:test@example.com:127.0.0.1',
          0,
          expect.any(Number)
        );
        expect(mockNext).toHaveBeenCalled();
      });

      it('should use default parameters when not provided', async () => {
        mockReq.body = { email: 'test@example.com' };
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(2);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.emailRequests();
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('apiRequests', () => {
      it('should create API requests limiter with user ID and IP key', async () => {
        mockReq.user = { accountId: 123, email: 'test@example.com' };
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(100);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.apiRequests(1000, 60000);
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
          'api_requests:123:127.0.0.1',
          0,
          expect.any(Number)
        );
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle anonymous user (no user in request)', async () => {
        mockReq.user = undefined;
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(100);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.apiRequests();
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
          'api_requests:anonymous:127.0.0.1',
          0,
          expect.any(Number)
        );
      });

      it('should handle missing IP address', async () => {
        mockReq = {
          ip: undefined,
          connection: {},
          user: { accountId: 123, email: 'test@example.com' },
          body: {}
        };
        mockRedisClient.zRemRangeByScore.mockResolvedValue(1);
        mockRedisClient.zCard.mockResolvedValue(100);
        mockRedisClient.zAdd.mockResolvedValue(1);
        mockRedisClient.expire.mockResolvedValue(1);

        const limiter = AdvancedRateLimiter.apiRequests();
        await limiter(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
          'api_requests:123:unknown',
          0,
          expect.any(Number)
        );
      });
    });
  });

  describe('ResponseUtils Integration', () => {
    it('should use ResponseUtils.error for error responses', () => {
      // Clear previous calls
      (ResponseUtils.error as jest.Mock).mockClear();
      
      createCustomLimiter(30000, 10, 'Test message');
      
      expect(ResponseUtils.error).toHaveBeenCalledWith('Test message');
    });
  });
});
