// Mock mysql2 pool
const mockExecute = jest.fn();
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: mockExecute
  }
}));

// Import PermissionService after mock
import { PermissionService } from '../../src/services/permissionService';
import { Role, Permission, RolePermission } from '../../src/types';

describe('PermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockClear();
  });

  describe('Role Management', () => {
    describe('createRole', () => {
      it('should create role successfully with description', async () => {
        mockExecute.mockResolvedValue([{ insertId: 1 }]);

        const result = await PermissionService.createRole('Admin', 'Administrator role');

        expect(result).toBe(1);
        expect(mockExecute).toHaveBeenCalledWith(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          ['Admin', 'Administrator role']
        );
      });

      it('should create role successfully without description', async () => {
        mockExecute.mockResolvedValue([{ insertId: 2 }]);

        const result = await PermissionService.createRole('User');

        expect(result).toBe(2);
        expect(mockExecute).toHaveBeenCalledWith(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          ['User', null]
        );
      });
    });

    describe('getAllRoles', () => {
      it('should get all active roles', async () => {
        const mockRoles = [
          { id: 1, name: 'Admin', description: 'Administrator role', is_active: 1 },
          { id: 2, name: 'User', description: 'User role', is_active: 1 }
        ];
        mockExecute.mockResolvedValue([mockRoles]);

        const result = await PermissionService.getAllRoles();

        expect(result).toEqual(mockRoles);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM roles WHERE is_active = 1 ORDER BY name'
        );
      });

      it('should return empty array when no roles exist', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getAllRoles();

        expect(result).toEqual([]);
      });
    });

    describe('getRoleById', () => {
      it('should get role by id successfully', async () => {
        const mockRole = { id: 1, name: 'Admin', description: 'Administrator role', is_active: 1 };
        mockExecute.mockResolvedValue([[mockRole]]);

        const result = await PermissionService.getRoleById(1);

        expect(result).toEqual(mockRole);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM roles WHERE id = ? AND is_active = 1',
          [1]
        );
      });

      it('should return null when role not found', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getRoleById(999);

        expect(result).toBeNull();
      });
    });

    describe('getRoleByName', () => {
      it('should get role by name successfully', async () => {
        const mockRole = { id: 1, name: 'Admin', description: 'Administrator role', is_active: 1 };
        mockExecute.mockResolvedValue([[mockRole]]);

        const result = await PermissionService.getRoleByName('Admin');

        expect(result).toEqual(mockRole);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM roles WHERE name = ? AND is_active = 1',
          ['Admin']
        );
      });

      it('should return null when role not found', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getRoleByName('NonExistent');

        expect(result).toBeNull();
      });
    });

    describe('updateRole', () => {
      it('should update role with name and description', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.updateRole(1, 'Super Admin', 'Super administrator role');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE roles SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['Super Admin', 'Super administrator role', 1]
        );
      });

      it('should update role with only name', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.updateRole(1, 'Super Admin');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE roles SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['Super Admin', 1]
        );
      });

      it('should update role with only description', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.updateRole(1, undefined, 'New description');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE roles SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['New description', 1]
        );
      });

      it('should return false when no fields to update', async () => {
        const result = await PermissionService.updateRole(1);

        expect(result).toBe(false);
        expect(mockExecute).not.toHaveBeenCalled();
      });

      it('should return false when update fails', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await PermissionService.updateRole(1, 'New Name');

        expect(result).toBe(false);
      });
    });

    describe('deleteRole', () => {
      it('should soft delete role successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.deleteRole(1);

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE roles SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [1]
        );
      });

      it('should return false when role not found', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await PermissionService.deleteRole(999);

        expect(result).toBe(false);
      });
    });
  });

  describe('Permission Management', () => {
    describe('createPermission', () => {
      it('should create permission successfully', async () => {
        mockExecute.mockResolvedValue([{ insertId: 1 }]);

        const result = await PermissionService.createPermission('read_users', 'users', 'read', 'Read users permission');

        expect(result).toBe(1);
        expect(mockExecute).toHaveBeenCalledWith(
          'INSERT INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)',
          ['read_users', 'Read users permission', 'users', 'read']
        );
      });

      it('should create permission without description', async () => {
        mockExecute.mockResolvedValue([{ insertId: 2 }]);

        const result = await PermissionService.createPermission('write_users', 'users', 'write');

        expect(result).toBe(2);
        expect(mockExecute).toHaveBeenCalledWith(
          'INSERT INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)',
          ['write_users', null, 'users', 'write']
        );
      });
    });

    describe('getAllPermissions', () => {
      it('should get all active permissions', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', description: 'Read users permission', resource: 'users', action: 'read', is_active: 1 },
          { id: 2, name: 'write_users', description: 'Write users permission', resource: 'users', action: 'write', is_active: 1 }
        ];
        mockExecute.mockResolvedValue([mockPermissions]);

        const result = await PermissionService.getAllPermissions();

        expect(result).toEqual(mockPermissions);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM permissions WHERE is_active = 1 ORDER BY resource, action, name'
        );
      });
    });

    describe('getPermissionById', () => {
      it('should get permission by id successfully', async () => {
        const mockPermission = { id: 1, name: 'read_users', description: 'Read users permission', resource: 'users', action: 'read', is_active: 1 };
        mockExecute.mockResolvedValue([[mockPermission]]);

        const result = await PermissionService.getPermissionById(1);

        expect(result).toEqual(mockPermission);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM permissions WHERE id = ? AND is_active = 1',
          [1]
        );
      });

      it('should return null when permission not found', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getPermissionById(999);

        expect(result).toBeNull();
      });
    });

    describe('getPermissionByName', () => {
      it('should get permission by name successfully', async () => {
        const mockPermission = { id: 1, name: 'read_users', description: 'Read users permission', resource: 'users', action: 'read', is_active: 1 };
        mockExecute.mockResolvedValue([[mockPermission]]);

        const result = await PermissionService.getPermissionByName('read_users');

        expect(result).toEqual(mockPermission);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM permissions WHERE name = ? AND is_active = 1',
          ['read_users']
        );
      });

      it('should return null when permission not found', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getPermissionByName('NonExistent');

        expect(result).toBeNull();
      });
    });

    describe('getPermissionsByResource', () => {
      it('should get permissions by resource successfully', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', description: 'Read users permission', resource: 'users', action: 'read', is_active: 1 },
          { id: 2, name: 'write_users', description: 'Write users permission', resource: 'users', action: 'write', is_active: 1 }
        ];
        mockExecute.mockResolvedValue([mockPermissions]);

        const result = await PermissionService.getPermissionsByResource('users');

        expect(result).toEqual(mockPermissions);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT * FROM permissions WHERE resource = ? AND is_active = 1 ORDER BY action, name',
          ['users']
        );
      });
    });

    describe('updatePermission', () => {
      it('should update permission successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.updatePermission(1, 'super_read_users', 'Super read users permission', 'super_users', 'super_read');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE permissions SET name = ?, description = ?, resource = ?, action = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['super_read_users', 'Super read users permission', 'super_users', 'super_read', 1]
        );
      });

      it('should return false when no fields to update', async () => {
        const result = await PermissionService.updatePermission(1);

        expect(result).toBe(false);
        expect(mockExecute).not.toHaveBeenCalled();
      });
    });

    describe('deletePermission', () => {
      it('should soft delete permission successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.deletePermission(1);

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE permissions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [1]
        );
      });

      it('should return false when permission not found', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await PermissionService.deletePermission(999);

        expect(result).toBe(false);
      });
    });
  });

  describe('Role-Permission Relationships', () => {
    describe('assignPermissionToRole', () => {
      it('should assign permission to role successfully', async () => {
        mockExecute.mockResolvedValue([{ insertId: 1 }]);

        const result = await PermissionService.assignPermissionToRole(1, 2);

        expect(result).toBe(1);
        expect(mockExecute).toHaveBeenCalledWith(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [1, 2]
        );
      });

      it('should handle duplicate entry', async () => {
        const error = new Error('Duplicate entry') as any;
        error.code = 'ER_DUP_ENTRY';
        mockExecute.mockRejectedValue(error);

        const result = await PermissionService.assignPermissionToRole(1, 2);

        expect(result).toBeNull();
      });

      it('should throw error for other database errors', async () => {
        const error = new Error('Database connection failed');
        mockExecute.mockRejectedValue(error);

        await expect(
          PermissionService.assignPermissionToRole(1, 2)
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('removePermissionFromRole', () => {
      it('should remove permission from role successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.removePermissionFromRole(1, 2);

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
          [1, 2]
        );
      });

      it('should return false when no relationship exists', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await PermissionService.removePermissionFromRole(1, 2);

        expect(result).toBe(false);
      });
    });

    describe('getRolePermissions', () => {
      it('should get all permissions for a role', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', description: 'Read users permission' },
          { id: 2, name: 'write_users', description: 'Write users permission' }
        ];
        mockExecute.mockResolvedValue([mockPermissions]);

        const result = await PermissionService.getRolePermissions(1);

        expect(result).toEqual(mockPermissions);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('JOIN role_permissions'),
          [1]
        );
      });

      it('should return empty array when role has no permissions', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getRolePermissions(1);

        expect(result).toEqual([]);
      });
    });

    describe('getPermissionRoles', () => {
      it('should get all roles for a permission', async () => {
        const mockRoles = [
          { id: 1, name: 'Admin', description: 'Administrator role' },
          { id: 2, name: 'User', description: 'User role' }
        ];
        mockExecute.mockResolvedValue([mockRoles]);

        const result = await PermissionService.getPermissionRoles(1);

        expect(result).toEqual(mockRoles);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('JOIN role_permissions'),
          [1]
        );
      });
    });
  });

  describe('Account Permission Management', () => {
    describe('grantPermissionToAccount', () => {
      it('should grant permission to account successfully', async () => {
        mockExecute.mockResolvedValue([{ insertId: 1 }]);

        const result = await PermissionService.grantPermissionToAccount(1, 2, 3);

        expect(result).toBe(1);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO grant_permissions'),
          [1, 2, 3, null]
        );
      });

      it('should grant permission with expiration date', async () => {
        mockExecute.mockResolvedValue([{ insertId: 1 }]);
        const expiresAt = new Date('2024-12-31');

        const result = await PermissionService.grantPermissionToAccount(1, 2, 3, expiresAt);

        expect(result).toBe(1);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO grant_permissions'),
          [1, 2, 3, expiresAt]
        );
      });

      it('should handle duplicate entry', async () => {
        const error = new Error('Duplicate entry') as any;
        error.code = 'ER_DUP_ENTRY';
        mockExecute.mockRejectedValue(error);

        const result = await PermissionService.grantPermissionToAccount(1, 2, 3);

        expect(result).toBeNull();
      });
    });

    describe('revokePermissionFromAccount', () => {
      it('should revoke permission from account successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await PermissionService.revokePermissionFromAccount(1, 2);

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE grant_permissions SET is_active = 0 WHERE account_id = ? AND role_permission_id = ?',
          [1, 2]
        );
      });

      it('should return false when no grant exists', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await PermissionService.revokePermissionFromAccount(1, 2);

        expect(result).toBe(false);
      });
    });

    describe('getAccountPermissions', () => {
      it('should get all permissions for an account', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', description: 'Read users permission' },
          { id: 2, name: 'write_users', description: 'Write users permission' }
        ];
        mockExecute.mockResolvedValue([mockPermissions]);

        const result = await PermissionService.getAccountPermissions(1);

        expect(result).toEqual(mockPermissions);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('DISTINCT p.*'),
          [1]
        );
      });
    });

    describe('getAccountRoles', () => {
      it('should get all roles for an account', async () => {
        const mockRoles = [
          { id: 1, name: 'Admin', description: 'Administrator role' },
          { id: 2, name: 'User', description: 'User role' }
        ];
        mockExecute.mockResolvedValue([mockRoles]);

        const result = await PermissionService.getAccountRoles(1);

        expect(result).toEqual(mockRoles);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('DISTINCT r.*'),
          [1]
        );
      });
    });
  });

  describe('Permission Checking', () => {
    describe('hasPermission', () => {
      it('should return true when account has permission', async () => {
        mockExecute.mockResolvedValue([[{ count: 1 }]]);

        const result = await PermissionService.hasPermission(1, 'users', 'read');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*)'),
          [1, 'users', 'read']
        );
      });

      it('should return false when account does not have permission', async () => {
        mockExecute.mockResolvedValue([[{ count: 0 }]]);

        const result = await PermissionService.hasPermission(1, 'users', 'write');

        expect(result).toBe(false);
      });
    });

    describe('hasPermissionByName', () => {
      it('should return true when account has permission by name', async () => {
        mockExecute.mockResolvedValue([[{ count: 1 }]]);

        const result = await PermissionService.hasPermissionByName(1, 'read_users');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*)'),
          [1, 'read_users']
        );
      });

      it('should return false when account does not have permission by name', async () => {
        mockExecute.mockResolvedValue([[{ count: 0 }]]);

        const result = await PermissionService.hasPermissionByName(1, 'write_users');

        expect(result).toBe(false);
      });
    });

    describe('hasRole', () => {
      it('should return true when account has role', async () => {
        mockExecute.mockResolvedValue([[{ count: 1 }]]);

        const result = await PermissionService.hasRole(1, 'Admin');

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*)'),
          [1, 'Admin']
        );
      });

      it('should return false when account does not have role', async () => {
        mockExecute.mockResolvedValue([[{ count: 0 }]]);

        const result = await PermissionService.hasRole(1, 'SuperAdmin');

        expect(result).toBe(false);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getRolePermissionId', () => {
      it('should get role permission id successfully', async () => {
        mockExecute.mockResolvedValue([[{ id: 5 }]]);

        const result = await PermissionService.getRolePermissionId(1, 2);

        expect(result).toBe(5);
        expect(mockExecute).toHaveBeenCalledWith(
          'SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
          [1, 2]
        );
      });

      it('should return null when relationship not found', async () => {
        mockExecute.mockResolvedValue([[]]);

        const result = await PermissionService.getRolePermissionId(1, 2);

        expect(result).toBeNull();
      });
    });

    describe('cleanupExpiredGrants', () => {
      it('should cleanup expired grants successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 5 }]);

        await PermissionService.cleanupExpiredGrants();

        expect(mockExecute).toHaveBeenCalledWith(
          'UPDATE grant_permissions SET is_active = 0 WHERE expires_at IS NOT NULL AND expires_at < NOW()'
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('grantRoleToAccount', () => {
      it('should grant role to account successfully', async () => {
        const mockPermissions = [
          { id: 1, name: 'read_users', description: 'Read users permission' },
          { id: 2, name: 'write_users', description: 'Write users permission' }
        ];
        
        // Mock getRolePermissions
        mockExecute
          .mockResolvedValueOnce([mockPermissions])  // getRolePermissions call
          .mockResolvedValueOnce([[{ id: 5 }]])      // getRolePermissionId call 1
          .mockResolvedValueOnce([{ insertId: 10 }])  // grantPermissionToAccount call 1
          .mockResolvedValueOnce([[{ id: 6 }]])      // getRolePermissionId call 2
          .mockResolvedValueOnce([{ insertId: 11 }]); // grantPermissionToAccount call 2

        const result = await PermissionService.grantRoleToAccount(1, 2, 3);

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledTimes(5);
      });
    });

    describe('revokeRoleFromAccount', () => {
      it('should revoke role from account successfully', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 2 }]);

        const result = await PermissionService.revokeRoleFromAccount(1, 2);

        expect(result).toBe(true);
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE grant_permissions SET is_active = 0'),
          [1, 2]
        );
      });

      it('should return false when no grants to revoke', async () => {
        mockExecute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await PermissionService.revokeRoleFromAccount(1, 2);

        expect(result).toBe(false);
      });
    });
  });
});
