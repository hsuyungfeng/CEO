import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// 查詢參數驗證 schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ISSUED', 'CANCELLED', 'VOIDED']).optional(),
});

// 取得發票列表
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

    // 查詢發票
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // 格式化回應資料
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      orderId: invoice.orderId,
      orderNo: invoice.order.orderNo,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      type: invoice.type,
      status: invoice.status,
      taxId: invoice.taxId,
      buyerName: invoice.buyerName,
      buyerAddress: invoice.buyerAddress,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      carrierType: invoice.carrierType,
      carrierId: invoice.carrierId,
      issuedAt: invoice.issuedAt,
      cancelledAt: invoice.cancelledAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }));

    return NextResponse.json({
      data: formattedInvoices,
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
    logger.error({ err: error }, '取得發票列表錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}