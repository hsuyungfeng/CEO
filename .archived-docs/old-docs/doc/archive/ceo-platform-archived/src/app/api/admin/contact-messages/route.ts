import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse } from '@/types/admin';
import { contactMessageQuerySchema } from './schema';
import { logger } from '@/lib/logger'

// GET: 獲取聯絡訊息列表
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 解析查詢參數
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // 驗證查詢參數
    const validationResult = contactMessageQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: '查詢參數驗證失敗',
          errors,
        } as ApiResponse,
        { status: 400 }
      );
    }

    const { page, limit, search, isRead, startDate, endDate } = validationResult.data;
    const skip = (page - 1) * limit;

    // 構建查詢條件
    const where: any = {};

    // 搜索條件（姓名、Email、電話、主題、訊息）
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 已讀狀態篩選
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // 時間範圍篩選
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 查詢聯絡訊息
    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.contactMessage.count({ where }),
    ]);

    // 計算未讀數量
    const unreadCount = await prisma.contactMessage.count({
      where: { ...where, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
        stats: {
          total,
          unread: unreadCount,
          read: total - unreadCount,
        },
      },
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '取得聯絡訊息列表錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}