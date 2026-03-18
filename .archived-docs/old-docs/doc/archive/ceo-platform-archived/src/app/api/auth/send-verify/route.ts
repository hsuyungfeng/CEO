// apps/web/src/app/api/auth/email/send-verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email/service';
import { z, ZodError } from 'zod';
import { randomBytes } from 'crypto';
import { emailRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

const sendVerifySchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  purpose: z.enum(['VERIFY_EMAIL', 'RESET_PASSWORD', 'CHANGE_EMAIL', 'TWO_FACTOR_AUTH']).optional(),
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
    const { email, purpose = 'VERIFY_EMAIL' } = sendVerifySchema.parse(body);

    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limiting
    const rateLimit = emailRateLimiter.check(`send-verify:${ip}`);
    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      logger.warn(
        { email, ip, resetIn },
        '驗證碼發送頻率限制'
      );
      return NextResponse.json(
        {
          error: `發送過於頻繁，請在 ${resetIn} 秒後重試`,
          retryAfter: resetIn,
        },
        { status: 429 }
      );
    }

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 如果是驗證郵件但用戶不存在，返回錯誤
    if (purpose === 'VERIFY_EMAIL' && !user) {
      return NextResponse.json(
        { error: '找不到使用此郵件的用戶' },
        { status: 404 }
      );
    }

    // 生成驗證Token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小時有效

    // 刪除舊的驗證記錄
    await prisma.emailVerification.deleteMany({
      where: { email },
    });

    // 創建新的驗證記錄
    const verification = await prisma.emailVerification.create({
      data: {
        email,
        token,
        expiresAt,
        purpose,
        userId: user?.id,
      },
    });

    // 發送郵件
    if (purpose === 'VERIFY_EMAIL' && user) {
      await emailService.sendVerificationEmail(email, token, user.name ?? undefined);
    } else if (purpose === 'RESET_PASSWORD') {
      await emailService.sendResetPasswordEmail(email, token, user?.name ?? undefined);
    }

    logger.info(
      { email, ip, purpose, remaining: rateLimit.remaining },
      '驗證碼發送成功'
    );

    return NextResponse.json({
      message: '驗證郵件已發送',
      expiresAt: verification.expiresAt,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: '無效的 JSON 格式' },
        { status: 400 }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: '無效的請求參數', details: error.issues },
        { status: 400 }
      );
    }
    logger.error({ err: error, email: body?.email }, '發送驗證碼錯誤');
    return NextResponse.json(
      { error: '發送驗證郵件失敗' },
      { status: 500 }
    );
  }
}