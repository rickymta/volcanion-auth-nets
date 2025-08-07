import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { Role, Permission, RolePermission, GrantPermission } from '../types';

export class PermissionService {
  // Role Management
  static async createRole(name: string, description?: string): Promise<number> {
    const query = 'INSERT INTO roles (name, description) VALUES (?, ?)';
    const [result] = await pool.execute(query, [name, description || null]);
    return (result as any).insertId;
  }

  static async getAllRoles(): Promise<Role[]> {
    const query = 'SELECT * FROM roles WHERE is_active = 1 ORDER BY name';
    const [rows] = await pool.execute<RowDataPacket[]>(query);
    return rows as Role[];
  }

  static async getRoleById(id: number): Promise<Role | null> {
    const query = 'SELECT * FROM roles WHERE id = ? AND is_active = 1';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);
    return rows.length > 0 ? rows[0] as Role : null;
  }

  static async getRoleByName(name: string): Promise<Role | null> {
    const query = 'SELECT * FROM roles WHERE name = ? AND is_active = 1';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [name]);
    return rows.length > 0 ? rows[0] as Role : null;
  }

  static async updateRole(id: number, name?: string, description?: string): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, values);
    
    return (result as any).affectedRows > 0;
  }

  static async deleteRole(id: number): Promise<boolean> {
    const query = 'UPDATE roles SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return (result as any).affectedRows > 0;
  }

  // Permission Management
  static async createPermission(name: string, resource: string, action: string, description?: string): Promise<number> {
    const query = 'INSERT INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)';
    const [result] = await pool.execute(query, [name, description || null, resource, action]);
    return (result as any).insertId;
  }

  static async getAllPermissions(): Promise<Permission[]> {
    const query = 'SELECT * FROM permissions WHERE is_active = 1 ORDER BY resource, action, name';
    const [rows] = await pool.execute<RowDataPacket[]>(query);
    return rows as Permission[];
  }

  static async getPermissionById(id: number): Promise<Permission | null> {
    const query = 'SELECT * FROM permissions WHERE id = ? AND is_active = 1';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);
    return rows.length > 0 ? rows[0] as Permission : null;
  }

  static async getPermissionByName(name: string): Promise<Permission | null> {
    const query = 'SELECT * FROM permissions WHERE name = ? AND is_active = 1';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [name]);
    return rows.length > 0 ? rows[0] as Permission : null;
  }

  static async getPermissionsByResource(resource: string): Promise<Permission[]> {
    const query = 'SELECT * FROM permissions WHERE resource = ? AND is_active = 1 ORDER BY action, name';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [resource]);
    return rows as Permission[];
  }

  static async updatePermission(id: number, name?: string, description?: string, resource?: string, action?: string): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (resource !== undefined) {
      fields.push('resource = ?');
      values.push(resource);
    }
    if (action !== undefined) {
      fields.push('action = ?');
      values.push(action);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE permissions SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, values);
    
    return (result as any).affectedRows > 0;
  }

  static async deletePermission(id: number): Promise<boolean> {
    const query = 'UPDATE permissions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return (result as any).affectedRows > 0;
  }

  // Role-Permission Management
  static async assignPermissionToRole(roleId: number, permissionId: number): Promise<number | null> {
    try {
      const query = 'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)';
      const [result] = await pool.execute(query, [roleId, permissionId]);
      return (result as any).insertId;
    } catch (error: any) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  static async removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean> {
    const query = 'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?';
    const [result] = await pool.execute(query, [roleId, permissionId]);
    return (result as any).affectedRows > 0;
  }

  static async getRolePermissions(roleId: number): Promise<Permission[]> {
    const query = `
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.is_active = 1
      ORDER BY p.resource, p.action, p.name
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [roleId]);
    return rows as Permission[];
  }

  static async getPermissionRoles(permissionId: number): Promise<Role[]> {
    const query = `
      SELECT r.* FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      WHERE rp.permission_id = ? AND r.is_active = 1
      ORDER BY r.name
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [permissionId]);
    return rows as Role[];
  }

  // Grant Permission to Account
  static async grantPermissionToAccount(
    accountId: number, 
    rolePermissionId: number, 
    grantedBy: number,
    expiresAt?: Date
  ): Promise<number | null> {
    try {
      const query = `
        INSERT INTO grant_permissions (account_id, role_permission_id, granted_by, expires_at)
        VALUES (?, ?, ?, ?)
      `;
      const [result] = await pool.execute(query, [accountId, rolePermissionId, grantedBy, expiresAt || null]);
      return (result as any).insertId;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  static async revokePermissionFromAccount(accountId: number, rolePermissionId: number): Promise<boolean> {
    const query = 'UPDATE grant_permissions SET is_active = 0 WHERE account_id = ? AND role_permission_id = ?';
    const [result] = await pool.execute(query, [accountId, rolePermissionId]);
    return (result as any).affectedRows > 0;
  }

  static async getAccountPermissions(accountId: number): Promise<Permission[]> {
    const query = `
      SELECT DISTINCT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN grant_permissions gp ON rp.id = gp.role_permission_id
      WHERE gp.account_id = ? 
        AND gp.is_active = 1 
        AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
        AND p.is_active = 1
      ORDER BY p.resource, p.action, p.name
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [accountId]);
    return rows as Permission[];
  }

  static async getAccountRoles(accountId: number): Promise<Role[]> {
    const query = `
      SELECT DISTINCT r.* FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN grant_permissions gp ON rp.id = gp.role_permission_id
      WHERE gp.account_id = ? 
        AND gp.is_active = 1 
        AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
        AND r.is_active = 1
      ORDER BY r.name
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [accountId]);
    return rows as Role[];
  }

  // Permission Checking
  static async hasPermission(accountId: number, resource: string, action: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN grant_permissions gp ON rp.id = gp.role_permission_id
      WHERE gp.account_id = ? 
        AND p.resource = ? 
        AND p.action = ?
        AND gp.is_active = 1 
        AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
        AND p.is_active = 1
    `;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [accountId, resource, action]);
    return rows[0].count > 0;
  }

  static async hasPermissionByName(accountId: number, permissionName: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN grant_permissions gp ON rp.id = gp.role_permission_id
      WHERE gp.account_id = ? 
        AND p.name = ?
        AND gp.is_active = 1 
        AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
        AND p.is_active = 1
    `;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [accountId, permissionName]);
    return rows[0].count > 0;
  }

  static async hasRole(accountId: number, roleName: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN grant_permissions gp ON rp.id = gp.role_permission_id
      WHERE gp.account_id = ? 
        AND r.name = ?
        AND gp.is_active = 1 
        AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
        AND r.is_active = 1
    `;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [accountId, roleName]);
    return rows[0].count > 0;
  }

  // Utility Methods
  static async getRolePermissionId(roleId: number, permissionId: number): Promise<number | null> {
    const query = 'SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [roleId, permissionId]);
    return rows.length > 0 ? rows[0].id : null;
  }

  static async cleanupExpiredGrants(): Promise<void> {
    const query = 'UPDATE grant_permissions SET is_active = 0 WHERE expires_at IS NOT NULL AND expires_at < NOW()';
    await pool.execute(query);
  }

  // Bulk Operations
  static async grantRoleToAccount(accountId: number, roleId: number, grantedBy: number, expiresAt?: Date): Promise<boolean> {
    const rolePermissions = await this.getRolePermissions(roleId);
    
    for (const permission of rolePermissions) {
      const rolePermissionId = await this.getRolePermissionId(roleId, permission.id);
      if (rolePermissionId) {
        await this.grantPermissionToAccount(accountId, rolePermissionId, grantedBy, expiresAt);
      }
    }
    
    return true;
  }

  static async revokeRoleFromAccount(accountId: number, roleId: number): Promise<boolean> {
    const query = `
      UPDATE grant_permissions SET is_active = 0 
      WHERE account_id = ? 
        AND role_permission_id IN (
          SELECT id FROM role_permissions WHERE role_id = ?
        )
    `;
    
    const [result] = await pool.execute(query, [accountId, roleId]);
    return (result as any).affectedRows > 0;
  }
}
