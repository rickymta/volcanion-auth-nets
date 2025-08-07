import { Request, Response } from 'express';
import { ResponseUtils } from '../utils';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../types';
import { AccountService } from '../services/accountService';
import { AuthService } from '../services/authService';
import { EmailService } from '../services/emailService';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const data: RegisterDto = req.body;

      // Create account
      const accountId = await AccountService.createAccount(data);

      // Create email verification token
      const verificationToken = await AuthService.createEmailVerification(accountId);

      // Send verification email
      const emailSent = await EmailService.sendVerificationEmail(
        data.email,
        verificationToken,
        data.first_name
      );

      if (!emailSent) {
        console.warn('Failed to send verification email for account:', accountId);
      }

      res.status(201).json(ResponseUtils.success({
        accountId,
        message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        emailSent
      }, 'Đăng ký thành công'));
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình đăng ký'));
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginDto = req.body;
      const deviceInfo = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Check if account is locked
      const isLocked = await AuthService.isAccountLocked(email, ipAddress);
      if (isLocked) {
        res.status(429).json(ResponseUtils.error('Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'));
        return;
      }

      // Attempt login
      const tokens = await AuthService.login(email, password, deviceInfo, ipAddress);

      if (!tokens) {
        // Record failed login attempt
        await AuthService.recordLoginAttempt(email, false, ipAddress);
        res.status(401).json(ResponseUtils.error('Email hoặc mật khẩu không chính xác'));
        return;
      }

      // Record successful login
      await AuthService.recordLoginAttempt(email, true, ipAddress);

      // Get user info (extract accountId from JWT payload)
      const account = await AccountService.findByEmail(email);
      const accountWithPermissions = account ? await AccountService.getAccountWithPermissions(account.id) : null;

      res.json(ResponseUtils.success({
        ...tokens,
        user: accountWithPermissions
      }, 'Đăng nhập thành công'));
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình đăng nhập'));
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (refresh_token) {
        await AuthService.logout(refresh_token);
      }

      res.json(ResponseUtils.success(null, 'Đăng xuất thành công'));
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình đăng xuất'));
    }
  }

  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;

      await AuthService.logoutAll(accountId);

      res.json(ResponseUtils.success(null, 'Đăng xuất khỏi tất cả thiết bị thành công'));
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình đăng xuất'));
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      const tokens = await AuthService.refreshTokens(refresh_token);

      if (!tokens) {
        res.status(401).json(ResponseUtils.error('Refresh token không hợp lệ hoặc đã hết hạn'));
        return;
      }

      res.json(ResponseUtils.success(tokens, 'Làm mới token thành công'));
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình làm mới token'));
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email }: ForgotPasswordDto = req.body;

      const account = await AccountService.findByEmail(email);
      if (!account) {
        // Don't reveal if email exists or not
        res.json(ResponseUtils.success(null, 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'));
        return;
      }

      const resetToken = await AuthService.createPasswordReset(account.id);
      const emailSent = await EmailService.sendPasswordResetEmail(
        email,
        resetToken,
        account.first_name
      );

      if (!emailSent) {
        console.warn('Failed to send password reset email for account:', account.id);
      }

      res.json(ResponseUtils.success({ emailSent }, 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'));
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình xử lý yêu cầu'));
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, new_password }: ResetPasswordDto = req.body;

      const resetRecord = await AuthService.findPasswordReset(token);
      if (!resetRecord) {
        res.status(400).json(ResponseUtils.error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'));
        return;
      }

      // Update password
      const passwordUpdated = await AccountService.updatePassword(resetRecord.account_id, new_password);
      if (!passwordUpdated) {
        res.status(500).json(ResponseUtils.error('Lỗi cập nhật mật khẩu'));
        return;
      }

      // Mark reset token as used
      await AuthService.usePasswordReset(token);

      // Revoke all refresh tokens for security
      await AuthService.revokeAllRefreshTokens(resetRecord.account_id);

      // Get account info for notification
      const account = await AccountService.findById(resetRecord.account_id);
      if (account) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        await EmailService.sendPasswordChangeNotification(
          account.email,
          account.first_name,
          ipAddress
        );
      }

      res.json(ResponseUtils.success(null, 'Đặt lại mật khẩu thành công'));
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình đặt lại mật khẩu'));
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      const verificationRecord = await AuthService.findEmailVerification(token);
      if (!verificationRecord) {
        res.status(400).json(ResponseUtils.error('Token xác thực email không hợp lệ hoặc đã hết hạn'));
        return;
      }

      // Verify account
      const verified = await AccountService.verifyAccount(verificationRecord.account_id);
      if (!verified) {
        res.status(500).json(ResponseUtils.error('Lỗi xác thực tài khoản'));
        return;
      }

      // Mark verification token as used
      await AuthService.useEmailVerification(token);

      // Get account info for welcome email
      const account = await AccountService.findById(verificationRecord.account_id);
      if (account) {
        await EmailService.sendWelcomeEmail(account.email, account.first_name);
      }

      res.json(ResponseUtils.success(null, 'Xác thực email thành công'));
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình xác thực email'));
    }
  }

  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const account = await AccountService.findByEmail(email);
      if (!account) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      if (account.is_verified) {
        res.status(400).json(ResponseUtils.error('Tài khoản đã được xác thực'));
        return;
      }

      const verificationToken = await AuthService.createEmailVerification(account.id);
      const emailSent = await EmailService.sendVerificationEmail(
        email,
        verificationToken,
        account.first_name
      );

      res.json(ResponseUtils.success({ emailSent }, 'Đã gửi lại email xác thực'));
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình gửi email xác thực'));
    }
  }

  static async checkAuthStatus(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;
      const account = await AccountService.getAccountWithPermissions(accountId);

      if (!account) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(account, 'Trạng thái xác thực hợp lệ'));
    } catch (error) {
      console.error('Check auth status error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi kiểm tra trạng thái xác thực'));
    }
  }
}
