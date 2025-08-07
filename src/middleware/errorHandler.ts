import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '../utils';

export class ErrorMiddleware {
  static notFound(req: Request, res: Response, next: NextFunction): void {
    res.status(404).json(ResponseUtils.error(`Không tìm thấy đường dẫn ${req.originalUrl}`));
  }

  static globalErrorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
    console.error('Global error:', error);

    // MySQL errors
    if (error.code) {
      switch (error.code) {
        case 'ER_DUP_ENTRY':
          res.status(409).json(ResponseUtils.error('Dữ liệu đã tồn tại'));
          return;
        case 'ER_NO_REFERENCED_ROW_2':
          res.status(400).json(ResponseUtils.error('Dữ liệu tham chiếu không tồn tại'));
          return;
        case 'ER_ROW_IS_REFERENCED_2':
          res.status(400).json(ResponseUtils.error('Không thể xóa dữ liệu đang được tham chiếu'));
          return;
        case 'ER_DATA_TOO_LONG':
          res.status(400).json(ResponseUtils.error('Dữ liệu quá dài'));
          return;
        case 'ER_BAD_NULL_ERROR':
          res.status(400).json(ResponseUtils.error('Thiếu dữ liệu bắt buộc'));
          return;
        case 'ECONNREFUSED':
          res.status(500).json(ResponseUtils.error('Không thể kết nối cơ sở dữ liệu'));
          return;
      }
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json(ResponseUtils.error('Token không hợp lệ'));
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json(ResponseUtils.error('Token đã hết hạn'));
      return;
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json(ResponseUtils.error('Dữ liệu đầu vào không hợp lệ', error.details));
      return;
    }

    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json(ResponseUtils.error('File quá lớn'));
      return;
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json(ResponseUtils.error('Quá nhiều file'));
      return;
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json(ResponseUtils.error('Loại file không được hỗ trợ'));
      return;
    }

    // Rate limiting errors
    if (error.status === 429) {
      res.status(429).json(ResponseUtils.error('Quá nhiều yêu cầu, vui lòng thử lại sau'));
      return;
    }

    // Default error response
    const statusCode = error.statusCode || error.status || 500;
    const message = statusCode === 500 ? 'Lỗi máy chủ nội bộ' : error.message || 'Có lỗi xảy ra';

    res.status(statusCode).json(ResponseUtils.error(message));
  }

  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static validateContentType(allowedTypes: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentType = req.headers['content-type'];
      
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        res.status(415).json(ResponseUtils.error('Content-Type không được hỗ trợ'));
        return;
      }
      
      next();
    };
  }

  static handleTimeout(timeoutMs: number = 30000) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          res.status(408).json(ResponseUtils.error('Yêu cầu hết thời gian chờ'));
        }
      }, timeoutMs);

      res.on('finish', () => {
        clearTimeout(timeout);
      });

      next();
    };
  }
}
