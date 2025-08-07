import { Request, Response, NextFunction } from 'express';
import { JwtUtils, ResponseUtils } from '../utils';
import { TokenPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json(ResponseUtils.error('Token không được cung cấp'));
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        const decoded = JwtUtils.verifyAccessToken(token);
        req.user = decoded;
        next();
      } catch (jwtError) {
        res.status(401).json(ResponseUtils.error('Token không hợp lệ hoặc đã hết hạn'));
        return;
      }
    } catch (error) {
      res.status(500).json(ResponseUtils.error('Lỗi xác thực'));
      return;
    }
  }

  static optional(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const decoded = JwtUtils.verifyAccessToken(token);
          req.user = decoded;
        } catch (jwtError) {
          // Token invalid but this middleware is optional, so continue
          req.user = undefined;
        }
      }
      
      next();
    } catch (error) {
      next();
    }
  }

  static requireVerification(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json(ResponseUtils.error('Yêu cầu đăng nhập'));
      return;
    }

    // This would require checking user verification status from database
    // For now, we assume the token contains this information
    next();
  }

  static requireRole(roles: string | string[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json(ResponseUtils.error('Yêu cầu đăng nhập'));
        return;
      }

      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // This would require checking user roles from database
      // For now, we'll implement a basic check
      try {
        const { PermissionService } = await import('../services/permissionService');
        
        for (const role of requiredRoles) {
          const hasRole = await PermissionService.hasRole(req.user.accountId, role);
          if (hasRole) {
            next();
            return;
          }
        }
        
        res.status(403).json(ResponseUtils.error('Không có quyền truy cập'));
        return;
      } catch (error) {
        res.status(500).json(ResponseUtils.error('Lỗi kiểm tra quyền'));
        return;
      }
    };
  }

  static requirePermission(resource: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json(ResponseUtils.error('Yêu cầu đăng nhập'));
        return;
      }

      try {
        const { PermissionService } = await import('../services/permissionService');
        
        const hasPermission = await PermissionService.hasPermission(req.user.accountId, resource, action);
        
        if (!hasPermission) {
          res.status(403).json(ResponseUtils.error('Không có quyền thực hiện hành động này'));
          return;
        }
        
        next();
      } catch (error) {
        res.status(500).json(ResponseUtils.error('Lỗi kiểm tra quyền'));
        return;
      }
    };
  }

  static requirePermissionByName(permissionName: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json(ResponseUtils.error('Yêu cầu đăng nhập'));
        return;
      }

      try {
        const { PermissionService } = await import('../services/permissionService');
        
        const hasPermission = await PermissionService.hasPermissionByName(req.user.accountId, permissionName);
        
        if (!hasPermission) {
          res.status(403).json(ResponseUtils.error('Không có quyền thực hiện hành động này'));
          return;
        }
        
        next();
      } catch (error) {
        res.status(500).json(ResponseUtils.error('Lỗi kiểm tra quyền'));
        return;
      }
    };
  }

  static requireOwnershipOrPermission(resource: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json(ResponseUtils.error('Yêu cầu đăng nhập'));
        return;
      }

      try {
        // Check if user is accessing their own resource
        const resourceId = req.params.id || req.params.accountId;
        if (resourceId && parseInt(resourceId) === req.user.accountId) {
          next();
          return;
        }

        // Check if user has permission
        const { PermissionService } = await import('../services/permissionService');
        
        const hasPermission = await PermissionService.hasPermission(req.user.accountId, resource, action);
        
        if (!hasPermission) {
          res.status(403).json(ResponseUtils.error('Không có quyền truy cập tài nguyên này'));
          return;
        }
        
        next();
      } catch (error) {
        res.status(500).json(ResponseUtils.error('Lỗi kiểm tra quyền'));
        return;
      }
    };
  }
}
