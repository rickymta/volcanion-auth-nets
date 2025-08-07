-- Tạo database (đã được tạo bởi setup script)
-- CREATE DATABASE IF NOT EXISTS volcanion_auth;
-- Sử dụng database (connection đã được thiết lập với database)

-- Bảng Accounts (người dùng)
CREATE TABLE accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_active (is_active),
    INDEX idx_verified (is_verified)
);

-- Bảng Roles (vai trò)
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (is_active)
);

-- Bảng Permissions (quyền hạn)
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_resource (resource),
    INDEX idx_action (action),
    INDEX idx_active (is_active)
);

-- Bảng RolePermissions (quan hệ nhiều-nhiều giữa roles và permissions)
CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
);

-- Bảng GrantPermissions (gán quyền cho từng account)
CREATE TABLE grant_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    role_permission_id INT NOT NULL,
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (role_permission_id) REFERENCES role_permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES accounts(id) ON DELETE SET NULL,
    UNIQUE KEY unique_account_role_permission (account_id, role_permission_id),
    INDEX idx_account_id (account_id),
    INDEX idx_role_permission_id (role_permission_id),
    INDEX idx_granted_by (granted_by),
    INDEX idx_active (is_active),
    INDEX idx_expires_at (expires_at)
);

-- Bảng RefreshTokens (lưu trữ refresh tokens)
CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    device_info TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_revoked (is_revoked)
);

-- Bảng PasswordResets (reset mật khẩu)
CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_used (is_used)
);

-- Bảng EmailVerifications (xác thực email)
CREATE TABLE email_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_used (is_used)
);

-- Insert dữ liệu mẫu cho Roles
INSERT INTO roles (name, description) VALUES
('admin', 'Quản trị viên hệ thống'),
('manager', 'Quản lý'),
('user', 'Người dùng thông thường'),
('guest', 'Khách');

-- Insert dữ liệu mẫu cho Permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Account permissions
('view_accounts', 'Xem danh sách tài khoản', 'account', 'read'),
('create_account', 'Tạo tài khoản mới', 'account', 'create'),
('update_account', 'Cập nhật tài khoản', 'account', 'update'),
('delete_account', 'Xóa tài khoản', 'account', 'delete'),
('manage_own_account', 'Quản lý tài khoản của chính mình', 'account', 'manage_own'),

-- Role permissions
('view_roles', 'Xem danh sách vai trò', 'role', 'read'),
('create_role', 'Tạo vai trò mới', 'role', 'create'),
('update_role', 'Cập nhật vai trò', 'role', 'update'),
('delete_role', 'Xóa vai trò', 'role', 'delete'),

-- Permission permissions
('view_permissions', 'Xem danh sách quyền hạn', 'permission', 'read'),
('create_permission', 'Tạo quyền hạn mới', 'permission', 'create'),
('update_permission', 'Cập nhật quyền hạn', 'permission', 'update'),
('delete_permission', 'Xóa quyền hạn', 'permission', 'delete'),

-- Grant permissions
('grant_permissions', 'Gán quyền cho người dùng', 'grant', 'create'),
('revoke_permissions', 'Thu hồi quyền của người dùng', 'grant', 'delete'),
('view_user_permissions', 'Xem quyền hạn của người dùng', 'grant', 'read');

-- Gán quyền cho role admin (có tất cả quyền)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin';

-- Gán quyền cho role manager (một số quyền quản lý)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' 
AND p.name IN (
    'view_accounts', 'update_account', 'manage_own_account',
    'view_roles', 'view_permissions', 'view_user_permissions'
);

-- Gán quyền cho role user (chỉ quản lý tài khoản của mình)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'user' 
AND p.name IN ('manage_own_account');

-- Gán quyền cho role guest (không có quyền gì đặc biệt)
-- Guest role không có quyền nào được gán mặc định
