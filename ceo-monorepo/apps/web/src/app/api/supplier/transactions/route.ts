import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, SupplierTransactionType } from '@prisma/client';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '請先登入帳號' },
        { status: 401 }
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: {
        mainAccountId: session.user.id,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: '您還不是供應商' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');

    const skip = (page - 1) * limit;

    const where: Prisma.SupplierTransactionWhereInput = {
      supplierId: supplier.id,
    };

    if (type) {
      where.type = type as SupplierTransactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.supplierTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplierTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        orderId: t.orderId,
        invoiceId: t.invoiceId,
        note: t.note,
        createdAt: t.createdAt,
      })),
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
    console.error('取得交易記錄錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
