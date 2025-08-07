import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ResponseUtils, ValidationUtils } from '../utils';

// Common validation schemas
const emailSchema = Joi.string().email().required().messages({
  'string.email': 'Email không hợp lệ',
  'any.required': 'Email là bắt buộc'
});

const passwordSchema = Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/).required().messages({
  'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
  'string.pattern.base': 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số',
  'any.required': 'Mật khẩu là bắt buộc'
});

const phoneSchema = Joi.string().pattern(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/).allow('').messages({
  'string.pattern.base': 'Số điện thoại không hợp lệ (định dạng Việt Nam)'
});

const nameSchema = Joi.string().max(100).allow('').messages({
  'string.max': 'Tên không được vượt quá 100 ký tự'
});

const dateSchema = Joi.date().iso().allow('').messages({
  'date.format': 'Ngày sinh phải có định dạng YYYY-MM-DD'
});

const genderSchema = Joi.string().valid('male', 'female', 'other').allow('').messages({
  'any.only': 'Giới tính phải là male, female hoặc other'
});

// Validation schemas
export const validationSchemas = {
  register: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    first_name: nameSchema,
    last_name: nameSchema,
    phone: phoneSchema,
    date_of_birth: dateSchema,
    gender: genderSchema
  }),

  login: Joi.object({
    email: emailSchema,
    password: Joi.string().required().messages({
      'any.required': 'Mật khẩu là bắt buộc'
    })
  }),

  updateAccount: Joi.object({
    first_name: nameSchema,
    last_name: nameSchema,
    phone: phoneSchema,
    date_of_birth: dateSchema,
    gender: genderSchema
  }).min(1).messages({
    'object.min': 'Phải có ít nhất một trường để cập nhật'
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required().messages({
      'any.required': 'Mật khẩu hiện tại là bắt buộc'
    }),
    new_password: passwordSchema
  }),

  forgotPassword: Joi.object({
    email: emailSchema
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Token là bắt buộc'
    }),
    new_password: passwordSchema
  }),

  refreshToken: Joi.object({
    refresh_token: Joi.string().required().messages({
      'any.required': 'Refresh token là bắt buộc'
    })
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Token xác thực là bắt buộc'
    })
  }),

  // Role validation
  createRole: Joi.object({
    name: Joi.string().max(100).required().messages({
      'string.max': 'Tên vai trò không được vượt quá 100 ký tự',
      'any.required': 'Tên vai trò là bắt buộc'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': 'Mô tả không được vượt quá 500 ký tự'
    })
  }),

  updateRole: Joi.object({
    name: Joi.string().max(100).messages({
      'string.max': 'Tên vai trò không được vượt quá 100 ký tự'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': 'Mô tả không được vượt quá 500 ký tự'
    })
  }).min(1).messages({
    'object.min': 'Phải có ít nhất một trường để cập nhật'
  }),

  // Permission validation
  createPermission: Joi.object({
    name: Joi.string().max(100).required().messages({
      'string.max': 'Tên quyền không được vượt quá 100 ký tự',
      'any.required': 'Tên quyền là bắt buộc'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': 'Mô tả không được vượt quá 500 ký tự'
    }),
    resource: Joi.string().max(100).required().messages({
      'string.max': 'Tên tài nguyên không được vượt quá 100 ký tự',
      'any.required': 'Tên tài nguyên là bắt buộc'
    }),
    action: Joi.string().max(50).required().messages({
      'string.max': 'Hành động không được vượt quá 50 ký tự',
      'any.required': 'Hành động là bắt buộc'
    })
  }),

  // Grant permission validation
  grantPermission: Joi.object({
    account_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID tài khoản phải là số',
      'number.integer': 'ID tài khoản phải là số nguyên',
      'number.positive': 'ID tài khoản phải là số dương',
      'any.required': 'ID tài khoản là bắt buộc'
    }),
    role_permission_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID quyền vai trò phải là số',
      'number.integer': 'ID quyền vai trò phải là số nguyên',
      'number.positive': 'ID quyền vai trò phải là số dương',
      'any.required': 'ID quyền vai trò là bắt buộc'
    }),
    expires_at: Joi.date().iso().allow('').messages({
      'date.format': 'Ngày hết hạn phải có định dạng ISO'
    })
  }),

  grantRole: Joi.object({
    account_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID tài khoản phải là số',
      'number.integer': 'ID tài khoản phải là số nguyên',
      'number.positive': 'ID tài khoản phải là số dương',
      'any.required': 'ID tài khoản là bắt buộc'
    }),
    role_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID vai trò phải là số',
      'number.integer': 'ID vai trò phải là số nguyên',
      'number.positive': 'ID vai trò phải là số dương',
      'any.required': 'ID vai trò là bắt buộc'
    }),
    expires_at: Joi.date().iso().allow('').messages({
      'date.format': 'Ngày hết hạn phải có định dạng ISO'
    })
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Trang phải là số',
      'number.integer': 'Trang phải là số nguyên',
      'number.min': 'Trang phải lớn hơn 0'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Giới hạn phải là số',
      'number.integer': 'Giới hạn phải là số nguyên',
      'number.min': 'Giới hạn phải lớn hơn 0',
      'number.max': 'Giới hạn không được vượt quá 100'
    }),
    sort: Joi.string().valid('id', 'email', 'created_at', 'updated_at', 'name').default('created_at').messages({
      'any.only': 'Trường sắp xếp không hợp lệ'
    }),
    order: Joi.string().valid('ASC', 'DESC').default('DESC').messages({
      'any.only': 'Thứ tự phải là ASC hoặc DESC'
    })
  })
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      res.status(400).json(ResponseUtils.error('Dữ liệu đầu vào không hợp lệ', errors));
      return;
    }

    req.body = value;
    next();
  };
};

// Query validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      res.status(400).json(ResponseUtils.error('Tham số truy vấn không hợp lệ', errors));
      return;
    }

    req.query = value;
    next();
  };
};

// Params validation middleware
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      res.status(400).json(ResponseUtils.error('Tham số URL không hợp lệ', errors));
      return;
    }

    req.params = value;
    next();
  };
};

// Custom validation functions
export const customValidation = {
  isValidId: (req: Request, res: Response, next: NextFunction): void => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json(ResponseUtils.error('ID không hợp lệ'));
      return;
    }
    next();
  },

  sanitizeInput: (req: Request, res: Response, next: NextFunction): void => {
    if (req.body) {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = ValidationUtils.sanitizeString(req.body[key]);
        }
      }
    }
    next();
  },

  checkEmailUniqueness: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { AccountService } = await import('../services/accountService');
      const email = req.body.email;
      const excludeId = req.user?.accountId; // For update operations

      if (email) {
        const emailExists = await AccountService.emailExists(email, excludeId);
        if (emailExists) {
          res.status(409).json(ResponseUtils.error('Email đã được sử dụng'));
          return;
        }
      }

      next();
    } catch (error) {
      res.status(500).json(ResponseUtils.error('Lỗi kiểm tra email'));
      return;
    }
  }
};
