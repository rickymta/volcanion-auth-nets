import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../src/middleware/auth';
import { JwtUtils, ResponseUtils } from '../../src/utils';
import { TokenPayload } from '../../src/types';

// Mock dependencies
jest.mock('../../src/utils', () => ({
  JwtUtils: {
    verifyAccessToken: jest.fn()
  },
  ResponseUtils: {
    error: jest.fn((message: string) => ({
      success: false,
      message
    }))
  }
}));

// Mock PermissionService
const mockPermissionService = {
  hasRole: jest.fn(),
  hasPermission: jest.fn(),
  hasPermissionByName: jest.fn()
};

jest.mock('../../src/services/permissionService', () => ({
  PermissionService: mockPermissionService
}));

describe('AuthMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  
  const mockUser: TokenPayload = {
    accountId: 1,
    email: 'test@example.com'
  };

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      user: undefined
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', () => {
      req.headers!.authorization = 'Bearer valid-token';
      (JwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockUser);

      AuthMiddleware.authenticate(req as Request, res as Response, next);

      expect(JwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toBe(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is missing', () => {
      AuthMiddleware.authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token không được cung cấp');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      req.headers!.authorization = 'Invalid token';

      AuthMiddleware.authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token không được cung cấp');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      req.headers!.authorization = 'Bearer invalid-token';
      (JwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      AuthMiddleware.authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token không hợp lệ hoặc đã hết hạn');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when unexpected error occurs', () => {
      // Mock an unexpected error by making the headers getter throw
      Object.defineProperty(req, 'headers', {
        get: () => {
          throw new Error('Unexpected error');
        }
      });

      AuthMiddleware.authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi xác thực');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optional', () => {
    it('should set user when valid token is provided', () => {
      req.headers!.authorization = 'Bearer valid-token';
      (JwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockUser);

      AuthMiddleware.optional(req as Request, res as Response, next);

      expect(req.user).toBe(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when no token is provided', () => {
      AuthMiddleware.optional(req as Request, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue with undefined user when invalid token is provided', () => {
      req.headers!.authorization = 'Bearer invalid-token';
      (JwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      AuthMiddleware.optional(req as Request, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue when unexpected error occurs', () => {
      // Mock an unexpected error
      Object.defineProperty(req, 'headers', {
        get: () => {
          throw new Error('Unexpected error');
        }
      });

      AuthMiddleware.optional(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireVerification', () => {
    it('should continue when user is authenticated', () => {
      req.user = mockUser;

      AuthMiddleware.requireVerification(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      AuthMiddleware.requireVerification(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Yêu cầu đăng nhập');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      req.user = mockUser;
    });

    it('should allow access when user has required role', async () => {
      mockPermissionService.hasRole.mockResolvedValue(true);
      const middleware = AuthMiddleware.requireRole('admin');

      await middleware(req as Request, res as Response, next);

      expect(mockPermissionService.hasRole).toHaveBeenCalledWith(1, 'admin');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', async () => {
      mockPermissionService.hasRole
        .mockResolvedValueOnce(false) // first role check fails
        .mockResolvedValueOnce(true); // second role check passes
      const middleware = AuthMiddleware.requireRole(['admin', 'manager']);

      await middleware(req as Request, res as Response, next);

      expect(mockPermissionService.hasRole).toHaveBeenCalledWith(1, 'admin');
      expect(mockPermissionService.hasRole).toHaveBeenCalledWith(1, 'manager');
      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user does not have required role', async () => {
      mockPermissionService.hasRole.mockResolvedValue(false);
      const middleware = AuthMiddleware.requireRole('admin');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không có quyền truy cập');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;
      const middleware = AuthMiddleware.requireRole('admin');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Yêu cầu đăng nhập');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when permission check fails', async () => {
      mockPermissionService.hasRole.mockRejectedValue(new Error('Database error'));
      const middleware = AuthMiddleware.requireRole('admin');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi kiểm tra quyền');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    beforeEach(() => {
      req.user = mockUser;
    });

    it('should allow access when user has required permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValue(true);
      const middleware = AuthMiddleware.requirePermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(1, 'accounts', 'read');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValue(false);
      const middleware = AuthMiddleware.requirePermission('accounts', 'write');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không có quyền thực hiện hành động này');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;
      const middleware = AuthMiddleware.requirePermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Yêu cầu đăng nhập');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when permission check fails', async () => {
      mockPermissionService.hasPermission.mockRejectedValue(new Error('Database error'));
      const middleware = AuthMiddleware.requirePermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi kiểm tra quyền');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermissionByName', () => {
    beforeEach(() => {
      req.user = mockUser;
    });

    it('should allow access when user has required permission by name', async () => {
      mockPermissionService.hasPermissionByName.mockResolvedValue(true);
      const middleware = AuthMiddleware.requirePermissionByName('user_management');

      await middleware(req as Request, res as Response, next);

      expect(mockPermissionService.hasPermissionByName).toHaveBeenCalledWith(1, 'user_management');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required permission by name', async () => {
      mockPermissionService.hasPermissionByName.mockResolvedValue(false);
      const middleware = AuthMiddleware.requirePermissionByName('admin_panel');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không có quyền thực hiện hành động này');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;
      const middleware = AuthMiddleware.requirePermissionByName('user_management');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Yêu cầu đăng nhập');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnershipOrPermission', () => {
    beforeEach(() => {
      req.user = mockUser;
    });

    it('should allow access when user is accessing their own resource by id', async () => {
      req.params!.id = '1';
      const middleware = AuthMiddleware.requireOwnershipOrPermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });

    it('should allow access when user is accessing their own resource by accountId', async () => {
      req.params!.accountId = '1';
      const middleware = AuthMiddleware.requireOwnershipOrPermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });

    it('should allow access when user has permission for other user resource', async () => {
      req.params!.id = '2';
      mockPermissionService.hasPermission.mockResolvedValue(true);
      const middleware = AuthMiddleware.requireOwnershipOrPermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(1, 'accounts', 'read');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user does not own resource and has no permission', async () => {
      req.params!.id = '2';
      mockPermissionService.hasPermission.mockResolvedValue(false);
      const middleware = AuthMiddleware.requireOwnershipOrPermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không có quyền truy cập tài nguyên này');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = undefined;
      const middleware = AuthMiddleware.requireOwnershipOrPermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Yêu cầu đăng nhập');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when permission check fails', async () => {
      req.params!.id = '2';
      mockPermissionService.hasPermission.mockRejectedValue(new Error('Database error'));
      const middleware = AuthMiddleware.requireOwnershipOrPermission('accounts', 'read');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi kiểm tra quyền');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
