import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  static async sendVerificationEmail(email: string, token: string, firstName?: string): Promise<boolean> {
    try {
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
      const appName = process.env.APP_NAME || 'Volcanion Auth';

      const mailOptions = {
        from: `"${appName}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `${appName} - Xác thực tài khoản`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9fafb; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #4f46e5; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
              .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${appName}</h1>
              </div>
              <div class="content">
                <h2>Chào ${firstName || 'bạn'}!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại ${appName}. Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:</p>
                
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Xác thực Email</a>
                </div>
                
                <p>Hoặc bạn có thể copy và paste đường link sau vào trình duyệt:</p>
                <p style="background-color: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">
                  ${verificationUrl}
                </p>
                
                <p><strong>Lưu ý:</strong> Link xác thực này sẽ hết hạn sau 24 giờ.</p>
                
                <p>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
              </div>
              <div class="footer">
                <p>© 2025 ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, token: string, firstName?: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      const appName = process.env.APP_NAME || 'Volcanion Auth';

      const mailOptions = {
        from: `"${appName}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `${appName} - Đặt lại mật khẩu`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9fafb; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #dc2626; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
              .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
              .warning { 
                background-color: #fef3c7; 
                border: 1px solid #f59e0b; 
                padding: 15px; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${appName}</h1>
                <h2>Đặt lại mật khẩu</h2>
              </div>
              <div class="content">
                <h2>Chào ${firstName || 'bạn'}!</h2>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào nút bên dưới để tiến hành đặt lại mật khẩu:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
                </div>
                
                <p>Hoặc bạn có thể copy và paste đường link sau vào trình duyệt:</p>
                <p style="background-color: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">
                  ${resetUrl}
                </p>
                
                <div class="warning">
                  <strong>⚠️ Lưu ý bảo mật:</strong>
                  <ul>
                    <li>Link này chỉ có hiệu lực trong 1 giờ</li>
                    <li>Chỉ sử dụng link này nếu bạn thực sự yêu cầu đặt lại mật khẩu</li>
                    <li>Không chia sẻ link này với bất kỳ ai</li>
                  </ul>
                </div>
                
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.</p>
              </div>
              <div class="footer">
                <p>© 2025 ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  static async sendPasswordChangeNotification(email: string, firstName?: string, ipAddress?: string): Promise<boolean> {
    try {
      const appName = process.env.APP_NAME || 'Volcanion Auth';
      const currentTime = new Date().toLocaleString('vi-VN');

      const mailOptions = {
        from: `"${appName}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `${appName} - Mật khẩu đã được thay đổi`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9fafb; }
              .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
              .info-box { 
                background-color: #dbeafe; 
                border: 1px solid #3b82f6; 
                padding: 15px; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${appName}</h1>
                <h2>Thông báo thay đổi mật khẩu</h2>
              </div>
              <div class="content">
                <h2>Chào ${firstName || 'bạn'}!</h2>
                <p>Mật khẩu tài khoản của bạn đã được thay đổi thành công.</p>
                
                <div class="info-box">
                  <strong>Thông tin chi tiết:</strong>
                  <ul>
                    <li><strong>Thời gian:</strong> ${currentTime}</li>
                    ${ipAddress ? `<li><strong>Địa chỉ IP:</strong> ${ipAddress}</li>` : ''}
                    <li><strong>Email:</strong> ${email}</li>
                  </ul>
                </div>
                
                <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức để bảo vệ tài khoản của bạn.</p>
                
                <p>Để đảm bảo an toàn tài khoản, chúng tôi khuyến nghị:</p>
                <ul>
                  <li>Sử dụng mật khẩu mạnh và duy nhất</li>
                  <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                  <li>Đăng xuất khỏi tất cả thiết bị nếu nghi ngờ tài khoản bị xâm phạm</li>
                </ul>
              </div>
              <div class="footer">
                <p>© 2025 ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password change notification:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(email: string, firstName?: string): Promise<boolean> {
    try {
      const appName = process.env.APP_NAME || 'Volcanion Auth';
      const clientUrl = process.env.CLIENT_URL;

      const mailOptions = {
        from: `"${appName}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Chào mừng đến với ${appName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9fafb; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #10b981; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
              .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Chào mừng đến với ${appName}!</h1>
              </div>
              <div class="content">
                <h2>Chào ${firstName || 'bạn'}!</h2>
                <p>Cảm ơn bạn đã đăng ký và xác thực tài khoản thành công tại ${appName}.</p>
                
                <p>Tài khoản của bạn đã sẵn sàng để sử dụng. Bạn có thể:</p>
                <ul>
                  <li>Đăng nhập vào hệ thống</li>
                  <li>Cập nhật thông tin cá nhân</li>
                  <li>Quản lý cài đặt tài khoản</li>
                  <li>Và nhiều tính năng khác</li>
                </ul>
                
                ${clientUrl ? `
                <div style="text-align: center;">
                  <a href="${clientUrl}" class="button">Truy cập ${appName}</a>
                </div>
                ` : ''}
                
                <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
              </div>
              <div class="footer">
                <p>© 2025 ${appName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  // Test email configuration
  static async testEmailConfig(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }
}
