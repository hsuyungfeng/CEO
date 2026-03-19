import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: Prisma.SupplierInvoiceWhereInput = {
      supplierId: supplier.id,
    };

    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplierInvoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices.map(i => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        type: i.type,
        amount: i.amount,
        tax: i.tax,
        totalAmount: i.totalAmount,
        billingMonth: i.billingMonth,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
        status: i.status,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        note: i.note,
        createdAt: i.createdAt,
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
    console.error('取得供應商帳單錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
