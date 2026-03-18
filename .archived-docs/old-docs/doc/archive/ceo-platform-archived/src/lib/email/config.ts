import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

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