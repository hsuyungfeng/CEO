import { resend, EMAIL_CONFIG } from './config';
import { logger } from '@/lib/logger';
import {
  createVerificationEmailTemplate,
  createResetPasswordEmailTemplate,
  createTwoFactorEmailTemplate,
  createWelcomeEmailTemplate,
} from './templates';

export class EmailService {
  private baseTemplateProps = {
    companyName: EMAIL_CONFIG.companyName,
    supportEmail: EMAIL_CONFIG.replyTo,
    year: new Date().getFullYear(),
  };

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
        replyTo: EMAIL_CONFIG.replyTo,
      });

      if (error) {
        logger.error({ error, to, subject }, '郵件發送失敗');
        throw new Error(`郵件發送失敗: ${error.message}`);
      }

      logger.info({ to, subject, messageId: data?.id }, '郵件發送成功');
      return data;
    } catch (error) {
      logger.error({ err: error, to, subject }, '郵件服務錯誤');
      // 開發環境或測試環境：記錄但不拋出錯誤
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.info({ to, subject, env: process.env.NODE_ENV }, '郵件模擬發送');
        return { id: `${process.env.NODE_ENV}-mock-id` };
      }
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string, userName?: string) {
    const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    const html = createVerificationEmailTemplate({
      ...this.baseTemplateProps,
      userName,
      verificationLink,
      expiryHours: 24,
    });

    return this.sendEmail(
      email,
      `驗證您的${EMAIL_CONFIG.companyName}帳戶`,
      html
    );
  }

  async sendTwoFactorCode(email: string, code: string) {
    const html = createTwoFactorEmailTemplate({
      ...this.baseTemplateProps,
      code,
      expiryMinutes: 10,
    });

    return this.sendEmail(
      email,
      `您的${EMAIL_CONFIG.companyName}驗證碼`,
      html
    );
  }

  async sendResetPasswordEmail(email: string, token: string, userName?: string) {
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
    const html = createResetPasswordEmailTemplate({
      ...this.baseTemplateProps,
      userName,
      resetLink,
      expiryMinutes: 60,
    });

    return this.sendEmail(
      email,
      `重設您的${EMAIL_CONFIG.companyName}密碼`,
      html
    );
  }

  async sendWelcomeEmail(email: string, userName?: string) {
    const dashboardLink = `${process.env.NEXTAUTH_URL}/dashboard`;
    const html = createWelcomeEmailTemplate({
      ...this.baseTemplateProps,
      userName,
      dashboardLink,
    });

    return this.sendEmail(
      email,
      `歡迎加入${EMAIL_CONFIG.companyName}`,
      html
    );
  }
}

export const emailService = new EmailService();
