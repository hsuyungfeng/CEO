import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // 驗證使用者是否已登入
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    // 取得使用者資料
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        member: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '使用者不存在' },
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

    // 準備回傳的使用者資料（排除密碼）
    const userData = {
      id: user.id,
      name: user.name,
      taxId: user.taxId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      member: user.member,
    };

    return NextResponse.json(
      { user: userData },
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '取得使用者資料錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}