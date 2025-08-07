import { Request, Response, NextFunction } from 'express';
import { ErrorMiddleware } from '../../src/middleware/errorHandler';
import { ResponseUtils } from '../../src/utils';

// Mock ResponseUtils
jest.mock('../../src/utils', () => ({
  ResponseUtils: {
    error: jest.fn((message: string, errors?: any) => ({
      success: false,
      message,
      errors
    }))
  }
}));

describe('ErrorMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      originalUrl: '/test/path'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
      on: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
    console.error = jest.fn(); // Mock console.error
  });

  describe('notFound', () => {
    it('should return 404 error with correct message', () => {
      ErrorMiddleware.notFound(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy đường dẫn /test/path');
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle MySQL ER_DUP_ENTRY error', () => {
      const error = { code: 'ER_DUP_ENTRY' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Dữ liệu đã tồn tại');
    });

    it('should handle MySQL ER_NO_REFERENCED_ROW_2 error', () => {
      const error = { code: 'ER_NO_REFERENCED_ROW_2' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Dữ liệu tham chiếu không tồn tại');
    });

    it('should handle MySQL ER_ROW_IS_REFERENCED_2 error', () => {
      const error = { code: 'ER_ROW_IS_REFERENCED_2' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không thể xóa dữ liệu đang được tham chiếu');
    });

    it('should handle MySQL ER_DATA_TOO_LONG error', () => {
      const error = { code: 'ER_DATA_TOO_LONG' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Dữ liệu quá dài');
    });

    it('should handle MySQL ER_BAD_NULL_ERROR error', () => {
      const error = { code: 'ER_BAD_NULL_ERROR' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Thiếu dữ liệu bắt buộc');
    });

    it('should handle database connection error', () => {
      const error = { code: 'ECONNREFUSED' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không thể kết nối cơ sở dữ liệu');
    });

    it('should handle JWT JsonWebTokenError', () => {
      const error = { name: 'JsonWebTokenError' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token không hợp lệ');
    });

    it('should handle JWT TokenExpiredError', () => {
      const error = { name: 'TokenExpiredError' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token đã hết hạn');
    });

    it('should handle ValidationError', () => {
      const error = { 
        name: 'ValidationError',
        details: ['Field is required']
      };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Dữ liệu đầu vào không hợp lệ', error.details);
    });

    it('should handle Multer LIMIT_FILE_SIZE error', () => {
      const error = { code: 'LIMIT_FILE_SIZE' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('File quá lớn');
    });

    it('should handle Multer LIMIT_FILE_COUNT error', () => {
      const error = { code: 'LIMIT_FILE_COUNT' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Quá nhiều file');
    });

    it('should handle Multer LIMIT_UNEXPECTED_FILE error', () => {
      const error = { code: 'LIMIT_UNEXPECTED_FILE' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Loại file không được hỗ trợ');
    });

    it('should handle rate limiting error', () => {
      const error = { status: 429 };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Quá nhiều yêu cầu, vui lòng thử lại sau');
    });

    it('should handle generic error with statusCode', () => {
      const error = { 
        statusCode: 403,
        message: 'Forbidden'
      };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Forbidden');
    });

    it('should handle generic error with status', () => {
      const error = { 
        status: 400,
        message: 'Bad Request'
      };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Bad Request');
    });

    it('should handle unknown error with default 500 status', () => {
      const error = { message: 'Unknown error' };

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi máy chủ nội bộ');
    });

    it('should handle error without message', () => {
      const error = {};

      ErrorMiddleware.globalErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi máy chủ nội bộ');
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = ErrorMiddleware.asyncHandler(mockFn);

      await wrappedFn(req as Request, res as Response, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch and pass errors to next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = ErrorMiddleware.asyncHandler(mockFn);

      await wrappedFn(req as Request, res as Response, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('validateContentType', () => {
    it('should pass for allowed content type', () => {
      req.headers = { 'content-type': 'application/json' };
      const middleware = ErrorMiddleware.validateContentType(['application/json']);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass for partially matching content type', () => {
      req.headers = { 'content-type': 'application/json; charset=utf-8' };
      const middleware = ErrorMiddleware.validateContentType(['application/json']);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject disallowed content type', () => {
      req.headers = { 'content-type': 'text/plain' };
      const middleware = ErrorMiddleware.validateContentType(['application/json']);

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(415);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Content-Type không được hỗ trợ');
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when content-type header is missing', () => {
      req.headers = {};
      const middleware = ErrorMiddleware.validateContentType(['application/json']);

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(415);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Content-Type không được hỗ trợ');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('handleTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should call next immediately', () => {
      const middleware = ErrorMiddleware.handleTimeout(5000);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return timeout error when timeout is reached', () => {
      const middleware = ErrorMiddleware.handleTimeout(5000);

      middleware(req as Request, res as Response, next);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(res.status).toHaveBeenCalledWith(408);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Yêu cầu hết thời gian chờ');
    });

    it('should not return timeout error if headers already sent', () => {
      res.headersSent = true;
      const middleware = ErrorMiddleware.handleTimeout(5000);

      middleware(req as Request, res as Response, next);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(res.status).not.toHaveBeenCalled();
    });

    it('should clear timeout when response finishes', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const middleware = ErrorMiddleware.handleTimeout(5000);

      middleware(req as Request, res as Response, next);

      // Simulate response finish
      const finishCallback = (res.on as jest.Mock).mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should use default timeout of 30000ms', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const middleware = ErrorMiddleware.handleTimeout();

      middleware(req as Request, res as Response, next);

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });
  });
});
