import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// 更新發票載具的 schema
const updateCarrierSchema = z.object({
  carrierType: z.string().min(1, '載具類型不能為空'),
  carrierId: z.string().min(1, '載具編號不能為空'),
});

// 取得單筆發票
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證使用者是否已登入
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 查詢發票
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            createdAt: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '發票不存在' },
        { status: 404 }
      );
    }

    // 檢查權限（只能查看自己的發票）
    if (invoice.userId !== session.user.id) {
      return NextResponse.json(
        { error: '無權限查看此發票' },
        { status: 403 }
      );
    }

    // 格式化回應資料
    const formattedInvoice = {
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
      orderItems: invoice.order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        unit: item.product.unit,
      })),
    };

    return NextResponse.json({
      data: formattedInvoice,
    });

  } catch (error) {
    logger.error({ err: error }, '取得發票錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 更新發票載具（手機條碼、自然人憑證等）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證使用者是否已登入
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 查詢發票
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '發票不存在' },
        { status: 404 }
      );
    }

    // 檢查權限
    if (invoice.userId !== session.user.id) {
      return NextResponse.json(
        { error: '無權限更新此發票' },
        { status: 403 }
      );
    }

    // 檢查發票狀態（只有 PENDING 或 ISSUED 狀態可以更新載具）
    if (invoice.status !== 'PENDING' && invoice.status !== 'ISSUED') {
      return NextResponse.json(
        { error: `發票狀態為 ${invoice.status}，無法更新載具` },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // 驗證請求資料
    const validationResult = updateCarrierSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '驗證失敗', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { carrierType, carrierId } = validationResult.data;

    // 更新發票載具
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        carrierType,
        carrierId,
      },
    });

    return NextResponse.json({
      message: '發票載具更新成功',
      data: {
        id: updatedInvoice.id,
        carrierType: updatedInvoice.carrierType,
        carrierId: updatedInvoice.carrierId,
      },
    });

  } catch (error) {
    logger.error({ err: error }, '更新發票載具錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}