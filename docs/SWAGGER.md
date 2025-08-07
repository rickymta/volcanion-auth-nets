# API Documentation with Swagger

This project includes comprehensive API documentation using Swagger/OpenAPI 3.0. The documentation is automatically generated and available in development mode.

## 📚 Accessing API Documentation

### Development Environment
When running in development mode (`NODE_ENV=development`), the Swagger UI is available at:

**🔗 URL: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Starting the Development Server
```bash
# Set environment to development
$env:NODE_ENV="development"  # Windows PowerShell
export NODE_ENV=development  # Linux/macOS

# Start the development server
npm run dev
```

The server will display:
```
📚 Swagger documentation available at: http://localhost:3000/api-docs
```

## 🎯 Features

### Available Documentation
- **Authentication Endpoints** - Login, register, password reset, email verification
- **Account Management** - Profile management, avatar upload, account settings
- **Permission System** - Role and permission management (Admin only)

### Interactive API Testing
- **Try it Out** - Test API endpoints directly from the browser
- **Authentication** - Built-in Bearer token authentication support
- **Request/Response Examples** - Complete examples for all endpoints
- **Error Handling** - Detailed error responses and status codes

### Security Documentation
- **Bearer Authentication** - JWT token-based authentication
- **Rate Limiting** - API rate limiting information
- **Validation** - Request validation schemas and requirements

## 🔑 Authentication in Swagger

### 1. Login to Get Token
1. Go to `/api/v1/auth/login` endpoint
2. Click "Try it out"
3. Enter valid credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "yourpassword"
   }
   ```
4. Execute the request
5. Copy the `accessToken` from the response

### 2. Authorize API Calls
1. Click the **"Authorize"** button at the top of the page
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click "Authorize"
4. Now all protected endpoints will include your token

## 📖 API Endpoints Overview

### Public Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `POST /api/v1/auth/verify-email` - Verify email address
- `POST /api/v1/auth/refresh-token` - Refresh access token

### Protected Endpoints (Require Authentication)
- `GET /api/v1/accounts/profile` - Get user profile
- `PUT /api/v1/accounts/profile` - Update user profile
- `PUT /api/v1/accounts/change-password` - Change password
- `PUT /api/v1/accounts/avatar` - Update avatar
- `DELETE /api/v1/accounts/deactivate` - Deactivate account

### Admin Endpoints (Require Special Permissions)
- `GET /api/v1/accounts` - List all accounts
- `GET /api/v1/accounts/{id}` - Get account by ID
- `PUT /api/v1/accounts/{id}` - Update account by ID
- `PUT /api/v1/accounts/{id}/verify` - Verify account
- `PUT /api/v1/accounts/{id}/deactivate` - Deactivate account
- `GET /api/v1/permissions/roles` - Manage roles
- `GET /api/v1/permissions/permissions` - Manage permissions

## 🛠️ Request/Response Examples

### Login Request Example
```bash
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### Response Example
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "account": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": true,
      "isActive": true
    }
  }
}
```

### Protected Request Example
```bash
curl -X GET "http://localhost:3000/api/v1/accounts/profile" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔍 Schema Documentation

### User Registration Schema
```json
{
  "email": "string (email format, required)",
  "password": "string (min 8 chars, required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phone": "string (optional)"
}
```

### Validation Rules
- **Email**: Must be valid email format and unique
- **Password**: Minimum 8 characters, must contain letters and numbers
- **Names**: Required fields, no special characters
- **Phone**: Optional, international format supported

## 🚫 Error Responses

### Common Error Codes
- **400** - Bad Request (Validation errors)
- **401** - Unauthorized (Missing or invalid token)
- **403** - Forbidden (Insufficient permissions)
- **404** - Not Found (Resource not found)
- **409** - Conflict (Duplicate email, etc.)
- **429** - Too Many Requests (Rate limiting)
- **500** - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field1": "Field-specific error message",
    "field2": "Another error message"
  }
}
```

## 🎨 Customization

### Swagger Configuration
The Swagger configuration is located in `src/config/swagger.ts`:

- **Title**: Volcanion Auth API
- **Version**: 1.0.0
- **Description**: Authentication and Authorization system
- **Server URL**: Configurable via `API_URL` environment variable

### Adding New Endpoints
To add documentation for new endpoints:

1. Add Swagger comments above your route definitions:
```typescript
/**
 * @swagger
 * /api/v1/your-endpoint:
 *   post:
 *     tags: [YourTag]
 *     summary: Endpoint description
 *     description: Detailed description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YourSchema'
 *     responses:
 *       200:
 *         description: Success response
 */
```

2. Define schemas in `src/config/swagger.ts` under `components.schemas`

3. The documentation will be automatically generated

## 🔧 Development Notes

### Only Available in Development
For security reasons, Swagger documentation is only available when:
- `NODE_ENV=development`
- The server will not expose API docs in production

### Persistence
Swagger UI includes:
- **Persistent Authorization** - Tokens remain active during session
- **Request History** - Previous requests are remembered
- **Display Options** - Customized for better developer experience

### Security Headers
When Swagger is enabled, Content Security Policy is automatically adjusted to allow:
- Swagger UI assets
- Inline styles for documentation
- Safe script execution

## 📝 Additional Resources

- **OpenAPI Specification**: [https://swagger.io/specification/](https://swagger.io/specification/)
- **Swagger UI Documentation**: [https://swagger.io/tools/swagger-ui/](https://swagger.io/tools/swagger-ui/)
- **JWT Authentication**: [https://jwt.io/](https://jwt.io/)

---

**🎉 Happy API Testing!**

The Swagger documentation provides a complete, interactive way to explore and test the Volcanion Auth API. Use it to understand request formats, test authentication flows, and explore all available endpoints.
