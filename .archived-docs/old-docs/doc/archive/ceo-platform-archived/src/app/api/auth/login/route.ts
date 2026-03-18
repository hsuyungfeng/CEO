import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { signIn } from '@/auth';
import { logger } from '@/lib/logger'

// 登入請求驗證 schema
const loginSchema = z.object({
  identifier: z.string().min(1, '請輸入電子郵件或手機號碼'),
  password: z.string().min(1, '密碼不能為空'),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 驗證請求資料
    const validationResult = loginSchema.safeParse(body);
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

    const { identifier, password, rememberMe } = validationResult.data;

    // 查找使用者 (支援電子郵件或手機號碼)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      },
      include: {
        member: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: '帳號或密碼錯誤' },
        { status: 401 }
      );
    }

    // 檢查使用者狀態
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '帳號已被停用，請聯絡管理員' },
        { status: 403 }
      );
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '帳號或密碼錯誤' },
        { status: 401 }
      );
    }

    // 使用 NextAuth.js v5 進行登入
    try {
      const result = await signIn('credentials', {
        redirect: false,
        identifier,
        password,
      });

      if (result?.error) {
        return NextResponse.json(
          { error: '登入失敗，請稍後再試' },
          { status: 500 }
        );
      }

      // 更新最後登入時間
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

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
        { 
          message: '登入成功',
          user: userData,
        },
        { 
          status: 200,
          headers: {
            // 設定 Session Cookie
            'Set-Cookie': `next-auth.session-token=${result?.session?.sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${rememberMe ? 'Max-Age=2592000' : ''}`,
          },
        }
      );

    } catch (authError) {
      logger.error({ err: authError }, 'NextAuth 登入錯誤');
      return NextResponse.json(
        { error: '認證系統錯誤，請稍後再試' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error({ err: error }, '登入錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}