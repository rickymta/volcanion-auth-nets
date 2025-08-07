# Copilot Instructions for Volcanion Auth

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Node.js Express TypeScript authentication and authorization system with the following features:
- JWT-based authentication with access and refresh tokens
- Role-based permission system with many-to-many relationships
- MySQL database with Redis for caching and session management
- Comprehensive user management features

## Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MySQL with mysql2 driver
- **Cache/Session**: Redis
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Security**: bcryptjs, helmet, cors
- **Email**: nodemailer

## Architecture
- **Services**: Business logic layer (AccountService, AuthService, PermissionService, EmailService)
- **Controllers**: HTTP request handlers
- **Middleware**: Authentication, validation, rate limiting, error handling
- **Routes**: RESTful API endpoints
- **Utils**: Helper functions for password hashing, JWT, validation
- **Types**: TypeScript interfaces and types

## Database Schema
- **accounts**: User accounts with profile information
- **roles**: User roles (admin, manager, user, guest)
- **permissions**: Granular permissions with resource and action
- **role_permissions**: Many-to-many relationship between roles and permissions
- **grant_permissions**: Grants specific role-permissions to accounts
- **refresh_tokens**: JWT refresh token storage
- **password_resets**: Password reset tokens
- **email_verifications**: Email verification tokens

## Key Features
1. **Authentication**: Register, login, logout, refresh tokens
2. **Password Management**: Forgot password, reset password, change password
3. **Email Verification**: Account verification and welcome emails
4. **User Management**: Profile updates, avatar upload, account deactivation
5. **Authorization**: Role-based and permission-based access control
6. **Security**: Rate limiting, password hashing, secure sessions

## API Endpoints
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/accounts/*` - User account management
- `/api/v1/permissions/*` - Role and permission management

## Environment Variables
- Database: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- Redis: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- JWT: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
- Email: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
- App: APP_NAME, CLIENT_URL, PORT, NODE_ENV

## Development Guidelines
- Use TypeScript strictly with proper typing
- Implement proper error handling and logging
- Follow RESTful API conventions
- Use middleware for cross-cutting concerns
- Validate all inputs using Joi schemas
- Implement rate limiting for security
- Use transactions for database operations when needed
- Follow the established service-controller-route pattern
