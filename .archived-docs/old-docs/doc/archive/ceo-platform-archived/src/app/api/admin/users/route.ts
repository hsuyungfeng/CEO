import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { UserQuerySchema, ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

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
    logger.error({ err: error }, '取得會員列表錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}