// Mock nodemailer BEFORE importing EmailService
const mockSendMail = jest.fn();
const mockVerify = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify
  }))
}));

// Import EmailService after mock
import { EmailService } from '../../src/services/emailService';

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockClear();
    mockVerify.mockClear();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully with firstName', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const result = await EmailService.sendVerificationEmail('test@example.com', 'test-token', 'John Doe');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `${process.env.APP_NAME || 'Volcanion Auth'} - Xác thực tài khoản`,
        html: expect.stringContaining('John Doe')
      });
    });

    it('should send verification email successfully without firstName', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const result = await EmailService.sendVerificationEmail('test@example.com', 'test-token');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `${process.env.APP_NAME || 'Volcanion Auth'} - Xác thực tài khoản`,
        html: expect.stringContaining('bạn')
      });
    });

    it('should return false when sending verification email fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Send failed'));

      const result = await EmailService.sendVerificationEmail('test@example.com', 'test-token', 'John Doe');

      expect(result).toBe(false);
    });

    it('should include verification URL in email content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });
      process.env.CLIENT_URL = 'http://localhost:3000';

      await EmailService.sendVerificationEmail('test@example.com', 'test-token');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://localhost:3000/verify-email?token=test-token')
        })
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully with firstName', async () => {
      mockSendMail.mockResolvedValue({ messageId: '456' });

      const result = await EmailService.sendPasswordResetEmail('test@example.com', 'reset-token', 'John Doe');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `${process.env.APP_NAME || 'Volcanion Auth'} - Đặt lại mật khẩu`,
        html: expect.stringContaining('John Doe')
      });
    });

    it('should send password reset email successfully without firstName', async () => {
      mockSendMail.mockResolvedValue({ messageId: '456' });

      const result = await EmailService.sendPasswordResetEmail('test@example.com', 'reset-token');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `${process.env.APP_NAME || 'Volcanion Auth'} - Đặt lại mật khẩu`,
        html: expect.stringContaining('bạn')
      });
    });

    it('should return false when sending password reset email fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Send failed'));

      const result = await EmailService.sendPasswordResetEmail('test@example.com', 'reset-token', 'John Doe');

      expect(result).toBe(false);
    });

    it('should include reset URL in email content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '456' });
      process.env.CLIENT_URL = 'http://localhost:3000';

      await EmailService.sendPasswordResetEmail('test@example.com', 'reset-token');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://localhost:3000/reset-password?token=reset-token')
        })
      );
    });
  });

  describe('sendPasswordChangeNotification', () => {
    it('should send password change notification successfully with all parameters', async () => {
      mockSendMail.mockResolvedValue({ messageId: '789' });

      const result = await EmailService.sendPasswordChangeNotification(
        'test@example.com', 
        'John Doe', 
        '192.168.1.1'
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `${process.env.APP_NAME || 'Volcanion Auth'} - Mật khẩu đã được thay đổi`,
        html: expect.stringContaining('John Doe')
      });
      
      // Verify that IP address is included
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('192.168.1.1')
        })
      );
    });

    it('should send password change notification without optional parameters', async () => {
      mockSendMail.mockResolvedValue({ messageId: '789' });

      const result = await EmailService.sendPasswordChangeNotification('test@example.com');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `${process.env.APP_NAME || 'Volcanion Auth'} - Mật khẩu đã được thay đổi`,
        html: expect.stringContaining('bạn')
      });
    });

    it('should return false when sending password change notification fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Send failed'));

      const result = await EmailService.sendPasswordChangeNotification('test@example.com');

      expect(result).toBe(false);
    });

    it('should include current time in notification', async () => {
      mockSendMail.mockResolvedValue({ messageId: '789' });

      await EmailService.sendPasswordChangeNotification('test@example.com');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Thời gian:')
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully with firstName', async () => {
      mockSendMail.mockResolvedValue({ messageId: '101' });

      const result = await EmailService.sendWelcomeEmail('test@example.com', 'John Doe');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `Chào mừng đến với ${process.env.APP_NAME || 'Volcanion Auth'}!`,
        html: expect.stringContaining('John Doe')
      });
    });

    it('should send welcome email successfully without firstName', async () => {
      mockSendMail.mockResolvedValue({ messageId: '101' });

      const result = await EmailService.sendWelcomeEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"${process.env.APP_NAME || 'Volcanion Auth'}" <${process.env.EMAIL_FROM}>`,
        to: 'test@example.com',
        subject: `Chào mừng đến với ${process.env.APP_NAME || 'Volcanion Auth'}!`,
        html: expect.stringContaining('bạn')
      });
    });

    it('should return false when sending welcome email fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Send failed'));

      const result = await EmailService.sendWelcomeEmail('test@example.com', 'John Doe');

      expect(result).toBe(false);
    });

    it('should include client URL when available', async () => {
      mockSendMail.mockResolvedValue({ messageId: '101' });
      process.env.CLIENT_URL = 'http://localhost:3000';

      await EmailService.sendWelcomeEmail('test@example.com');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://localhost:3000')
        })
      );
    });
  });

  describe('testEmailConfig', () => {
    it('should return true when email configuration is valid', async () => {
      mockVerify.mockResolvedValue(true);

      const result = await EmailService.testEmailConfig();

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
    });

    it('should return false when email configuration is invalid', async () => {
      mockVerify.mockRejectedValue(new Error('Config error'));

      const result = await EmailService.testEmailConfig();

      expect(result).toBe(false);
      expect(mockVerify).toHaveBeenCalled();
    });
  });
});
