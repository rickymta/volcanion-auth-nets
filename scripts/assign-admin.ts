import 'dotenv/config';
import { createMySQLConnection } from '../src/config/database';

async function assignAdminRole() {
  try {
    const connection = await createMySQLConnection();
    
    // Lấy admin account id
    const [adminAccount] = await connection.execute(
      'SELECT id FROM accounts WHERE email = ?',
      ['admin@example.com']
    ) as any;
    
    if (adminAccount.length === 0) {
      throw new Error('Admin account not found');
    }
    
    const adminAccountId = adminAccount[0].id;
    
    // Lấy tất cả role_permissions của admin role
    const [rolePermissions] = await connection.execute(`
      SELECT rp.id 
      FROM role_permissions rp 
      JOIN roles r ON rp.role_id = r.id 
      WHERE r.name = 'admin'
    `) as any;
    
    if (rolePermissions.length === 0) {
      throw new Error('Admin role permissions not found');
    }
    
    // Gán tất cả quyền admin cho account
    for (const rp of rolePermissions) {
      await connection.execute(
        'INSERT IGNORE INTO grant_permissions (account_id, role_permission_id) VALUES (?, ?)',
        [adminAccountId, rp.id]
      );
    }
    
    console.log(`✅ Đã gán ${rolePermissions.length} quyền admin cho account admin@example.com`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

assignAdminRole();
