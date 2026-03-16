import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    // 🔓 測試模式：返回管理員資訊
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        user: {
          id: 'test-admin-id',
          email: 'test@admin.com',
          name: '管理員',
          taxId: '88888888',
          role: 'ADMIN',
          status: 'ACTIVE',
        }
      });
    }

    // 使用統一的 auth helper 驗證使用者（支援 Bearer Token 和 Session Cookies）
    const authData = await getAuthData(request);

    if (!authData?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    // 取得使用者資料（authData 已經包含使用者，但我們需要最新的資料）
    const user = await prisma.user.findUnique({
      where: { id: authData.user.id },
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
    console.error('取得使用者資料錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}