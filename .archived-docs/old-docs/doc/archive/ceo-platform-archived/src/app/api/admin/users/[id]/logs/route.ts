import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { id } = await params;

    // 檢查會員是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '會員不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // 解析查詢參數
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action');
    
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = { userId: id };
    if (action) {
      where.action = action;
    }

    // 查詢操作日誌
    const [logs, total] = await Promise.all([
      prisma.userLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userLog.count({ where }),
    ]);

    // 格式化響應數據
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      oldValue: log.oldValue,
      newValue: log.newValue,
      reason: log.reason,
      metadata: log.metadata,
      createdAt: log.createdAt,
      admin: log.admin,
    }));

    return NextResponse.json({
      success: true,
      data: formattedLogs,
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
    logger.error({ err: error }, '取得操作日誌錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}