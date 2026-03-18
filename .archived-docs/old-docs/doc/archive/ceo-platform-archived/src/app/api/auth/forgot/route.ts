// apps/web/src/app/api/auth/email/forgot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email/service';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const forgotSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotSchema.parse(body);

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 為了安全，即使用戶不存在也返回成功
      return NextResponse.json({
        message: '如果該郵件存在於我們的系統中，重設密碼連結將發送到您的郵件',
      });
    }

    // 生成重設Token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1小時有效

    // 刪除舊的重設記錄
    await prisma.emailVerification.deleteMany({
      where: { 
        email,
        purpose: 'RESET_PASSWORD',
      },
    });

    // 創建新的重設記錄
    const verification = await prisma.emailVerification.create({
      data: {
        email,
        token,
        expiresAt,
        purpose: 'RESET_PASSWORD',
        userId: user.id,
      },
    });

    // 發送重設密碼郵件
    await emailService.sendResetPasswordEmail(email, token, user.name ?? undefined);

    return NextResponse.json({
      message: '重設密碼連結已發送到您的郵件',
      expiresAt: verification.expiresAt,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: '發送重設密碼連結失敗' },
      { status: 500 }
    );
  }
}