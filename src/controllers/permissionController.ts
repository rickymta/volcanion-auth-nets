import { Request, Response } from 'express';
import { ResponseUtils } from '../utils';
import { PermissionService } from '../services/permissionService';

export class PermissionController {
  // Role Management
  static async getAllRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await PermissionService.getAllRoles();
      res.json(ResponseUtils.success(roles, 'Lấy danh sách vai trò thành công'));
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy danh sách vai trò'));
    }
  }

  static async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.id);
      const role = await PermissionService.getRoleById(roleId);

      if (!role) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy vai trò'));
        return;
      }

      // Get permissions for this role
      const permissions = await PermissionService.getRolePermissions(roleId);

      res.json(ResponseUtils.success({
        ...role,
        permissions
      }, 'Lấy thông tin vai trò thành công'));
    } catch (error) {
      console.error('Get role by id error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy thông tin vai trò'));
    }
  }

  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      // Check if role name already exists
      const existingRole = await PermissionService.getRoleByName(name);
      if (existingRole) {
        res.status(409).json(ResponseUtils.error('Tên vai trò đã tồn tại'));
        return;
      }

      const roleId = await PermissionService.createRole(name, description);
      const role = await PermissionService.getRoleById(roleId);

      res.status(201).json(ResponseUtils.success(role, 'Tạo vai trò thành công'));
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi tạo vai trò'));
    }
  }

  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.id);
      const { name, description } = req.body;

      // Check if role exists
      const existingRole = await PermissionService.getRoleById(roleId);
      if (!existingRole) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy vai trò'));
        return;
      }

      // Check if new name already exists (if name is being changed)
      if (name && name !== existingRole.name) {
        const roleWithSameName = await PermissionService.getRoleByName(name);
        if (roleWithSameName) {
          res.status(409).json(ResponseUtils.error('Tên vai trò đã tồn tại'));
          return;
        }
      }

      const updated = await PermissionService.updateRole(roleId, name, description);
      if (!updated) {
        res.status(400).json(ResponseUtils.error('Không có thông tin nào được cập nhật'));
        return;
      }

      const role = await PermissionService.getRoleById(roleId);
      res.json(ResponseUtils.success(role, 'Cập nhật vai trò thành công'));
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi cập nhật vai trò'));
    }
  }

  static async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.id);

      const deleted = await PermissionService.deleteRole(roleId);
      if (!deleted) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy vai trò'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Xóa vai trò thành công'));
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi xóa vai trò'));
    }
  }

  // Permission Management
  static async getAllPermissions(req: Request, res: Response): Promise<void> {
    try {
      const permissions = await PermissionService.getAllPermissions();
      res.json(ResponseUtils.success(permissions, 'Lấy danh sách quyền hạn thành công'));
    } catch (error) {
      console.error('Get all permissions error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy danh sách quyền hạn'));
    }
  }

  static async getPermissionById(req: Request, res: Response): Promise<void> {
    try {
      const permissionId = parseInt(req.params.id);
      const permission = await PermissionService.getPermissionById(permissionId);

      if (!permission) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy quyền hạn'));
        return;
      }

      res.json(ResponseUtils.success(permission, 'Lấy thông tin quyền hạn thành công'));
    } catch (error) {
      console.error('Get permission by id error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy thông tin quyền hạn'));
    }
  }

  static async createPermission(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, resource, action } = req.body;

      // Check if permission name already exists
      const existingPermission = await PermissionService.getPermissionByName(name);
      if (existingPermission) {
        res.status(409).json(ResponseUtils.error('Tên quyền hạn đã tồn tại'));
        return;
      }

      const permissionId = await PermissionService.createPermission(name, resource, action, description);
      const permission = await PermissionService.getPermissionById(permissionId);

      res.status(201).json(ResponseUtils.success(permission, 'Tạo quyền hạn thành công'));
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi tạo quyền hạn'));
    }
  }

  static async updatePermission(req: Request, res: Response): Promise<void> {
    try {
      const permissionId = parseInt(req.params.id);
      const { name, description, resource, action } = req.body;

      const existingPermission = await PermissionService.getPermissionById(permissionId);
      if (!existingPermission) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy quyền hạn'));
        return;
      }

      // Check if new name already exists (if name is being changed)
      if (name && name !== existingPermission.name) {
        const permissionWithSameName = await PermissionService.getPermissionByName(name);
        if (permissionWithSameName) {
          res.status(409).json(ResponseUtils.error('Tên quyền hạn đã tồn tại'));
          return;
        }
      }

      const updated = await PermissionService.updatePermission(permissionId, name, description, resource, action);
      if (!updated) {
        res.status(400).json(ResponseUtils.error('Không có thông tin nào được cập nhật'));
        return;
      }

      const permission = await PermissionService.getPermissionById(permissionId);
      res.json(ResponseUtils.success(permission, 'Cập nhật quyền hạn thành công'));
    } catch (error) {
      console.error('Update permission error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi cập nhật quyền hạn'));
    }
  }

  static async deletePermission(req: Request, res: Response): Promise<void> {
    try {
      const permissionId = parseInt(req.params.id);

      const deleted = await PermissionService.deletePermission(permissionId);
      if (!deleted) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy quyền hạn'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Xóa quyền hạn thành công'));
    } catch (error) {
      console.error('Delete permission error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi xóa quyền hạn'));
    }
  }

  // Role-Permission Management
  static async assignPermissionToRole(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);

      const rolePermissionId = await PermissionService.assignPermissionToRole(roleId, permissionId);
      if (!rolePermissionId) {
        res.status(409).json(ResponseUtils.error('Quyền hạn đã được gán cho vai trò này'));
        return;
      }

      res.json(ResponseUtils.success({ rolePermissionId }, 'Gán quyền hạn cho vai trò thành công'));
    } catch (error) {
      console.error('Assign permission to role error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi gán quyền hạn cho vai trò'));
    }
  }

  static async removePermissionFromRole(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);

      const removed = await PermissionService.removePermissionFromRole(roleId, permissionId);
      if (!removed) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy quyền hạn trong vai trò'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Hủy quyền hạn khỏi vai trò thành công'));
    } catch (error) {
      console.error('Remove permission from role error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi hủy quyền hạn khỏi vai trò'));
    }
  }

  // Account Permission Management
  static async grantRoleToAccount(req: Request, res: Response): Promise<void> {
    try {
      const { account_id, role_id, expires_at } = req.body;
      const grantedBy = req.user!.accountId;

      const expiresAtDate = expires_at ? new Date(expires_at) : undefined;
      const success = await PermissionService.grantRoleToAccount(account_id, role_id, grantedBy, expiresAtDate);

      if (!success) {
        res.status(400).json(ResponseUtils.error('Lỗi gán vai trò cho tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Gán vai trò cho tài khoản thành công'));
    } catch (error) {
      console.error('Grant role to account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi gán vai trò cho tài khoản'));
    }
  }

  static async revokeRoleFromAccount(req: Request, res: Response): Promise<void> {
    try {
      const { account_id, role_id } = req.body;

      const revoked = await PermissionService.revokeRoleFromAccount(account_id, role_id);
      if (!revoked) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy vai trò trong tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Thu hồi vai trò khỏi tài khoản thành công'));
    } catch (error) {
      console.error('Revoke role from account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi thu hồi vai trò khỏi tài khoản'));
    }
  }

  static async grantPermissionToAccount(req: Request, res: Response): Promise<void> {
    try {
      const { account_id, role_permission_id, expires_at } = req.body;
      const grantedBy = req.user!.accountId;

      const expiresAtDate = expires_at ? new Date(expires_at) : undefined;
      const grantId = await PermissionService.grantPermissionToAccount(account_id, role_permission_id, grantedBy, expiresAtDate);

      if (!grantId) {
        res.status(409).json(ResponseUtils.error('Quyền hạn đã được gán cho tài khoản này'));
        return;
      }

      res.json(ResponseUtils.success({ grantId }, 'Gán quyền hạn cho tài khoản thành công'));
    } catch (error) {
      console.error('Grant permission to account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi gán quyền hạn cho tài khoản'));
    }
  }

  static async revokePermissionFromAccount(req: Request, res: Response): Promise<void> {
    try {
      const { account_id, role_permission_id } = req.body;

      const revoked = await PermissionService.revokePermissionFromAccount(account_id, role_permission_id);
      if (!revoked) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy quyền hạn trong tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Thu hồi quyền hạn khỏi tài khoản thành công'));
    } catch (error) {
      console.error('Revoke permission from account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi thu hồi quyền hạn khỏi tài khoản'));
    }
  }

  static async getAccountPermissions(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId);

      const permissions = await PermissionService.getAccountPermissions(accountId);
      const roles = await PermissionService.getAccountRoles(accountId);

      res.json(ResponseUtils.success({
        permissions,
        roles
      }, 'Lấy quyền hạn tài khoản thành công'));
    } catch (error) {
      console.error('Get account permissions error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy quyền hạn tài khoản'));
    }
  }

  static async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const { account_id, resource, action } = req.query;

      if (!account_id || !resource || !action) {
        res.status(400).json(ResponseUtils.error('Thiếu thông tin kiểm tra quyền hạn'));
        return;
      }

      const hasPermission = await PermissionService.hasPermission(
        parseInt(account_id as string),
        resource as string,
        action as string
      );

      res.json(ResponseUtils.success({ hasPermission }, 'Kiểm tra quyền hạn thành công'));
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi kiểm tra quyền hạn'));
    }
  }
}
