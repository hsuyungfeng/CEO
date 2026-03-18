import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// 密碼重置驗證 schema
const resetVerifySchema = z.object({
  token: z.string().min(1, '令牌不能為空'),
  newPassword: z.string().min(6, '密碼至少需要6位'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 驗證請求資料
    const validationResult = resetVerifySchema.safeParse(body);
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

    const { token, newPassword } = validationResult.data;

    // 查找有效的令牌
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        token,
        type: 'PASSWORD_RESET',
        expiresAt: {
          gt: new Date(), // 尚未過期
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: '無效或已過期的重置令牌' },
        { status: 400 }
      );
    }

    // 查找使用者
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: '找不到使用者' },
        { status: 404 }
      );
    }

    // 檢查使用者狀態
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '帳號已被停用，請聯絡管理員' },
        { status: 403 }
      );
    }

    // 加密新密碼
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新使用者密碼
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // 刪除已使用的令牌
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    // 刪除該使用者的其他密碼重置令牌（清理舊令牌）
    await prisma.emailVerificationToken.deleteMany({
      where: {
        email: user.email,
        type: 'PASSWORD_RESET',
      },
    });

    logger.info({ userId: user.id }, '使用者密碼已重置');

    return NextResponse.json(
      { message: '密碼重置成功，請使用新密碼登入' },
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '密碼重置驗證錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
