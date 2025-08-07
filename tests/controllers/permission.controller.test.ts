import { Request, Response } from 'express';
import { PermissionController } from '../../src/controllers/permissionController';
import { PermissionService } from '../../src/services/permissionService';
import { ResponseUtils } from '../../src/utils';

// Mock the dependencies
jest.mock('../../src/services/permissionService');
jest.mock('../../src/utils');

describe('PermissionController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Role Management', () => {
    describe('getAllRoles', () => {
      it('should get all roles successfully', async () => {
        const mockRoles = [
          { id: 1, name: 'admin', description: 'Administrator' },
          { id: 2, name: 'user', description: 'Regular user' }
        ];

        (PermissionService.getAllRoles as jest.Mock).mockResolvedValue(mockRoles);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockRoles,
          message: 'Lấy danh sách vai trò thành công'
        });

        await PermissionController.getAllRoles(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getAllRoles).toHaveBeenCalled();
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockRoles, 'Lấy danh sách vai trò thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle errors when getting all roles', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getAllRoles as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi lấy danh sách vai trò'
        });

        await PermissionController.getAllRoles(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Get all roles error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy danh sách vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('getRoleById', () => {
      beforeEach(() => {
        mockRequest.params = { id: '1' };
      });

      it('should get role by id successfully', async () => {
        const mockRole = { id: 1, name: 'admin', description: 'Administrator' };
        const mockPermissions = [
          { id: 1, name: 'read_users', resource: 'user', action: 'read' }
        ];

        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(mockRole);
        (PermissionService.getRolePermissions as jest.Mock).mockResolvedValue(mockPermissions);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: { ...mockRole, permissions: mockPermissions },
          message: 'Lấy thông tin vai trò thành công'
        });

        await PermissionController.getRoleById(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleById).toHaveBeenCalledWith(1);
        expect(PermissionService.getRolePermissions).toHaveBeenCalledWith(1);
        expect(ResponseUtils.success).toHaveBeenCalledWith({
          ...mockRole,
          permissions: mockPermissions
        }, 'Lấy thông tin vai trò thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle role not found', async () => {
        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(null);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy vai trò'
        });

        await PermissionController.getRoleById(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleById).toHaveBeenCalledWith(1);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy vai trò');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when getting role by id', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getRoleById as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi lấy thông tin vai trò'
        });

        await PermissionController.getRoleById(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Get role by id error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy thông tin vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('createRole', () => {
      beforeEach(() => {
        mockRequest.body = {
          name: 'moderator',
          description: 'Moderator role'
        };
      });

      it('should create role successfully', async () => {
        const mockRoleId = 3;
        const mockCreatedRole = { id: 3, name: 'moderator', description: 'Moderator role' };

        (PermissionService.getRoleByName as jest.Mock).mockResolvedValue(null);
        (PermissionService.createRole as jest.Mock).mockResolvedValue(mockRoleId);
        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(mockCreatedRole);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockCreatedRole,
          message: 'Tạo vai trò thành công'
        });

        await PermissionController.createRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleByName).toHaveBeenCalledWith('moderator');
        expect(PermissionService.createRole).toHaveBeenCalledWith('moderator', 'Moderator role');
        expect(PermissionService.getRoleById).toHaveBeenCalledWith(mockRoleId);
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockCreatedRole, 'Tạo vai trò thành công');
        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle role name already exists', async () => {
        const mockExistingRole = { id: 1, name: 'moderator', description: 'Existing role' };

        (PermissionService.getRoleByName as jest.Mock).mockResolvedValue(mockExistingRole);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Tên vai trò đã tồn tại'
        });

        await PermissionController.createRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleByName).toHaveBeenCalledWith('moderator');
        expect(ResponseUtils.error).toHaveBeenCalledWith('Tên vai trò đã tồn tại');
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when creating role', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getRoleByName as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi tạo vai trò'
        });

        await PermissionController.createRole(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Create role error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi tạo vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('updateRole', () => {
      beforeEach(() => {
        mockRequest.params = { id: '1' };
        mockRequest.body = {
          name: 'updated-admin',
          description: 'Updated Administrator'
        };
      });

      it('should update role successfully', async () => {
        const mockExistingRole = { id: 1, name: 'admin', description: 'Administrator' };
        const mockUpdatedRole = { id: 1, name: 'updated-admin', description: 'Updated Administrator' };

        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(mockExistingRole);
        (PermissionService.getRoleByName as jest.Mock).mockResolvedValue(null);
        (PermissionService.updateRole as jest.Mock).mockResolvedValue(true);
        (PermissionService.getRoleById as jest.Mock).mockResolvedValueOnce(mockExistingRole).mockResolvedValueOnce(mockUpdatedRole);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockUpdatedRole,
          message: 'Cập nhật vai trò thành công'
        });

        await PermissionController.updateRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleById).toHaveBeenCalledWith(1);
        expect(PermissionService.getRoleByName).toHaveBeenCalledWith('updated-admin');
        expect(PermissionService.updateRole).toHaveBeenCalledWith(1, 'updated-admin', 'Updated Administrator');
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockUpdatedRole, 'Cập nhật vai trò thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle role not found', async () => {
        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(null);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy vai trò'
        });

        await PermissionController.updateRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleById).toHaveBeenCalledWith(1);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy vai trò');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle name already exists', async () => {
        const mockExistingRole = { id: 1, name: 'admin', description: 'Administrator' };
        const mockRoleWithSameName = { id: 2, name: 'updated-admin', description: 'Another role' };

        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(mockExistingRole);
        (PermissionService.getRoleByName as jest.Mock).mockResolvedValue(mockRoleWithSameName);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Tên vai trò đã tồn tại'
        });

        await PermissionController.updateRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getRoleByName).toHaveBeenCalledWith('updated-admin');
        expect(ResponseUtils.error).toHaveBeenCalledWith('Tên vai trò đã tồn tại');
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle no updates made', async () => {
        const mockExistingRole = { id: 1, name: 'admin', description: 'Administrator' };

        (PermissionService.getRoleById as jest.Mock).mockResolvedValue(mockExistingRole);
        (PermissionService.getRoleByName as jest.Mock).mockResolvedValue(null);
        (PermissionService.updateRole as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không có thông tin nào được cập nhật'
        });

        await PermissionController.updateRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.updateRole).toHaveBeenCalledWith(1, 'updated-admin', 'Updated Administrator');
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không có thông tin nào được cập nhật');
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when updating role', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getRoleById as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi cập nhật vai trò'
        });

        await PermissionController.updateRole(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Update role error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('deleteRole', () => {
      beforeEach(() => {
        mockRequest.params = { id: '1' };
      });

      it('should delete role successfully', async () => {
        (PermissionService.deleteRole as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Xóa vai trò thành công'
        });

        await PermissionController.deleteRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.deleteRole).toHaveBeenCalledWith(1);
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Xóa vai trò thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle role not found', async () => {
        (PermissionService.deleteRole as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy vai trò'
        });

        await PermissionController.deleteRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.deleteRole).toHaveBeenCalledWith(1);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy vai trò');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when deleting role', async () => {
        const mockError = new Error('Database error');
        (PermissionService.deleteRole as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi xóa vai trò'
        });

        await PermissionController.deleteRole(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Delete role error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi xóa vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });
  });

  describe('Permission Management', () => {
    describe('getAllPermissions', () => {
      it('should get all permissions successfully', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', resource: 'user', action: 'read' },
          { id: 2, name: 'write_users', resource: 'user', action: 'write' }
        ];

        (PermissionService.getAllPermissions as jest.Mock).mockResolvedValue(mockPermissions);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockPermissions,
          message: 'Lấy danh sách quyền hạn thành công'
        });

        await PermissionController.getAllPermissions(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getAllPermissions).toHaveBeenCalled();
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockPermissions, 'Lấy danh sách quyền hạn thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle errors when getting all permissions', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getAllPermissions as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi lấy danh sách quyền hạn'
        });

        await PermissionController.getAllPermissions(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Get all permissions error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy danh sách quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('getPermissionById', () => {
      beforeEach(() => {
        mockRequest.params = { id: '1' };
      });

      it('should get permission by id successfully', async () => {
        const mockPermission = { id: 1, name: 'read_users', resource: 'user', action: 'read' };

        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(mockPermission);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockPermission,
          message: 'Lấy thông tin quyền hạn thành công'
        });

        await PermissionController.getPermissionById(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionById).toHaveBeenCalledWith(1);
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockPermission, 'Lấy thông tin quyền hạn thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission not found', async () => {
        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(null);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy quyền hạn'
        });

        await PermissionController.getPermissionById(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionById).toHaveBeenCalledWith(1);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when getting permission by id', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getPermissionById as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi lấy thông tin quyền hạn'
        });

        await PermissionController.getPermissionById(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Get permission by id error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy thông tin quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('createPermission', () => {
      beforeEach(() => {
        mockRequest.body = {
          name: 'delete_users',
          description: 'Delete user permission',
          resource: 'user',
          action: 'delete'
        };
      });

      it('should create permission successfully', async () => {
        const mockPermissionId = 3;
        const mockCreatedPermission = { 
          id: 3, 
          name: 'delete_users', 
          description: 'Delete user permission',
          resource: 'user',
          action: 'delete'
        };

        (PermissionService.getPermissionByName as jest.Mock).mockResolvedValue(null);
        (PermissionService.createPermission as jest.Mock).mockResolvedValue(mockPermissionId);
        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(mockCreatedPermission);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockCreatedPermission,
          message: 'Tạo quyền hạn thành công'
        });

        await PermissionController.createPermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionByName).toHaveBeenCalledWith('delete_users');
        expect(PermissionService.createPermission).toHaveBeenCalledWith('delete_users', 'user', 'delete', 'Delete user permission');
        expect(PermissionService.getPermissionById).toHaveBeenCalledWith(mockPermissionId);
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockCreatedPermission, 'Tạo quyền hạn thành công');
        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle permission name already exists', async () => {
        const mockExistingPermission = { id: 1, name: 'delete_users', resource: 'user', action: 'delete' };

        (PermissionService.getPermissionByName as jest.Mock).mockResolvedValue(mockExistingPermission);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Tên quyền hạn đã tồn tại'
        });

        await PermissionController.createPermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionByName).toHaveBeenCalledWith('delete_users');
        expect(ResponseUtils.error).toHaveBeenCalledWith('Tên quyền hạn đã tồn tại');
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when creating permission', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getPermissionByName as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi tạo quyền hạn'
        });

        await PermissionController.createPermission(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Create permission error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi tạo quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('updatePermission', () => {
      beforeEach(() => {
        mockRequest.params = { id: '1' };
        mockRequest.body = {
          name: 'updated_permission',
          description: 'Updated permission',
          resource: 'user',
          action: 'update'
        };
      });

      it('should update permission successfully', async () => {
        const mockExistingPermission = { id: 1, name: 'read_users', resource: 'user', action: 'read' };
        const mockUpdatedPermission = { id: 1, name: 'updated_permission', resource: 'user', action: 'update' };

        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(mockExistingPermission);
        (PermissionService.getPermissionByName as jest.Mock).mockResolvedValue(null);
        (PermissionService.updatePermission as jest.Mock).mockResolvedValue(true);
        (PermissionService.getPermissionById as jest.Mock).mockResolvedValueOnce(mockExistingPermission).mockResolvedValueOnce(mockUpdatedPermission);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: mockUpdatedPermission,
          message: 'Cập nhật quyền hạn thành công'
        });

        await PermissionController.updatePermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionById).toHaveBeenCalledWith(1);
        expect(PermissionService.getPermissionByName).toHaveBeenCalledWith('updated_permission');
        expect(PermissionService.updatePermission).toHaveBeenCalledWith(1, 'updated_permission', 'Updated permission', 'user', 'update');
        expect(ResponseUtils.success).toHaveBeenCalledWith(mockUpdatedPermission, 'Cập nhật quyền hạn thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission not found', async () => {
        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(null);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy quyền hạn'
        });

        await PermissionController.updatePermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionById).toHaveBeenCalledWith(1);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle permission name already exists', async () => {
        const mockExistingPermission = { id: 1, name: 'read_users', resource: 'user', action: 'read' };
        const mockPermissionWithSameName = { id: 2, name: 'updated_permission', resource: 'user', action: 'update' };

        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(mockExistingPermission);
        (PermissionService.getPermissionByName as jest.Mock).mockResolvedValue(mockPermissionWithSameName);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Tên quyền hạn đã tồn tại'
        });

        await PermissionController.updatePermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getPermissionByName).toHaveBeenCalledWith('updated_permission');
        expect(ResponseUtils.error).toHaveBeenCalledWith('Tên quyền hạn đã tồn tại');
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle no updates made', async () => {
        const mockExistingPermission = { id: 1, name: 'read_users', resource: 'user', action: 'read' };

        (PermissionService.getPermissionById as jest.Mock).mockResolvedValue(mockExistingPermission);
        (PermissionService.getPermissionByName as jest.Mock).mockResolvedValue(null);
        (PermissionService.updatePermission as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không có thông tin nào được cập nhật'
        });

        await PermissionController.updatePermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.updatePermission).toHaveBeenCalledWith(1, 'updated_permission', 'Updated permission', 'user', 'update');
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không có thông tin nào được cập nhật');
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when updating permission', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getPermissionById as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi cập nhật quyền hạn'
        });

        await PermissionController.updatePermission(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Update permission error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('deletePermission', () => {
      beforeEach(() => {
        mockRequest.params = { id: '1' };
      });

      it('should delete permission successfully', async () => {
        (PermissionService.deletePermission as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Xóa quyền hạn thành công'
        });

        await PermissionController.deletePermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.deletePermission).toHaveBeenCalledWith(1);
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Xóa quyền hạn thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission not found', async () => {
        (PermissionService.deletePermission as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy quyền hạn'
        });

        await PermissionController.deletePermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.deletePermission).toHaveBeenCalledWith(1);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when deleting permission', async () => {
        const mockError = new Error('Database error');
        (PermissionService.deletePermission as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi xóa quyền hạn'
        });

        await PermissionController.deletePermission(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Delete permission error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi xóa quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });
  });

  describe('Role-Permission Management', () => {
    describe('assignPermissionToRole', () => {
      beforeEach(() => {
        mockRequest.params = { roleId: '1', permissionId: '2' };
      });

      it('should assign permission to role successfully', async () => {
        const mockRolePermissionId = 5;

        (PermissionService.assignPermissionToRole as jest.Mock).mockResolvedValue(mockRolePermissionId);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: { rolePermissionId: mockRolePermissionId },
          message: 'Gán quyền hạn cho vai trò thành công'
        });

        await PermissionController.assignPermissionToRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.assignPermissionToRole).toHaveBeenCalledWith(1, 2);
        expect(ResponseUtils.success).toHaveBeenCalledWith({ rolePermissionId: mockRolePermissionId }, 'Gán quyền hạn cho vai trò thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission already assigned to role', async () => {
        (PermissionService.assignPermissionToRole as jest.Mock).mockResolvedValue(null);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Quyền hạn đã được gán cho vai trò này'
        });

        await PermissionController.assignPermissionToRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.assignPermissionToRole).toHaveBeenCalledWith(1, 2);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Quyền hạn đã được gán cho vai trò này');
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when assigning permission to role', async () => {
        const mockError = new Error('Database error');
        (PermissionService.assignPermissionToRole as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi gán quyền hạn cho vai trò'
        });

        await PermissionController.assignPermissionToRole(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Assign permission to role error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi gán quyền hạn cho vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('removePermissionFromRole', () => {
      beforeEach(() => {
        mockRequest.params = { roleId: '1', permissionId: '2' };
      });

      it('should remove permission from role successfully', async () => {
        (PermissionService.removePermissionFromRole as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Hủy quyền hạn khỏi vai trò thành công'
        });

        await PermissionController.removePermissionFromRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.removePermissionFromRole).toHaveBeenCalledWith(1, 2);
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Hủy quyền hạn khỏi vai trò thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission not found in role', async () => {
        (PermissionService.removePermissionFromRole as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy quyền hạn trong vai trò'
        });

        await PermissionController.removePermissionFromRole(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.removePermissionFromRole).toHaveBeenCalledWith(1, 2);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy quyền hạn trong vai trò');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when removing permission from role', async () => {
        const mockError = new Error('Database error');
        (PermissionService.removePermissionFromRole as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi hủy quyền hạn khỏi vai trò'
        });

        await PermissionController.removePermissionFromRole(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Remove permission from role error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi hủy quyền hạn khỏi vai trò');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });
  });

  describe('Account Permission Management', () => {
    describe('grantRoleToAccount', () => {
      beforeEach(() => {
        mockRequest.body = {
          account_id: 1,
          role_id: 2,
          expires_at: '2024-12-31T23:59:59Z'
        };
        mockRequest.user = { accountId: 3, email: 'test@example.com' };
      });

      it('should grant role to account successfully', async () => {
        (PermissionService.grantRoleToAccount as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Gán vai trò cho tài khoản thành công'
        });

        await PermissionController.grantRoleToAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.grantRoleToAccount).toHaveBeenCalledWith(1, 2, 3, new Date('2024-12-31T23:59:59Z'));
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Gán vai trò cho tài khoản thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should grant role to account without expiration', async () => {
        mockRequest.body = {
          account_id: 1,
          role_id: 2
        };

        (PermissionService.grantRoleToAccount as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Gán vai trò cho tài khoản thành công'
        });

        await PermissionController.grantRoleToAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.grantRoleToAccount).toHaveBeenCalledWith(1, 2, 3, undefined);
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Gán vai trò cho tài khoản thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle grant role failure', async () => {
        (PermissionService.grantRoleToAccount as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi gán vai trò cho tài khoản'
        });

        await PermissionController.grantRoleToAccount(mockRequest as Request, mockResponse as Response);

        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi gán vai trò cho tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when granting role to account', async () => {
        const mockError = new Error('Database error');
        (PermissionService.grantRoleToAccount as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi gán vai trò cho tài khoản'
        });

        await PermissionController.grantRoleToAccount(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Grant role to account error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi gán vai trò cho tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('revokeRoleFromAccount', () => {
      beforeEach(() => {
        mockRequest.body = {
          account_id: 1,
          role_id: 2
        };
      });

      it('should revoke role from account successfully', async () => {
        (PermissionService.revokeRoleFromAccount as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Thu hồi vai trò khỏi tài khoản thành công'
        });

        await PermissionController.revokeRoleFromAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.revokeRoleFromAccount).toHaveBeenCalledWith(1, 2);
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Thu hồi vai trò khỏi tài khoản thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle role not found in account', async () => {
        (PermissionService.revokeRoleFromAccount as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy vai trò trong tài khoản'
        });

        await PermissionController.revokeRoleFromAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.revokeRoleFromAccount).toHaveBeenCalledWith(1, 2);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy vai trò trong tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when revoking role from account', async () => {
        const mockError = new Error('Database error');
        (PermissionService.revokeRoleFromAccount as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi thu hồi vai trò khỏi tài khoản'
        });

        await PermissionController.revokeRoleFromAccount(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Revoke role from account error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi thu hồi vai trò khỏi tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('grantPermissionToAccount', () => {
      beforeEach(() => {
        mockRequest.body = {
          account_id: 1,
          role_permission_id: 5,
          expires_at: '2024-12-31T23:59:59Z'
        };
        mockRequest.user = { accountId: 3, email: 'test@example.com' };
      });

      it('should grant permission to account successfully', async () => {
        const mockGrantId = 10;

        (PermissionService.grantPermissionToAccount as jest.Mock).mockResolvedValue(mockGrantId);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: { grantId: mockGrantId },
          message: 'Gán quyền hạn cho tài khoản thành công'
        });

        await PermissionController.grantPermissionToAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.grantPermissionToAccount).toHaveBeenCalledWith(1, 5, 3, new Date('2024-12-31T23:59:59Z'));
        expect(ResponseUtils.success).toHaveBeenCalledWith({ grantId: mockGrantId }, 'Gán quyền hạn cho tài khoản thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission already granted to account', async () => {
        (PermissionService.grantPermissionToAccount as jest.Mock).mockResolvedValue(null);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Quyền hạn đã được gán cho tài khoản này'
        });

        await PermissionController.grantPermissionToAccount(mockRequest as Request, mockResponse as Response);

        expect(ResponseUtils.error).toHaveBeenCalledWith('Quyền hạn đã được gán cho tài khoản này');
        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when granting permission to account', async () => {
        const mockError = new Error('Database error');
        (PermissionService.grantPermissionToAccount as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi gán quyền hạn cho tài khoản'
        });

        await PermissionController.grantPermissionToAccount(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Grant permission to account error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi gán quyền hạn cho tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('revokePermissionFromAccount', () => {
      beforeEach(() => {
        mockRequest.body = {
          account_id: 1,
          role_permission_id: 5
        };
      });

      it('should revoke permission from account successfully', async () => {
        (PermissionService.revokePermissionFromAccount as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: null,
          message: 'Thu hồi quyền hạn khỏi tài khoản thành công'
        });

        await PermissionController.revokePermissionFromAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.revokePermissionFromAccount).toHaveBeenCalledWith(1, 5);
        expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Thu hồi quyền hạn khỏi tài khoản thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle permission not found in account', async () => {
        (PermissionService.revokePermissionFromAccount as jest.Mock).mockResolvedValue(false);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Không tìm thấy quyền hạn trong tài khoản'
        });

        await PermissionController.revokePermissionFromAccount(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.revokePermissionFromAccount).toHaveBeenCalledWith(1, 5);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy quyền hạn trong tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when revoking permission from account', async () => {
        const mockError = new Error('Database error');
        (PermissionService.revokePermissionFromAccount as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi thu hồi quyền hạn khỏi tài khoản'
        });

        await PermissionController.revokePermissionFromAccount(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Revoke permission from account error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi thu hồi quyền hạn khỏi tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('getAccountPermissions', () => {
      beforeEach(() => {
        mockRequest.params = { accountId: '1' };
      });

      it('should get account permissions successfully', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', resource: 'user', action: 'read' }
        ];
        const mockRoles = [
          { id: 1, name: 'admin', description: 'Administrator' }
        ];

        (PermissionService.getAccountPermissions as jest.Mock).mockResolvedValue(mockPermissions);
        (PermissionService.getAccountRoles as jest.Mock).mockResolvedValue(mockRoles);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: { permissions: mockPermissions, roles: mockRoles },
          message: 'Lấy quyền hạn tài khoản thành công'
        });

        await PermissionController.getAccountPermissions(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.getAccountPermissions).toHaveBeenCalledWith(1);
        expect(PermissionService.getAccountRoles).toHaveBeenCalledWith(1);
        expect(ResponseUtils.success).toHaveBeenCalledWith({
          permissions: mockPermissions,
          roles: mockRoles
        }, 'Lấy quyền hạn tài khoản thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle errors when getting account permissions', async () => {
        const mockError = new Error('Database error');
        (PermissionService.getAccountPermissions as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi lấy quyền hạn tài khoản'
        });

        await PermissionController.getAccountPermissions(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Get account permissions error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy quyền hạn tài khoản');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });

    describe('checkPermission', () => {
      beforeEach(() => {
        mockRequest.query = {
          account_id: '1',
          resource: 'user',
          action: 'read'
        };
      });

      it('should check permission successfully', async () => {
        (PermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
        (ResponseUtils.success as jest.Mock).mockReturnValue({
          success: true,
          data: { hasPermission: true },
          message: 'Kiểm tra quyền hạn thành công'
        });

        await PermissionController.checkPermission(mockRequest as Request, mockResponse as Response);

        expect(PermissionService.hasPermission).toHaveBeenCalledWith(1, 'user', 'read');
        expect(ResponseUtils.success).toHaveBeenCalledWith({ hasPermission: true }, 'Kiểm tra quyền hạn thành công');
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle missing query parameters', async () => {
        mockRequest.query = { account_id: '1' }; // Missing resource and action

        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Thiếu thông tin kiểm tra quyền hạn'
        });

        await PermissionController.checkPermission(mockRequest as Request, mockResponse as Response);

        expect(ResponseUtils.error).toHaveBeenCalledWith('Thiếu thông tin kiểm tra quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalled();
      });

      it('should handle errors when checking permission', async () => {
        const mockError = new Error('Database error');
        (PermissionService.hasPermission as jest.Mock).mockRejectedValue(mockError);
        (ResponseUtils.error as jest.Mock).mockReturnValue({
          success: false,
          message: 'Lỗi kiểm tra quyền hạn'
        });

        await PermissionController.checkPermission(mockRequest as Request, mockResponse as Response);

        expect(console.error).toHaveBeenCalledWith('Check permission error:', mockError);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi kiểm tra quyền hạn');
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalled();
      });
    });
  });
});
