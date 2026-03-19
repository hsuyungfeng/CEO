import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { UserQuerySchema, ApiResponse } from '@/types/admin';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createMemberSchema = z.object({
  taxId: z.string().length(8, '統一編號必須是8位數字').regex(/^\d+$/, '統一編號必須是數字'),
  name: z.string().min(1, '公司名稱不能為空'),
  email: z.string().email('Email 格式不正確'),
  password: z.string().min(6, '密碼至少6位'),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { searchParams } = new URL(request.url);
    
    // 解析和驗證查詢參數
    const queryParams = UserQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      role: searchParams.get('role') || undefined,
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryParams.success) {
      return NextResponse.json(
        {
          success: false,
          error: '查詢參數驗證失敗',
          errors: queryParams.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        } as ApiResponse,
        { status: 400 }
      );
    }

    const { page, limit, search, status, role, sortBy, sortOrder } = queryParams.data;
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = {};

    // 搜尋條件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 狀態條件
    if (status) {
      where.status = status;
    }

    // 角色條件
    if (role) {
      where.role = role;
    } else {
      // 默認只查詢會員
      where.role = 'MEMBER';
    }

    // 查詢會員
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderNo: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // 格式化響應數據
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      taxId: user.taxId,
      phone: user.phone,
      address: user.address,
      contactPerson: user.contactPerson,
      points: user.points,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      orderCount: user.orders.length,
      recentOrders: user.orders,
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    } as ApiResponse);

  } catch (error) {
    console.error('取得會員列表錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) return adminCheck.error;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: '無效的請求格式' }, { status: 400 });
    }

    const validation = createMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: '資料驗證失敗', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { taxId, name, email, password, phone, address, contactPerson } = validation.data;

    // 檢查重複
    const existing = await prisma.user.findFirst({
      where: { OR: [{ taxId }, { email }] },
    });
    if (existing) {
      const field = existing.taxId === taxId ? '統一編號' : 'Email';
      return NextResponse.json({ success: false, error: `${field} 已存在` }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        taxId,
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        address: address || null,
        contactPerson: contactPerson || null,
        role: 'MEMBER',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        taxId: user.taxId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('新增企業會員錯誤:', error);
    return NextResponse.json({ success: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 });
  }
}