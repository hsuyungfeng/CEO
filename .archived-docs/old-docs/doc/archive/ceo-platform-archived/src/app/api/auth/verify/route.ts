// apps/web/src/app/api/auth/email/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z, ZodError } from 'zod';
import { trackVerificationAttempt, resetVerificationAttempts } from '@/lib/email-verification';
import { logger } from '@/lib/logger';

const verifySchema = z.object({
  token: z.string().min(1, '驗證碼不能為空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verifySchema.parse(body);

    // 查找驗證記錄
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      logger.warn({ token }, '驗證失敗：無效的驗證連結');
      return NextResponse.json(
        { error: '無效的驗證連結' },
        { status: 400 }
      );
    }

    // 檢查是否過期
    if (verification.expiresAt < new Date()) {
      // Track failed attempt
      try {
        await trackVerificationAttempt(verification.email);
      } catch (attemptError) {
        logger.warn({ email: verification.email, token }, '驗證失敗：驗證碼已過期');
        return NextResponse.json(
          { error: '驗證嘗試次數過多，請稍後再試' },
          { status: 429 }
        );
      }

      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });

      logger.warn({ email: verification.email, token }, '驗證失敗：驗證碼已過期');
      return NextResponse.json(
        { error: '驗證連結已過期' },
        { status: 400 }
      );
    }

    // 根據用途處理
    switch (verification.purpose) {
      case 'VERIFY_EMAIL':
        if (verification.user) {
          // 更新用戶郵件驗證狀態
          await prisma.user.update({
            where: { id: verification.user.id },
            data: { emailVerified: true },
          });
        }
        break;

      case 'RESET_PASSWORD':
        // 重設密碼流程需要額外步驟
        break;

      default:
        break;
    }

    // 刪除已使用的驗證記錄
    await prisma.emailVerification.delete({
      where: { id: verification.id },
    });

    // Reset attempts on successful verification
    await resetVerificationAttempts(verification.email);

    logger.info(
      { email: verification.email, purpose: verification.purpose, userId: verification.userId },
      '郵件驗證成功'
    );

    return NextResponse.json({
      message: '郵件驗證成功',
      purpose: verification.purpose,
      userId: verification.userId,
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
    logger.error({ err: error }, '郵件驗證失敗');
    return NextResponse.json(
      { error: '郵件驗證失敗' },
      { status: 500 }
    );
  }
}