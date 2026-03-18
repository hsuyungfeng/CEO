import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// 密碼重置請求驗證 schema
const resetRequestSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證請求資料
    const validationResult = resetRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: '驗證失敗', errors },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // 查找使用者
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 無論使用者是否存在，都回傳相同訊息（安全性考量）
    if (!user) {
      return NextResponse.json(
        { message: '如果您的電子郵件地址已註冊，您將收到密碼重置連結' },
        { status: 200 }
      );
    }

    // 檢查使用者狀態
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: '如果您的電子郵件地址已註冊，您將收到密碼重置連結' },
        { status: 200 }
      );
    }

    // 生成重置令牌
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小時後過期

    // 儲存令牌到資料庫
    await prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        token,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    // 生成重置連結
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    // 發送重置郵件（模擬）
    console.log('========================================');
    console.log('📧 密碼重置郵件');
    console.log('收件人:', user.email);
    console.log('重置連結:', resetUrl);
    console.log('令牌將於 1 小時後過期');
    console.log('========================================');

    return NextResponse.json(
      { message: '如果您的電子郵件地址已註冊，您將收到密碼重置連結' },
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '密碼重置請求錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
