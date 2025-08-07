import { createMySQLConnection } from '../src/config/database';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  try {
    console.log('🔄 Bắt đầu thiết lập database...');
    
    // Tạo connection đến MySQL (không chỉ định database)
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Kết nối MySQL thành công');

    // Tạo database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'volcanion_auth'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Database đã được tạo');

    // Đóng connection cũ và tạo connection mới với database
    await connection.end();
    
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'volcanion_auth'
    });

    // Đọc và chạy schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log(`📄 Đọc schema từ: ${schemaPath}`);
    console.log(`📏 Kích thước file: ${schemaSql.length} ký tự`);
    
    // Debug: Xem một số dòng đầu
    const firstLines = schemaSql.split('\n').slice(0, 10);
    console.log('🔍 10 dòng đầu:', firstLines);

    // Tách các câu lệnh SQL
    const allStatements = schemaSql
      .replace(/\r\n/g, '\n')  // Chuẩn hóa line endings
      .replace(/\r/g, '\n')    // Xử lý các \r còn lại
      .split(';')
      .map(stmt => stmt.trim());
    console.log('📊 Tổng số statement (sau split):', allStatements.length);
    
    // Debug: xem các statements
    allStatements.forEach((stmt, i) => {
      if (stmt.length > 0) {
        console.log(`Statement ${i}: "${stmt.substring(0, 100)}..."`);
      }
    });
    
    const statements = allStatements
      .filter(stmt => {
        // Loại bỏ câu trống
        if (stmt.length === 0) {
          return false;
        }
        
        // Loại bỏ chỉ comment (bắt đầu với --)
        if (stmt.startsWith('--') && !stmt.includes('CREATE') && !stmt.includes('INSERT')) {
          return false;
        }
        
        // Loại bỏ CREATE DATABASE và USE
        const upperStmt = stmt.toUpperCase();
        if (upperStmt.includes('CREATE DATABASE') || upperStmt.includes('USE VOLCANION_AUTH')) {
          return false;
        }
        
        // Chỉ giữ CREATE TABLE và INSERT
        return upperStmt.includes('CREATE TABLE') || upperStmt.includes('INSERT INTO');
      });
      
    console.log('📋 Statements sau filter:', statements.length);
    statements.forEach((stmt, i) => {
      console.log(`  ${i + 1}. ${stmt.substring(0, 50)}...`);
    });

    console.log(`🔄 Thực thi ${statements.length} câu lệnh SQL...`);
    
    // Debug: in ra một vài statements đầu
    statements.slice(0, 3).forEach((stmt, i) => {
      console.log(`   ${i+1}: ${stmt.substring(0, 100)}...`);
    });

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await dbConnection.execute(statement);
        } catch (error: any) {
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate entry')) {
            console.warn(`⚠️  Lỗi khi thực thi: ${statement.substring(0, 50)}...`);
            console.warn(`   ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Schema database đã được tạo thành công');

    // Kiểm tra các bảng đã được tạo
    const [tables] = await dbConnection.execute('SHOW TABLES');
    console.log('📋 Các bảng đã được tạo:');
    (tables as any[]).forEach((table: any) => {
      console.log(`   - ${Object.values(table)[0]}`);
    });

    await dbConnection.end();
    console.log('🎉 Thiết lập database hoàn tất!');

  } catch (error) {
    console.error('❌ Lỗi thiết lập database:', error);
    process.exit(1);
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  require('dotenv').config();
  setupDatabase();
}

export default setupDatabase;
