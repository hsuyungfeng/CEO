import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger'

// 註冊請求驗證 schema
const registerSchema = z.object({
  name: z.string().min(1, '公司名稱不能為空'),
  taxId: z.string().length(8, '統一編號必須是8位數字').regex(/^\d+$/, '統一編號必須是數字'),
  email: z.string().email('請輸入有效的電子郵件'),
  phone: z.string().optional(),
  password: z.string().min(6, '密碼至少需要6位'),
  confirmPassword: z.string().min(6, '確認密碼至少需要6位'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼與確認密碼不符',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 驗證請求資料
    const validationResult = registerSchema.safeParse(body);
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

    const { name, taxId, email, phone, password } = validationResult.data;

    // 檢查統一編號是否已存在
    const existingTaxId = await prisma.user.findUnique({
      where: { taxId },
    });

    if (existingTaxId) {
      return NextResponse.json(
        { error: '統一編號已被使用' },
        { status: 409 }
      );
    }

    // 檢查電子郵件是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: '電子郵件已被使用' },
        { status: 409 }
      );
    }

    // 檢查手機號碼是否已存在
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: '手機號碼已被使用' },
          { status: 409 }
        );
      }
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 12);

    // 建立使用者
    const user = await prisma.user.create({
      data: {
        name,
        taxId,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
        emailVerified: false,
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // 建立會員資料
    await prisma.member.create({
      data: {
        userId: user.id,
        points: 0,
        totalSpent: 0,
        lastPurchaseAt: null,
      },
    });

    return NextResponse.json(
      { 
        message: '註冊成功',
        user,
      },
      { status: 201 }
    );

  } catch (error) {
    logger.error({ err: error }, '註冊錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}