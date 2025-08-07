import { Request, Response } from 'express';
import { AccountController } from '../../src/controllers/accountController';

// Mock dependencies
jest.mock('../../src/services/accountService');
jest.mock('../../src/services/emailService');
jest.mock('../../src/utils');

import { AccountService } from '../../src/services/accountService';
import { EmailService } from '../../src/services/emailService';
import { PasswordUtils, ResponseUtils } from '../../src/utils';

describe('AccountController Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { accountId: 1, email: 'test@example.com' },
      body: {},
      params: {},
      query: {},
      ip: '192.168.1.1'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Mock ResponseUtils methods
    (ResponseUtils.success as jest.Mock) = jest.fn((data, message) => ({
      success: true,
      message,
      data
    }));

    (ResponseUtils.error as jest.Mock) = jest.fn((message) => ({
      success: false,
      message
    }));

    (ResponseUtils.paginated as jest.Mock) = jest.fn((data, total, page, limit, message) => ({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }));
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        permissions: []
      };

      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(mockAccount);

      await AccountController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(AccountService.getAccountWithPermissions).toHaveBeenCalledWith(1);
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockAccount, 'Lấy thông tin tài khoản thành công');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle account not found', async () => {
      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(null);

      await AccountController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle errors', async () => {
      (AccountService.getAccountWithPermissions as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy thông tin tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = { first_name: 'Jane', last_name: 'Smith' };
      const updatedAccount = { id: 1, ...updateData };
      
      mockRequest.body = updateData;

      (AccountService.updateAccount as jest.Mock).mockResolvedValue(true);
      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(updatedAccount);

      await AccountController.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(AccountService.updateAccount).toHaveBeenCalledWith(1, updateData);
      expect(AccountService.getAccountWithPermissions).toHaveBeenCalledWith(1);
      expect(ResponseUtils.success).toHaveBeenCalledWith(updatedAccount, 'Cập nhật thông tin thành công');
    });

    it('should handle update failure', async () => {
      mockRequest.body = { first_name: 'Jane' };

      (AccountService.updateAccount as jest.Mock).mockResolvedValue(false);

      await AccountController.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không có thông tin nào được cập nhật');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle update errors', async () => {
      mockRequest.body = { first_name: 'Jane' };

      (AccountService.updateAccount as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật thông tin tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        password: 'hashedoldpassword'
      };

      mockRequest.body = passwordData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // Current password valid
        .mockResolvedValueOnce(false); // New password different
      (AccountService.updatePassword as jest.Mock).mockResolvedValue(true);
      (EmailService.sendPasswordChangeNotification as jest.Mock).mockResolvedValue(true);

      await AccountController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findById).toHaveBeenCalledWith(1);
      expect(PasswordUtils.compare).toHaveBeenCalledWith('oldpassword', 'hashedoldpassword');
      expect(PasswordUtils.compare).toHaveBeenCalledWith('newpassword123', 'hashedoldpassword');
      expect(AccountService.updatePassword).toHaveBeenCalledWith(1, 'newpassword123');
      expect(EmailService.sendPasswordChangeNotification).toHaveBeenCalledWith(
        'test@example.com',
        'John',
        '192.168.1.1'
      );
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Đổi mật khẩu thành công');
    });

    it('should handle account not found', async () => {
      mockRequest.body = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };

      (AccountService.findById as jest.Mock).mockResolvedValue(null);

      await AccountController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle invalid current password', async () => {
      const passwordData = {
        current_password: 'wrongpassword',
        new_password: 'newpassword123'
      };
      const mockAccount = { id: 1, password: 'hashedoldpassword' };

      mockRequest.body = passwordData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      await AccountController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Mật khẩu hiện tại không chính xác');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle same password', async () => {
      const passwordData = {
        current_password: 'samepassword',
        new_password: 'samepassword'
      };
      const mockAccount = { id: 1, password: 'hashedsamepassword' };

      mockRequest.body = passwordData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // Current password valid
        .mockResolvedValueOnce(true); // New password same

      await AccountController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Mật khẩu mới phải khác mật khẩu hiện tại');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle password update failure', async () => {
      const passwordData = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };
      const mockAccount = { id: 1, password: 'hashedoldpassword' };

      mockRequest.body = passwordData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (AccountService.updatePassword as jest.Mock).mockResolvedValue(false);

      await AccountController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật mật khẩu');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle change password errors', async () => {
      mockRequest.body = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };

      (AccountService.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi trong quá trình đổi mật khẩu');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar successfully', async () => {
      const avatarData = { avatar_url: 'https://example.com/avatar.jpg' };
      
      mockRequest.body = avatarData;

      (AccountService.updateAvatar as jest.Mock).mockResolvedValue(true);

      await AccountController.updateAvatar(mockRequest as Request, mockResponse as Response);

      expect(AccountService.updateAvatar).toHaveBeenCalledWith(1, 'https://example.com/avatar.jpg');
      expect(ResponseUtils.success).toHaveBeenCalledWith(
        { avatar_url: 'https://example.com/avatar.jpg' },
        'Cập nhật ảnh đại diện thành công'
      );
    });

    it('should handle missing avatar URL', async () => {
      mockRequest.body = {};

      await AccountController.updateAvatar(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('URL ảnh đại diện là bắt buộc');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle avatar update failure', async () => {
      mockRequest.body = { avatar_url: 'https://example.com/avatar.jpg' };

      (AccountService.updateAvatar as jest.Mock).mockResolvedValue(false);

      await AccountController.updateAvatar(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật ảnh đại diện');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle avatar update errors', async () => {
      mockRequest.body = { avatar_url: 'https://example.com/avatar.jpg' };

      (AccountService.updateAvatar as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.updateAvatar(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật ảnh đại diện');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account successfully', async () => {
      const deactivateData = { password: 'correctpassword' };
      const mockAccount = { id: 1, password: 'hashedpassword' };

      mockRequest.body = deactivateData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);
      (AccountService.deactivateAccount as jest.Mock).mockResolvedValue(true);

      await AccountController.deactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(AccountService.findById).toHaveBeenCalledWith(1);
      expect(PasswordUtils.compare).toHaveBeenCalledWith('correctpassword', 'hashedpassword');
      expect(AccountService.deactivateAccount).toHaveBeenCalledWith(1);
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Vô hiệu hóa tài khoản thành công');
    });

    it('should handle missing password', async () => {
      mockRequest.body = {};

      await AccountController.deactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Mật khẩu là bắt buộc để vô hiệu hóa tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle account not found for deactivation', async () => {
      mockRequest.body = { password: 'correctpassword' };

      (AccountService.findById as jest.Mock).mockResolvedValue(null);

      await AccountController.deactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle invalid password for deactivation', async () => {
      const deactivateData = { password: 'wrongpassword' };
      const mockAccount = { id: 1, password: 'hashedpassword' };

      mockRequest.body = deactivateData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      await AccountController.deactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Mật khẩu không chính xác');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle deactivation failure', async () => {
      const deactivateData = { password: 'correctpassword' };
      const mockAccount = { id: 1, password: 'hashedpassword' };

      mockRequest.body = deactivateData;

      (AccountService.findById as jest.Mock).mockResolvedValue(mockAccount);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);
      (AccountService.deactivateAccount as jest.Mock).mockResolvedValue(false);

      await AccountController.deactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi vô hiệu hóa tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle deactivation errors', async () => {
      mockRequest.body = { password: 'correctpassword' };

      (AccountService.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.deactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi vô hiệu hóa tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllAccounts', () => {
    it('should get all accounts with pagination', async () => {
      const mockResult = {
        accounts: [
          { id: 1, email: 'user1@example.com' },
          { id: 2, email: 'user2@example.com' }
        ],
        total: 2,
        page: 1,
        limit: 10
      };

      mockRequest.query = { page: '1', limit: '10' };

      (AccountService.getAllAccounts as jest.Mock).mockResolvedValue(mockResult);

      await AccountController.getAllAccounts(mockRequest as Request, mockResponse as Response);

      expect(AccountService.getAllAccounts).toHaveBeenCalledWith(1, 10);
      expect(ResponseUtils.paginated).toHaveBeenCalledWith(
        mockResult.accounts,
        mockResult.total,
        mockResult.page,
        mockResult.limit,
        'Lấy danh sách tài khoản thành công'
      );
    });

    it('should handle default pagination values', async () => {
      const mockResult = {
        accounts: [],
        total: 0,
        page: 1,
        limit: 10
      };

      mockRequest.query = {};

      (AccountService.getAllAccounts as jest.Mock).mockResolvedValue(mockResult);

      await AccountController.getAllAccounts(mockRequest as Request, mockResponse as Response);

      expect(AccountService.getAllAccounts).toHaveBeenCalledWith(1, 10);
    });

    it('should handle get all accounts errors', async () => {
      mockRequest.query = { page: '1', limit: '10' };

      (AccountService.getAllAccounts as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.getAllAccounts(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy danh sách tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAccountById', () => {
    it('should get account by id successfully', async () => {
      const mockAccount = {
        id: 2,
        email: 'user2@example.com',
        first_name: 'User',
        last_name: 'Two'
      };

      mockRequest.params = { id: '2' };

      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(mockAccount);

      await AccountController.getAccountById(mockRequest as Request, mockResponse as Response);

      expect(AccountService.getAccountWithPermissions).toHaveBeenCalledWith(2);
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockAccount, 'Lấy thông tin tài khoản thành công');
    });

    it('should handle account not found by id', async () => {
      mockRequest.params = { id: '999' };

      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(null);

      await AccountController.getAccountById(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle get account by id errors', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.getAccountWithPermissions as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.getAccountById(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi lấy thông tin tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('adminUpdateAccount', () => {
    it('should admin update account successfully', async () => {
      const updateData = { first_name: 'Updated', last_name: 'User' };
      const updatedAccount = { id: 2, ...updateData };

      mockRequest.params = { id: '2' };
      mockRequest.body = updateData;

      (AccountService.updateAccount as jest.Mock).mockResolvedValue(true);
      (AccountService.getAccountWithPermissions as jest.Mock).mockResolvedValue(updatedAccount);

      await AccountController.adminUpdateAccount(mockRequest as Request, mockResponse as Response);

      expect(AccountService.updateAccount).toHaveBeenCalledWith(2, updateData);
      expect(AccountService.getAccountWithPermissions).toHaveBeenCalledWith(2);
      expect(ResponseUtils.success).toHaveBeenCalledWith(updatedAccount, 'Cập nhật tài khoản thành công');
    });

    it('should handle admin update failure', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.body = { first_name: 'Updated' };

      (AccountService.updateAccount as jest.Mock).mockResolvedValue(false);

      await AccountController.adminUpdateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không có thông tin nào được cập nhật');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle admin update errors', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.body = { first_name: 'Updated' };

      (AccountService.updateAccount as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.adminUpdateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi cập nhật tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('adminDeactivateAccount', () => {
    it('should admin deactivate account successfully', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.deactivateAccount as jest.Mock).mockResolvedValue(true);

      await AccountController.adminDeactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(AccountService.deactivateAccount).toHaveBeenCalledWith(2);
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Vô hiệu hóa tài khoản thành công');
    });

    it('should handle self-deactivation attempt', async () => {
      mockRequest.params = { id: '1' }; // Same as accountId in user

      await AccountController.adminDeactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không thể vô hiệu hóa tài khoản của chính mình');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle admin deactivation failure', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.deactivateAccount as jest.Mock).mockResolvedValue(false);

      await AccountController.adminDeactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản hoặc tài khoản đã bị vô hiệu hóa');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle admin deactivation errors', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.deactivateAccount as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.adminDeactivateAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi vô hiệu hóa tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('adminVerifyAccount', () => {
    it('should admin verify account successfully', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.verifyAccount as jest.Mock).mockResolvedValue(true);

      await AccountController.adminVerifyAccount(mockRequest as Request, mockResponse as Response);

      expect(AccountService.verifyAccount).toHaveBeenCalledWith(2);
      expect(ResponseUtils.success).toHaveBeenCalledWith(null, 'Xác thực tài khoản thành công');
    });

    it('should handle verify account failure', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.verifyAccount as jest.Mock).mockResolvedValue(false);

      await AccountController.adminVerifyAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Không tìm thấy tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle verify account errors', async () => {
      mockRequest.params = { id: '2' };

      (AccountService.verifyAccount as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AccountController.adminVerifyAccount(mockRequest as Request, mockResponse as Response);

      expect(ResponseUtils.error).toHaveBeenCalledWith('Lỗi xác thực tài khoản');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
