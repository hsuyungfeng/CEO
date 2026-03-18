import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * Input sanitization and validation utilities
 * Prevents XSS, SQL injection, and other common attacks
 */

/**
 * Sanitize string input - remove potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return (
    input
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      // Encode special characters
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Trim whitespace
      .trim()
  );
}

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('無效的電子郵件格式')
  .toLowerCase()
  .max(255, '電子郵件過長')
  .transform(sanitizeString);

/**
 * Strong password validation
 */
export const passwordSchema = z
  .string()
  .min(8, '密碼必須至少 8 個字符')
  .max(128, '密碼過長')
  .regex(/[A-Z]/, '密碼必須包含大寫字母')
  .regex(/[a-z]/, '密碼必須包含小寫字母')
  .regex(/[0-9]/, '密碼必須包含數字')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, '密碼必須包含特殊字符');

/**
 * Username/Name validation
 */
export const nameSchema = z
  .string()
  .min(2, '名稱必須至少 2 個字符')
  .max(100, '名稱過長')
  .regex(/^[a-zA-Z0-9\u4e00-\u9fff\s-]*$/, '名稱包含無效字符')
  .transform(sanitizeString);

/**
 * Phone number validation (basic)
 */
export const phoneSchema = z
  .string()
  .regex(/^[0-9\s+\-()]*$/, '電話號碼包含無效字符')
  .min(7, '電話號碼過短')
  .max(20, '電話號碼過長')
  .transform((val) => val.replace(/\s/g, ''));

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url('無效的 URL')
  .max(2048, 'URL 過長');

/**
 * Tax ID / Business registration number
 */
export const taxIdSchema = z
  .string()
  .regex(/^[0-9]{8,10}$/, '無效的統一編號')
  .transform(sanitizeString);

/**
 * Search query validation
 */
export const searchQuerySchema = z
  .string()
  .min(1, '搜索查詢不能為空')
  .max(100, '搜索查詢過長')
  .transform(sanitizeString);

/**
 * User registration schema
 */
export const registrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  taxId: taxIdSchema,
  phone: phoneSchema.optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: '必須同意服務條款',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼不匹配',
  path: ['confirmPassword'],
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '密碼不能為空'),
  rememberMe: z.boolean().optional(),
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  address: z
    .string()
    .max(255, '地址過長')
    .transform(sanitizeString)
    .optional(),
  contactPerson: nameSchema.optional(),
});

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = (error.issues && error.issues.length > 0 && error.issues[0]?.message) || '驗證失敗';
      logger.warn({ issues: error.issues }, '輸入驗證失敗');
      return { success: false, error: message };
    }

    logger.error({ error }, '輸入驗證錯誤');
    return { success: false, error: '無效的輸入' };
  }
}

/**
 * SQL injection prevention - check for common patterns
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
    /(\bunion\b|\bor\b|\band\b)\s+1\s*=\s*1/i,
    /(['\"];)\s*(select|insert|update|delete|drop)/i,
    /xp_|sp_|exec|execute/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      logger.warn({ input: input.substring(0, 50) }, 'SQL 注入檢測');
      return true;
    }
  }

  return false;
}

/**
 * XSS injection prevention - check for common patterns
 */
export function detectXSSInjection(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      logger.warn({ input: input.substring(0, 50) }, 'XSS 注入檢測');
      return true;
    }
  }

  return false;
}
