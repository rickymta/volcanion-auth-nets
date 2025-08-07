import { Request, Response } from 'express';
import { AuthController } from '../../src/controllers/authController';
import { AuthService } from '../../src/services/authService';
import { AccountService } from '../../src/services/accountService';
import { EmailService } from '../../src/services/emailService';
import { ResponseUtils } from '../../src/utils';

// Mock the dependencies
jest.mock('../../src/services/authService');
jest.mock('../../src/services/accountService');
jest.mock('../../src/services/emailService');
jest.mock('../../src/utils');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    beforeEach(() => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      };
    });

    it('should register user successfully', async () => {
      (AccountService.createAccount as jest.Mock).mockResolvedValue(1);
      (AuthService.createEmailVerification as jest.Mock).mockResolvedValue('verify-token');
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: {
          accountId: 1,
          message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
          emailSent: true
        }
      });

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(AccountService.createAccount).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      });
      expect(AuthService.createEmailVerification).toHaveBeenCalledWith(1);
      expect(EmailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', 'verify-token', 'John');
      expect(ResponseUtils.success).toHaveBeenCalledWith({
        accountId: 1,
        message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        emailSent: true
      }, 'Đăng ký thành công');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      (AccountService.createAccount as jest.Mock).mockResolvedValue(1);
      (AuthService.createEmailVerification as jest.Mock).mockResolvedValue('verify-token');
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(false);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: {
          accountId: 1,
          message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
          emailSent: false
        }
      });

      // Mock console.warn
      const consolWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(consolWarnSpy).toHaveBeenCalledWith('Failed to send verification email for account:', 1);
      expect(ResponseUtils.success).toHaveBeenCalledWith({
        accountId: 1,
        message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        emailSent: false
      }, 'Đăng ký thành công');
      expect(mockStatus).toHaveBeenCalledWith(201);

      consolWarnSpy.mockRestore();
    });

    it('should handle registration errors', async () => {
      const mockError = new Error('Database error');
      (AccountService.createAccount as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi trong quá trình đăng ký'
      });

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Register error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình đăng ký');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        },
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser'
        },
        ip: '127.0.0.1'
      };
    });

    it('should login user successfully', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };
      const mockAccount = { 
        id: 1, 
        email: 'test@example.com', 
        first_name: 'John' 
      };
      const mockAccountWithPermissions = {
        ...mockAccount,
        permissions: ['read', 'write']
      };

      (AuthService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (AuthService.login as jest.Mock).mockResolvedValue(mockTokens);
      (AuthService.recordLoginAttempt as jest.Mock).mockResolvedValue(true);
      (AccountService.findByEmail as jest.Mock).mockResolvedValue(mockAccount);
      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(mockAccountWithPermissions);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: {
          ...mockTokens,
          user: mockAccountWithPermissions
        }
      });

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(AuthService.isAccountLocked).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123', 'Mozilla/5.0 Test Browser', '127.0.0.1');
      expect(AuthService.recordLoginAttempt).toHaveBeenCalledWith('test@example.com', true, '127.0.0.1');
      expect(AccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(AccountService.getAccountWithPermissions).toHaveBeenCalledWith(1);
      expect(ResponseUtils.success).toHaveBeenCalledWith({
        ...mockTokens,
        user: mockAccountWithPermissions
      }, 'Đăng nhập thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle account locked', async () => {
      (AuthService.isAccountLocked as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'
      });

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(AuthService.isAccountLocked).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle invalid credentials', async () => {
      (AuthService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (AuthService.login as jest.Mock).mockResolvedValue(null);
      (AuthService.recordLoginAttempt as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123', 'Mozilla/5.0 Test Browser', '127.0.0.1');
      expect(AuthService.recordLoginAttempt).toHaveBeenCalledWith('test@example.com', false, '127.0.0.1');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Email hoặc mật khẩu không chính xác');
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Database error');
      (AuthService.isAccountLocked as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi trong quá trình đăng nhập'
      });

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Login error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình đăng nhập');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockRequest.body = {
        refresh_token: 'refresh-token'
      };
    });

    it('should logout user successfully', async () => {
      (AuthService.logout as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Đăng xuất thành công'
      });

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(AuthService.logout).toHaveBeenCalledWith('refresh-token');
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Đăng xuất thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle logout without refresh token', async () => {
      mockRequest.body = {};
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Đăng xuất thành công'
      });

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(AuthService.logout).not.toHaveBeenCalled();
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Đăng xuất thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const mockError = new Error('Database error');
      (AuthService.logout as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi trong quá trình đăng xuất'
      });

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Logout error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình đăng xuất');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      mockRequest.body = {
        refresh_token: 'refresh-token'
      };
    });

    it('should refresh tokens successfully', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      (AuthService.refreshTokens as jest.Mock).mockResolvedValue(mockTokens);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: mockTokens,
        message: 'Làm mới token thành công'
      });

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(AuthService.refreshTokens).toHaveBeenCalledWith('refresh-token');
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockTokens, 'Làm mới token thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle invalid refresh token', async () => {
      (AuthService.refreshTokens as jest.Mock).mockResolvedValue(null);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      });

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(AuthService.refreshTokens).toHaveBeenCalledWith('refresh-token');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Refresh token không hợp lệ hoặc đã hết hạn');
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle refresh token errors', async () => {
      const mockError = new Error('Database error');
      (AuthService.refreshTokens as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi trong quá trình làm mới token'
      });

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Refresh token error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình làm mới token');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    beforeEach(() => {
      mockRequest.body = {
        email: 'test@example.com'
      };
    });

    it('should send forgot password email successfully', async () => {
      const mockAccount = { id: 1, email: 'test@example.com', first_name: 'John' };

      (AccountService.findByEmail as jest.Mock).mockResolvedValue(mockAccount);
      (AuthService.createPasswordReset as jest.Mock).mockResolvedValue('reset-token');
      (EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Email đặt lại mật khẩu đã được gửi'
      });

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(AuthService.createPasswordReset).toHaveBeenCalledWith(1);
      expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'reset-token', 'John');
      expect(ResponseUtils.success).toHaveBeenCalledWith({ emailSent: true }, 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle account not found', async () => {
      (AccountService.findByEmail as jest.Mock).mockResolvedValue(null);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'
      });

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle forgot password errors', async () => {
      const mockError = new Error('Database error');
      (AccountService.findByEmail as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi gửi email đặt lại mật khẩu'
      });

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Forgot password error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình xử lý yêu cầu');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      mockRequest.body = {
        token: 'reset-token',
        new_password: 'newpassword123'
      };
    });

    it('should reset password successfully', async () => {
      const mockPasswordReset = { 
        account_id: 1, 
        token: 'hashed-token', 
        expires_at: new Date(Date.now() + 3600000) 
      };

      (AuthService.findPasswordReset as jest.Mock).mockResolvedValue(mockPasswordReset);
      (AccountService.updatePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.usePasswordReset as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Đặt lại mật khẩu thành công'
      });

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(AuthService.findPasswordReset).toHaveBeenCalledWith('reset-token');
      expect(AccountService.updatePassword).toHaveBeenCalledWith(1, 'newpassword123');
      expect(AuthService.usePasswordReset).toHaveBeenCalledWith('reset-token');
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Đặt lại mật khẩu thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle invalid reset token', async () => {
      (AuthService.findPasswordReset as jest.Mock).mockResolvedValue(null);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Token đặt lại mật khẩu không hợp lệ'
      });

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(AuthService.findPasswordReset).toHaveBeenCalledWith('reset-token');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle password update failure', async () => {
      const mockPasswordReset = { 
        account_id: 1, 
        token: 'hashed-token', 
        expires_at: new Date(Date.now() + 3600000) 
      };

      (AuthService.findPasswordReset as jest.Mock).mockResolvedValue(mockPasswordReset);
      (AccountService.updatePassword as jest.Mock).mockResolvedValue(false);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi cập nhật mật khẩu'
      });

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(AccountService.updatePassword).toHaveBeenCalledWith(1, 'newpassword123');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật mật khẩu');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle reset password errors', async () => {
      const mockError = new Error('Database error');
      (AuthService.findPasswordReset as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi đặt lại mật khẩu'
      });

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Reset password error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình đặt lại mật khẩu');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      mockRequest.body = {
        token: 'verify-token'
      };
    });

    it('should verify email successfully', async () => {
      const mockVerification = { 
        account_id: 1, 
        token: 'hashed-token', 
        expires_at: new Date(Date.now() + 3600000) 
      };

      (AuthService.findEmailVerification as jest.Mock).mockResolvedValue(mockVerification);
      (AccountService.verifyAccount as jest.Mock).mockResolvedValue(true);
      (AuthService.useEmailVerification as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Xác thực email thành công'
      });

      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(AuthService.findEmailVerification).toHaveBeenCalledWith('verify-token');
      expect(AccountService.verifyAccount).toHaveBeenCalledWith(1);
      expect(AuthService.useEmailVerification).toHaveBeenCalledWith('verify-token');
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Xác thực email thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle invalid verification token', async () => {
      (AuthService.findEmailVerification as jest.Mock).mockResolvedValue(null);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Token xác thực email không hợp lệ'
      });

      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(AuthService.findEmailVerification).toHaveBeenCalledWith('verify-token');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Token xác thực email không hợp lệ hoặc đã hết hạn');
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle account verification failure', async () => {
      const mockVerification = { 
        account_id: 1, 
        token: 'hashed-token', 
        expires_at: new Date(Date.now() + 3600000) 
      };

      (AuthService.findEmailVerification as jest.Mock).mockResolvedValue(mockVerification);
      (AccountService.verifyAccount as jest.Mock).mockResolvedValue(false);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi xác thực tài khoản'
      });

      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(AccountService.verifyAccount).toHaveBeenCalledWith(1);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi xác thực tài khoản');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle verify email errors', async () => {
      const mockError = new Error('Database error');
      (AuthService.findEmailVerification as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi xác thực email'
      });

      await AuthController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Verify email error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình xác thực email');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    beforeEach(() => {
      mockRequest.body = {
        email: 'test@example.com'
      };
    });

    it('should resend verification email successfully', async () => {
      const mockAccount = { id: 1, email: 'test@example.com', first_name: 'John', verified: false };

      (AccountService.findByEmail as jest.Mock).mockResolvedValue(mockAccount);
      (AuthService.createEmailVerification as jest.Mock).mockResolvedValue('new-verify-token');
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(true);
      (ResponseUtils.success as jest.Mock).mockReturnValue({
        success: true,
        data: null,
        message: 'Email xác thực đã được gửi lại'
      });

      await AuthController.resendVerification(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(AuthService.createEmailVerification).toHaveBeenCalledWith(1);
      expect(EmailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', 'new-verify-token', 'John');
      expect(ResponseUtils.success).toHaveBeenCalledWith({ emailSent: true }, 'Đã gửi lại email xác thực');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle account not found', async () => {
      (AccountService.findByEmail as jest.Mock).mockResolvedValue(null);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });

      await AuthController.resendVerification(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản');
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle account already verified', async () => {
      const mockAccount = { id: 1, email: 'test@example.com', first_name: 'John', is_verified: true };

      (AccountService.findByEmail as jest.Mock).mockResolvedValue(mockAccount);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Tài khoản đã được xác thực'
      });

      await AuthController.resendVerification(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(ResponseUtils.error).toHaveBeenCalledWith('Tài khoản đã được xác thực');
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should handle resend verification errors', async () => {
      const mockError = new Error('Database error');
      (AccountService.findByEmail as jest.Mock).mockRejectedValue(mockError);
      (ResponseUtils.error as jest.Mock).mockReturnValue({
        success: false,
        message: 'Lỗi gửi lại email xác thực'
      });

      await AuthController.resendVerification(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Resend verification error:', mockError);
      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình gửi email xác thực');
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalled();
    });
  });
});
