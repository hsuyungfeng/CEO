// Set environment variables before imports
process.env.RESEND_API_KEY = 'test-api-key';
process.env.EMAIL_FROM = 'test@example.com';
process.env.EMAIL_REPLY_TO = 'reply@example.com';

import { EmailService, emailService } from '../service';
import { EMAIL_CONFIG } from '../config';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  describe('sendVerificationEmail', () => {
    it('should generate correct verification email HTML', async () => {
      // Mock the private sendEmail method
      const mockSendEmail = vi.fn().mockResolvedValue({ id: 'test-id' });
      (emailService as any).sendEmail = mockSendEmail;

      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      const token = 'test-token-123';
      const userName = 'John Doe';

      const result = await emailService.sendVerificationEmail('user@example.com', token, userName);

      expect(mockSendEmail).toHaveBeenCalled();
      const callArgs = mockSendEmail.mock.calls[0];
      expect(callArgs[0]).toBe('user@example.com');
      expect(callArgs[1]).toBe(`驗證您的${EMAIL_CONFIG.companyName}帳戶`);
      
      // Check HTML content contains verification link
      const htmlContent = callArgs[2];
      expect(htmlContent).toContain('驗證您的帳戶');
      expect(htmlContent).toContain('親愛的 John Doe');
      expect(htmlContent).toContain('http://localhost:3000/auth/verify-email?token=test-token-123');
      expect(htmlContent).toContain('驗證電子郵件');
      expect(htmlContent).toContain('此驗證連結將在');

      expect(result).toEqual({ id: 'test-id' });
    });

    it('should generate verification email HTML without user name', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ id: 'test-id' });
      (emailService as any).sendEmail = mockSendEmail;

      await emailService.sendVerificationEmail('user@example.com', 'test-token');

      const htmlContent = mockSendEmail.mock.calls[0][2];
      expect(htmlContent).toContain('親愛的 用戶');
    });
  });

  describe('sendTwoFactorCode', () => {
    it('should generate correct two-factor authentication email HTML', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ id: 'test-id' });
      (emailService as any).sendEmail = mockSendEmail;

      const code = '123456';

      const result = await emailService.sendTwoFactorCode('user@example.com', code);

      expect(mockSendEmail).toHaveBeenCalled();
      const callArgs = mockSendEmail.mock.calls[0];
      expect(callArgs[0]).toBe('user@example.com');
      expect(callArgs[1]).toBe(`您的${EMAIL_CONFIG.companyName}驗證碼`);
      
      const htmlContent = callArgs[2];
      expect(htmlContent).toContain('驗證碼');
      expect(htmlContent).toContain('1 2 3 4 5 6');
      expect(htmlContent).toContain('此驗證碼將在');

      expect(result).toEqual({ id: 'test-id' });
    });
  });

  describe('sendResetPasswordEmail', () => {
    it('should generate correct reset password email HTML', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ id: 'test-id' });
      (emailService as any).sendEmail = mockSendEmail;

      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      const token = 'reset-token-123';
      const userName = 'John Doe';

      const result = await emailService.sendResetPasswordEmail('user@example.com', token, userName);

      expect(mockSendEmail).toHaveBeenCalled();
      const callArgs = mockSendEmail.mock.calls[0];
      expect(callArgs[0]).toBe('user@example.com');
      expect(callArgs[1]).toBe(`重設您的${EMAIL_CONFIG.companyName}密碼`);
      
      const htmlContent = callArgs[2];
      expect(htmlContent).toContain('重設您的密碼');
      expect(htmlContent).toContain('親愛的 John Doe');
      expect(htmlContent).toContain('http://localhost:3000/auth/reset-password?token=reset-token-123');
      expect(htmlContent).toContain('重設密碼');
      expect(htmlContent).toContain('此重設連結將在');

      expect(result).toEqual({ id: 'test-id' });
    });

    it('should generate reset password email HTML without user name', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ id: 'test-id' });
      (emailService as any).sendEmail = mockSendEmail;

      await emailService.sendResetPasswordEmail('user@example.com', 'reset-token');

      const htmlContent = mockSendEmail.mock.calls[0][2];
      expect(htmlContent).toContain('親愛的 用戶');
    });
  });
});

describe('emailService instance', () => {
  it('should export a singleton instance', () => {
    expect(emailService).toBeInstanceOf(EmailService);
  });
});