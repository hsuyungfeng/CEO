import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    // 使用統一的認證 helper
    const authData = await getAuthData(request);

    if (!authData) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const { userId } = authData;

    // 從資料庫查詢完整使用者資料（包含 member）
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxId: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        member: {
          select: {
            points: true,
            totalSpent: true,
            lastPurchaseAt: true,
          }
        }
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: '使用者不存在' },
        { status: 404 }
      );
    }

    // 檢查使用者狀態
    if (dbUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '帳號已被停用，請聯絡管理員' },
        { status: 403 }
      );
    }

    // 準備回傳的使用者資料
    const userData = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || null,
      address: dbUser.address || null,
      taxId: dbUser.taxId,
      role: dbUser.role,
      status: dbUser.status,
      emailVerified: dbUser.emailVerified,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt || null,
      lastLoginAt: dbUser.lastLoginAt || null,
      member: dbUser.member,
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
