import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// 查詢參數驗證 schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
});

// 取得付款記錄列表
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

    const { searchParams } = new URL(request.url);
    
    // 解析和驗證查詢參數
    const queryParams = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '無效的查詢參數', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, status } = validationResult.data;
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    // 查詢付款記錄
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              totalAmount: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    // 格式化回應資料
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      amount: payment.amount,
      currency: payment.currency,
      gateway: payment.gateway,
      gatewayTransactionId: payment.gatewayTransactionId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));

    return NextResponse.json({
      data: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    logger.error({ err: error }, '取得付款記錄列表錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}