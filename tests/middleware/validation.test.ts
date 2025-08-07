import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { 
  validationSchemas, 
  validate, 
  validateQuery, 
  validateParams,
  customValidation 
} from '../../src/middleware/validation';
import { ResponseUtils, ValidationUtils } from '../../src/utils';

// Mock utils
jest.mock('../../src/utils', () => ({
  ResponseUtils: {
    error: jest.fn((message: string, errors?: any[]) => ({ 
      success: false, 
      message, 
      errors: errors || [] 
    }))
  },
  ValidationUtils: {
    sanitizeString: jest.fn((str: string) => str.trim())
  }
}));

// Mock AccountService
jest.mock('../../src/services/accountService', () => ({
  AccountService: {
    emailExists: jest.fn()
  }
}));

describe('Validation Middleware', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      query: {},
      params: {},
      user: undefined
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('Validation Schemas', () => {
    describe('register schema', () => {
      it('should validate valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'John',
          last_name: 'Doe'
        };

        const { error } = validationSchemas.register.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'Password123',
          first_name: 'John',
          last_name: 'Doe'
        };

        const { error } = validationSchemas.register.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Email không hợp lệ');
      });

      it('should reject weak password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'weak',
          first_name: 'John',
          last_name: 'Doe'
        };

        const { error } = validationSchemas.register.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Mật khẩu phải có ít nhất 8 ký tự');
      });

      it('should reject password without letter and number', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'onlyletters',
          first_name: 'John',
          last_name: 'Doe'
        };

        const { error } = validationSchemas.register.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số');
      });

      it('should validate optional fields', () => {
        const validData = {
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'John',
          last_name: 'Doe',
          phone: '0312345678',
          date_of_birth: '1990-01-01',
          gender: 'male'
        };

        const { error } = validationSchemas.register.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject invalid phone number', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Password123',
          phone: 'invalid-phone'
        };

        const { error } = validationSchemas.register.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Số điện thoại không hợp lệ (định dạng Việt Nam)');
      });

      it('should reject invalid gender', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Password123',
          gender: 'invalid'
        };

        const { error } = validationSchemas.register.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Giới tính phải là male, female hoặc other');
      });
    });

    describe('login schema', () => {
      it('should validate valid login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'anypassword'
        };

        const { error } = validationSchemas.login.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should require email and password', () => {
        const invalidData = {};

        const { error } = validationSchemas.login.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details.length).toBeGreaterThan(0);
      });
    });

    describe('updateAccount schema', () => {
      it('should validate valid update data', () => {
        const validData = {
          first_name: 'Updated Name'
        };

        const { error } = validationSchemas.updateAccount.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should require at least one field', () => {
        const invalidData = {};

        const { error } = validationSchemas.updateAccount.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Phải có ít nhất một trường để cập nhật');
      });
    });

    describe('changePassword schema', () => {
      it('should validate valid password change data', () => {
        const validData = {
          current_password: 'oldpassword',
          new_password: 'NewPassword123'
        };

        const { error } = validationSchemas.changePassword.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should require current and new password', () => {
        const invalidData = {};

        const { error } = validationSchemas.changePassword.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details.length).toBeGreaterThan(0);
      });
    });

    describe('pagination schema', () => {
      it('should validate valid pagination data', () => {
        const validData = {
          page: 1,
          limit: 10,
          sort: 'created_at',
          order: 'DESC'
        };

        const { error } = validationSchemas.pagination.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const data = {};

        const { error, value } = validationSchemas.pagination.validate(data);
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(10);
        expect(value.sort).toBe('created_at');
        expect(value.order).toBe('DESC');
      });

      it('should reject invalid page number', () => {
        const invalidData = { page: 0 };

        const { error } = validationSchemas.pagination.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Trang phải lớn hơn 0');
      });

      it('should reject limit over 100', () => {
        const invalidData = { limit: 101 };

        const { error } = validationSchemas.pagination.validate(invalidData);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toBe('Giới hạn không được vượt quá 100');
      });
    });
  });

  describe('validate middleware', () => {
    it('should pass valid data and continue', () => {
      const middleware = validate(validationSchemas.login);
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid data', () => {
      const middleware = validate(validationSchemas.login);
      mockReq.body = {
        email: 'invalid-email'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith(
        'Dữ liệu đầu vào không hợp lệ', 
        expect.any(Array)
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      const middleware = validate(validationSchemas.login);
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        unknownField: 'should be stripped'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.unknownField).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should format multiple validation errors', () => {
      const middleware = validate(validationSchemas.register);
      mockReq.body = {
        email: 'invalid-email',
        password: 'weak'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith(
        'Dữ liệu đầu vào không hợp lệ',
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      );
    });
  });

  describe('validateQuery middleware', () => {
    it('should validate query parameters', () => {
      const middleware = validateQuery(validationSchemas.pagination);
      mockReq.query = {
        page: '1',
        limit: '10'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid query parameters', () => {
      const middleware = validateQuery(validationSchemas.pagination);
      mockReq.query = {
        page: 'invalid'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith(
        'Tham số truy vấn không hợp lệ',
        expect.any(Array)
      );
    });
  });

  describe('validateParams middleware', () => {
    const idSchema = Joi.object({
      id: Joi.number().integer().positive().required()
    });

    it('should validate URL parameters', () => {
      const middleware = validateParams(idSchema);
      mockReq.params = {
        id: '123'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid URL parameters', () => {
      const middleware = validateParams(idSchema);
      mockReq.params = {
        id: 'invalid'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(ResponseUtils.error).toHaveBeenCalledWith(
        'Tham số URL không hợp lệ',
        expect.any(Array)
      );
    });
  });

  describe('customValidation', () => {
    describe('isValidId', () => {
      it('should pass for valid ID', () => {
        mockReq.params = { id: '123' };

        customValidation.isValidId(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should return 400 for invalid ID', () => {
        mockReq.params = { id: 'invalid' };

        customValidation.isValidId(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(ResponseUtils.error).toHaveBeenCalledWith('ID không hợp lệ');
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 400 for negative ID', () => {
        mockReq.params = { id: '-1' };

        customValidation.isValidId(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(ResponseUtils.error).toHaveBeenCalledWith('ID không hợp lệ');
      });

      it('should return 400 for zero ID', () => {
        mockReq.params = { id: '0' };

        customValidation.isValidId(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(ResponseUtils.error).toHaveBeenCalledWith('ID không hợp lệ');
      });
    });

    describe('sanitizeInput', () => {
      it('should sanitize string inputs', () => {
        mockReq.body = {
          name: '  John Doe  ',
          email: 'test@example.com',
          age: 25
        };

        customValidation.sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

        expect(ValidationUtils.sanitizeString).toHaveBeenCalledWith('  John Doe  ');
        expect(ValidationUtils.sanitizeString).toHaveBeenCalledWith('test@example.com');
        expect(ValidationUtils.sanitizeString).not.toHaveBeenCalledWith(25);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle empty body', () => {
        mockReq.body = undefined;

        customValidation.sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle non-string values', () => {
        mockReq.body = {
          name: 'John',
          age: 25,
          active: true,
          data: null
        };

        customValidation.sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

        expect(ValidationUtils.sanitizeString).toHaveBeenCalledWith('John');
        expect(ValidationUtils.sanitizeString).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('checkEmailUniqueness', () => {
      let mockAccountService: any;

      beforeEach(async () => {
        const { AccountService } = await import('../../src/services/accountService');
        mockAccountService = AccountService;
      });

      it('should continue when email is unique', async () => {
        mockReq.body = { email: 'unique@example.com' };
        mockAccountService.emailExists.mockResolvedValue(false);

        await customValidation.checkEmailUniqueness(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAccountService.emailExists).toHaveBeenCalledWith('unique@example.com', undefined);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should return 409 when email already exists', async () => {
        mockReq.body = { email: 'existing@example.com' };
        mockAccountService.emailExists.mockResolvedValue(true);

        await customValidation.checkEmailUniqueness(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Email đã được sử dụng');
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should exclude current user when updating', async () => {
        mockReq.body = { email: 'test@example.com' };
        mockReq.user = { accountId: 123, email: 'test@example.com' };
        mockAccountService.emailExists.mockResolvedValue(false);

        await customValidation.checkEmailUniqueness(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAccountService.emailExists).toHaveBeenCalledWith('test@example.com', 123);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should continue when no email in body', async () => {
        mockReq.body = { name: 'John' };

        await customValidation.checkEmailUniqueness(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAccountService.emailExists).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle service errors', async () => {
        mockReq.body = { email: 'test@example.com' };
        mockAccountService.emailExists.mockRejectedValue(new Error('Database error'));

        await customValidation.checkEmailUniqueness(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi kiểm tra email');
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate nested object structures', () => {
      const complexSchema = Joi.object({
        user: Joi.object({
          email: Joi.string().email().required(),
          profile: Joi.object({
            name: Joi.string().required()
          }).required()
        }).required()
      });

      const validData = {
        user: {
          email: 'test@example.com',
          profile: {
            name: 'John Doe'
          }
        }
      };

      const { error } = complexSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should handle array validation', () => {
      const arraySchema = Joi.object({
        permissions: Joi.array().items(Joi.number().integer().positive()).min(1).required()
      });

      const validData = {
        permissions: [1, 2, 3]
      };

      const { error } = arraySchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate conditional fields', () => {
      const conditionalSchema = Joi.object({
        type: Joi.string().valid('email', 'sms').required(),
        email: Joi.when('type', {
          is: 'email',
          then: Joi.string().email().required(),
          otherwise: Joi.string().allow('')
        }),
        phone: Joi.when('type', {
          is: 'sms',
          then: Joi.string().pattern(/^[0-9]{10}$/).required(),
          otherwise: Joi.string().allow('')
        })
      });

      const emailData = {
        type: 'email',
        email: 'test@example.com'
      };

      const smsData = {
        type: 'sms',
        phone: '1234567890'
      };

      expect(conditionalSchema.validate(emailData).error).toBeUndefined();
      expect(conditionalSchema.validate(smsData).error).toBeUndefined();
    });
  });
});
