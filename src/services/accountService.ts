import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { Account, RegisterDto, UpdateAccountDto, AccountWithPermissions } from '../types';
import { PasswordUtils } from '../utils';

export class AccountService {
  static async createAccount(data: RegisterDto): Promise<number> {
    const hashedPassword = await PasswordUtils.hash(data.password);
    
    const query = `
      INSERT INTO accounts (email, password, first_name, last_name, phone, date_of_birth, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      data.email,
      hashedPassword,
      data.first_name || null,
      data.last_name || null,
      data.phone || null,
      data.date_of_birth || null,
      data.gender || null
    ];

    const [result] = await pool.execute(query, values);
    return (result as any).insertId;
  }

  static async findByEmail(email: string): Promise<Account | null> {
    const query = 'SELECT * FROM accounts WHERE email = ? AND is_active = 1';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [email]);
    
    if (rows.length === 0) return null;
    return rows[0] as Account;
  }

  static async findById(id: number): Promise<Account | null> {
    const query = 'SELECT * FROM accounts WHERE id = ? AND is_active = 1';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);
    
    if (rows.length === 0) return null;
    return rows[0] as Account;
  }

  static async updateAccount(id: number, data: UpdateAccountDto): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.first_name !== undefined) {
      fields.push('first_name = ?');
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      fields.push('last_name = ?');
      values.push(data.last_name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.date_of_birth !== undefined) {
      fields.push('date_of_birth = ?');
      values.push(data.date_of_birth);
    }
    if (data.gender !== undefined) {
      fields.push('gender = ?');
      values.push(data.gender);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, values);
    
    return (result as any).affectedRows > 0;
  }

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await PasswordUtils.hash(newPassword);
    const query = 'UPDATE accounts SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(query, [hashedPassword, id]);
    
    return (result as any).affectedRows > 0;
  }

  static async updateLastLogin(id: number): Promise<void> {
    const query = 'UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async verifyAccount(id: number): Promise<boolean> {
    const query = 'UPDATE accounts SET is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
    return (result as any).affectedRows > 0;
  }

  static async updateAvatar(id: number, avatarUrl: string): Promise<boolean> {
    const query = 'UPDATE accounts SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(query, [avatarUrl, id]);
    
    return (result as any).affectedRows > 0;
  }

  static async getAccountWithPermissions(id: number): Promise<AccountWithPermissions | null> {
    const accountQuery = `
      SELECT id, email, first_name, last_name, phone, date_of_birth, gender, 
             avatar_url, is_verified, is_active, last_login, created_at, updated_at
      FROM accounts 
      WHERE id = ? AND is_active = 1
    `;
    
    const [accountRows] = await pool.execute<RowDataPacket[]>(accountQuery, [id]);
    if (accountRows.length === 0) return null;

    const account = accountRows[0] as Omit<Account, 'password'>;

    // Get permissions
    const permissionQuery = `
      SELECT DISTINCT p.name as permission_name, r.name as role_name
      FROM grant_permissions gp
      JOIN role_permissions rp ON gp.role_permission_id = rp.id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN roles r ON rp.role_id = r.id
      WHERE gp.account_id = ? 
        AND gp.is_active = 1 
        AND (gp.expires_at IS NULL OR gp.expires_at > NOW())
        AND p.is_active = 1
        AND r.is_active = 1
    `;

    const [permissionRows] = await pool.execute<RowDataPacket[]>(permissionQuery, [id]);
    
    const permissions = [...new Set(permissionRows.map(row => row.permission_name))];
    const roles = [...new Set(permissionRows.map(row => row.role_name))];

    return {
      ...account,
      permissions,
      roles
    };
  }

  static async getAllAccounts(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    
    const countQuery = 'SELECT COUNT(*) as total FROM accounts WHERE is_active = 1';
    const [countRows] = await pool.execute<RowDataPacket[]>(countQuery);
    const total = countRows[0].total;

    const query = `
      SELECT id, email, first_name, last_name, phone, date_of_birth, gender, 
             avatar_url, is_verified, is_active, last_login, created_at, updated_at
      FROM accounts 
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [limit, offset]);
    
    return {
      accounts: rows as Omit<Account, 'password'>[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async deactivateAccount(id: number): Promise<boolean> {
    const query = 'UPDATE accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
    return (result as any).affectedRows > 0;
  }

  static async emailExists(email: string, excludeId?: number): Promise<boolean> {
    let query = 'SELECT id FROM accounts WHERE email = ? AND is_active = 1';
    const params: any[] = [email];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.length > 0;
  }
}
