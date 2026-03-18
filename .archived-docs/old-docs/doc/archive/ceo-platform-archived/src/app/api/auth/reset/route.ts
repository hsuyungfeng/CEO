// apps/web/src/app/api/auth/email/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const resetSchema = z.object({
  token: z.string().min(1, '驗證碼不能為空'),
  newPassword: z.string().min(6, '密碼至少6個字元'),
  confirmPassword: z.string().min(6, '確認密碼至少6個字元'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: '密碼和確認密碼不一致',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = resetSchema.parse(body);

    // 查找驗證記錄
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: '無效的重設密碼連結' },
        { status: 400 }
      );
    }

    // 檢查是否過期
    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      return NextResponse.json(
        { error: '重設密碼連結已過期' },
        { status: 400 }
      );
    }

    // 檢查用途
    if (verification.purpose !== 'RESET_PASSWORD') {
      return NextResponse.json(
        { error: '無效的重設密碼連結' },
        { status: 400 }
      );
    }

    // 檢查用戶是否存在
    if (!verification.user) {
      return NextResponse.json(
        { error: '找不到對應的用戶' },
        { status: 404 }
      );
    }

    // 更新用戶密碼
    const hashedPassword = await hash(newPassword, 10);
    await prisma.user.update({
      where: { id: verification.user.id },
      data: { 
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 刪除所有該用戶的Session
    await prisma.session.deleteMany({
      where: { userId: verification.user.id },
    });

    // 刪除已使用的驗證記錄
    await prisma.emailVerification.delete({
      where: { id: verification.id },
    });

    return NextResponse.json({
      message: '密碼重設成功',
      userId: verification.userId,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: '重設密碼失敗' },
      { status: 500 }
    );
  }
}