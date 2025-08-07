-- Script tạo database và user cho Volcanion Auth
-- Chạy script này trong MySQL Workbench hoặc phpMyAdmin

-- Tạo database
CREATE DATABASE IF NOT EXISTS volcanion_auth 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Sử dụng database
USE volcanion_auth;

-- Tạo user và cấp quyền (tùy chọn, có thể bỏ qua nếu dùng root)
-- CREATE USER IF NOT EXISTS 'volcanion_user'@'localhost' IDENTIFIED BY 'volcanion_password';
-- GRANT ALL PRIVILEGES ON volcanion_auth.* TO 'volcanion_user'@'localhost';
-- FLUSH PRIVILEGES;

SELECT 'Database volcanion_auth đã được tạo thành công!' as message;
