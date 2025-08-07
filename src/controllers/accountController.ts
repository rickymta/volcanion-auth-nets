import { Request, Response } from 'express';
import { ResponseUtils } from '../utils';
import { UpdateAccountDto, ChangePasswordDto } from '../types';
import { AccountService } from '../services/accountService';
import { PasswordUtils } from '../utils';
import { EmailService } from '../services/emailService';

export class AccountController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;
      const account = await AccountService.getAccountWithPermissions(accountId);

      if (!account) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(account, 'Lấy thông tin tài khoản thành công'));
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy thông tin tài khoản'));
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;
      const data: UpdateAccountDto = req.body;

      const updated = await AccountService.updateAccount(accountId, data);
      if (!updated) {
        res.status(400).json(ResponseUtils.error('Không có thông tin nào được cập nhật'));
        return;
      }

      // Get updated account info
      const account = await AccountService.getAccountWithPermissions(accountId);

      res.json(ResponseUtils.success(account, 'Cập nhật thông tin thành công'));
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi cập nhật thông tin tài khoản'));
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;
      const { current_password, new_password }: ChangePasswordDto = req.body;

      // Get current account
      const account = await AccountService.findById(accountId);
      if (!account) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.compare(current_password, account.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json(ResponseUtils.error('Mật khẩu hiện tại không chính xác'));
        return;
      }

      // Check if new password is different from current
      const isSamePassword = await PasswordUtils.compare(new_password, account.password);
      if (isSamePassword) {
        res.status(400).json(ResponseUtils.error('Mật khẩu mới phải khác mật khẩu hiện tại'));
        return;
      }

      // Update password
      const updated = await AccountService.updatePassword(accountId, new_password);
      if (!updated) {
        res.status(500).json(ResponseUtils.error('Lỗi cập nhật mật khẩu'));
        return;
      }

      // Send notification email
      const ipAddress = req.ip || req.connection.remoteAddress;
      await EmailService.sendPasswordChangeNotification(
        account.email,
        account.first_name,
        ipAddress
      );

      res.json(ResponseUtils.success(null, 'Đổi mật khẩu thành công'));
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi trong quá trình đổi mật khẩu'));
    }
  }

  static async updateAvatar(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;
      const { avatar_url } = req.body;

      if (!avatar_url) {
        res.status(400).json(ResponseUtils.error('URL ảnh đại diện là bắt buộc'));
        return;
      }

      const updated = await AccountService.updateAvatar(accountId, avatar_url);
      if (!updated) {
        res.status(400).json(ResponseUtils.error('Lỗi cập nhật ảnh đại diện'));
        return;
      }

      res.json(ResponseUtils.success({ avatar_url }, 'Cập nhật ảnh đại diện thành công'));
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi cập nhật ảnh đại diện'));
    }
  }

  static async deactivateAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user!.accountId;
      const { password } = req.body;

      if (!password) {
        res.status(400).json(ResponseUtils.error('Mật khẩu là bắt buộc để vô hiệu hóa tài khoản'));
        return;
      }

      // Get current account
      const account = await AccountService.findById(accountId);
      if (!account) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.compare(password, account.password);
      if (!isPasswordValid) {
        res.status(400).json(ResponseUtils.error('Mật khẩu không chính xác'));
        return;
      }

      // Deactivate account
      const deactivated = await AccountService.deactivateAccount(accountId);
      if (!deactivated) {
        res.status(500).json(ResponseUtils.error('Lỗi vô hiệu hóa tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Vô hiệu hóa tài khoản thành công'));
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi vô hiệu hóa tài khoản'));
    }
  }

  // Admin functions
  static async getAllAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const result = await AccountService.getAllAccounts(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json(ResponseUtils.paginated(
        result.accounts,
        result.total,
        result.page,
        result.limit,
        'Lấy danh sách tài khoản thành công'
      ));
    } catch (error) {
      console.error('Get all accounts error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy danh sách tài khoản'));
    }
  }

  static async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.id);
      const account = await AccountService.getAccountWithPermissions(accountId);

      if (!account) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(account, 'Lấy thông tin tài khoản thành công'));
    } catch (error) {
      console.error('Get account by id error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi lấy thông tin tài khoản'));
    }
  }

  static async adminUpdateAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.id);
      const data: UpdateAccountDto = req.body;

      const updated = await AccountService.updateAccount(accountId, data);
      if (!updated) {
        res.status(400).json(ResponseUtils.error('Không có thông tin nào được cập nhật'));
        return;
      }

      const account = await AccountService.getAccountWithPermissions(accountId);
      res.json(ResponseUtils.success(account, 'Cập nhật tài khoản thành công'));
    } catch (error) {
      console.error('Admin update account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi cập nhật tài khoản'));
    }
  }

  static async adminDeactivateAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.id);
      const currentUserId = req.user!.accountId;

      if (accountId === currentUserId) {
        res.status(400).json(ResponseUtils.error('Không thể vô hiệu hóa tài khoản của chính mình'));
        return;
      }

      const deactivated = await AccountService.deactivateAccount(accountId);
      if (!deactivated) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản hoặc tài khoản đã bị vô hiệu hóa'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Vô hiệu hóa tài khoản thành công'));
    } catch (error) {
      console.error('Admin deactivate account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi vô hiệu hóa tài khoản'));
    }
  }

  static async adminVerifyAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.id);

      const verified = await AccountService.verifyAccount(accountId);
      if (!verified) {
        res.status(404).json(ResponseUtils.error('Không tìm thấy tài khoản'));
        return;
      }

      res.json(ResponseUtils.success(null, 'Xác thực tài khoản thành công'));
    } catch (error) {
      console.error('Admin verify account error:', error);
      res.status(500).json(ResponseUtils.error('Lỗi xác thực tài khoản'));
    }
  }
}
