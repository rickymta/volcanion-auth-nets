# Volcanion Auth - Authentication & Authorization System

A comprehensive Node.js Express TypeScript application for managing authentication and authorization with JWT, MySQL, and Redis.

## 🚀 Features

### Authentication
- ✅ User registration with email verification
- ✅ Secure login with JWT access and refresh tokens
- ✅ Password reset via email
- ✅ Multi-device session management
- ✅ Rate limiting for security

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Granular permissions system
- ✅ Many-to-many relationship between roles and permissions
- ✅ Account-specific permission grants
- ✅ Permission expiration support

### User Management
- ✅ User profile management
- ✅ Avatar upload support
- ✅ Account verification
- ✅ Account deactivation
- ✅ Admin user management

### Security Features
- ✅ Password hashing with bcryptjs
- ✅ JWT token validation
- ✅ Rate limiting
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Helmet security headers

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL
- **Cache/Sessions**: Redis
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Email**: nodemailer
- **Security**: helmet, cors, express-rate-limit

## 📦 Installation & Deployment

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd volcanion-auth-nets
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Make sure MySQL and Redis are running
npm run setup:db
```

5. **Start development server**
```bash
npm run dev
```

6. **Access API Documentation**
```bash
# Swagger UI available at:
http://localhost:3000/api-docs
```

### Docker Deployment (Recommended)

#### Quick Start with Docker
```bash
# Development environment
./scripts/docker.sh dev

# Production environment
./scripts/docker.sh setup
./scripts/docker.sh prod
```

#### Manual Docker Setup
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose --env-file .env.production up -d
```

📖 **Complete Docker Guide**: See [DOCKER.md](./DOCKER.md) for detailed deployment instructions.

## 📚 API Documentation

### Interactive Documentation (Swagger UI)
When running in development mode, comprehensive API documentation is available:

**🔗 URL: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

#### Features:
- **Interactive Testing** - Test API endpoints directly from browser
- **Authentication Support** - Built-in JWT token management
- **Request/Response Examples** - Complete examples for all endpoints
- **Schema Documentation** - Detailed request/response schemas
- **Error Handling** - Comprehensive error response documentation

#### Quick Usage:
1. Start the development server (`npm run dev`)
2. Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
3. Use `/api/v1/auth/login` to get an access token
4. Click "Authorize" and enter: `Bearer YOUR_ACCESS_TOKEN`
5. Test any protected endpoints

📖 **Complete API Guide**: See [SWAGGER.md](./docs/SWAGGER.md) for detailed documentation.

## 📦 Manual Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd volcanion-auth-nets
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volcanion_auth

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_email@gmail.com

# App Configuration
APP_NAME=Volcanion Auth
CLIENT_URL=http://localhost:3000
```

4. **Set up database**
```bash
# Create MySQL database and run the schema
mysql -u root -p < database/schema.sql
```

5. **Start Redis server**
```bash
# On Windows with Redis installed
redis-server

# On Linux/Mac
sudo service redis-server start
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "0987654321",
  "date_of_birth": "1990-01-01",
  "gender": "male"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refresh_token": "your_refresh_token"
}
```

#### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123"
}
```

### Account Management Endpoints

#### Get Profile
```http
GET /api/v1/accounts/profile
Authorization: Bearer your_access_token
```

#### Update Profile
```http
PUT /api/v1/accounts/profile
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "0123456789"
}
```

#### Change Password
```http
PUT /api/v1/accounts/change-password
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "current_password": "CurrentPass123",
  "new_password": "NewSecurePass123"
}
```

### Permission Management Endpoints

#### Get All Roles
```http
GET /api/v1/permissions/roles
Authorization: Bearer your_access_token
```

#### Create Role
```http
POST /api/v1/permissions/roles
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "name": "moderator",
  "description": "Moderator role with limited admin access"
}
```

#### Grant Role to Account
```http
POST /api/v1/permissions/grant-role
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "account_id": 1,
  "role_id": 2,
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```

## 🗄 Database Schema

### Core Tables
- **accounts**: User account information
- **roles**: User roles (admin, manager, user, guest)
- **permissions**: Granular permissions with resource and action
- **role_permissions**: Many-to-many relationship between roles and permissions
- **grant_permissions**: Assigns role-permissions to specific accounts

### Security Tables
- **refresh_tokens**: Stores JWT refresh tokens
- **password_resets**: Password reset tokens with expiration
- **email_verifications**: Email verification tokens

## 🔒 Security Features

### Authentication Security
- JWT tokens with configurable expiration
- Refresh token rotation
- Secure password hashing with bcryptjs
- Rate limiting on authentication endpoints

### Authorization Security
- Role-based access control (RBAC)
- Granular permission system
- Permission expiration support
- Owner-based access control

### General Security
- Input validation and sanitization
- SQL injection prevention
- CORS protection
- Security headers with Helmet
- Rate limiting on all endpoints

## 🏗 Project Structure

```
src/
├── config/          # Database and configuration
├── controllers/     # Request handlers
├── middleware/      # Authentication, validation, error handling
├── models/          # Database models and types
├── routes/          # API route definitions
├── services/        # Business logic layer
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── app.ts           # Main application file

database/
└── schema.sql       # Database schema and initial data
```

## 🧪 Testing

Run tests (when implemented):
```bash
npm test
```

## 📈 Performance

- Connection pooling for MySQL
- Redis caching for sessions
- Rate limiting to prevent abuse
- Optimized database queries with indexes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

Built with ❤️ using Node.js, Express, and TypeScript
