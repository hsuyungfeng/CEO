import { Resend } from 'resend';

// 延遲初始化 Resend 實例，避免啟動時驗證 API key
let resendInstance: Resend | null = null;

function initResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY || 're_test_placeholder';
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// 導出 getter 而非直接實例
export { initResend };

// 向後相容性：延遲導出 resend
export const resend = (() => {
  try {
    return initResend();
  } catch {
    // 如果初始化失敗，返回 null 並在使用時檢查
    return null;
  }
})() as any;

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@ceo-buy.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@ceo-buy.com',
  companyName: 'CEO團購平台',
} as const;

export const EMAIL_TEMPLATES = {
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  TWO_FACTOR_AUTH: 'two-factor-auth',
  WELCOME: 'welcome',
  ORDER_CONFIRMATION: 'order-confirmation',
} as const;