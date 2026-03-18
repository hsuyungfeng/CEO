import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 取得訂單詳情
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 查詢訂單
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                unit: true,
                spec: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            phone: true,
            address: true,
            contactPerson: true,
          },
        },
        payment: true,
        invoice: true,
        shipping: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: '訂單不存在' },
        { status: 404 }
      );
    }

    // 格式化回應資料
    const formattedOrder = {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount,
      note: order.note,
      pointsEarned: order.pointsEarned,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.image,
        productUnit: item.product.unit,
        productSpec: item.product.spec,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      payment: order.payment ? {
        id: order.payment.id,
        status: order.payment.status,
        paymentMethod: order.payment.paymentMethod,
        amount: order.payment.amount,
        currency: order.payment.currency,
        gateway: order.payment.gateway,
        gatewayTransactionId: order.payment.gatewayTransactionId,
        createdAt: order.payment.createdAt,
        updatedAt: order.payment.updatedAt,
      } : null,
      invoice: order.invoice ? {
        id: order.invoice.id,
        status: order.invoice.status,
        type: order.invoice.type,
        invoiceNumber: order.invoice.invoiceNumber,
        invoiceDate: order.invoice.invoiceDate,
        taxId: order.invoice.taxId,
        buyerName: order.invoice.buyerName,
        buyerAddress: order.invoice.buyerAddress,
        amount: order.invoice.amount,
        taxAmount: order.invoice.taxAmount,
        carrierType: order.invoice.carrierType,
        carrierId: order.invoice.carrierId,
        issuedAt: order.invoice.issuedAt,
        cancelledAt: order.invoice.cancelledAt,
      } : null,
      shipping: order.shipping ? {
        id: order.shipping.id,
        shippingMethod: order.shipping.shippingMethod,
        provider: order.shipping.provider,
        trackingNumber: order.shipping.trackingNumber,
        status: order.shipping.status,
        estimatedDelivery: order.shipping.estimatedDelivery,
        actualDelivery: order.shipping.actualDelivery,
        shippingAddress: order.shipping.shippingAddress,
        receiverName: order.shipping.receiverName,
        receiverPhone: order.shipping.receiverPhone,
        notes: order.shipping.notes,
      } : null,
    };

    return NextResponse.json(formattedOrder);

  } catch (error) {
    logger.error({ err: error }, '取得訂單詳情錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 取消訂單
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // 查詢訂單
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: '訂單不存在' },
        { status: 404 }
      );
    }

    // 檢查訂單狀態是否可以取消
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: '只有待確認的訂單可以取消' },
        { status: 400 }
      );
    }

    // 使用事務取消訂單
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // 更新訂單狀態
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 回補商品銷售量
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            totalSold: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 回扣會員點數和消費總額
      await tx.member.update({
        where: { userId: session.user.id },
        data: {
          points: { decrement: order.pointsEarned },
          totalSpent: { decrement: order.totalAmount },
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({
      message: '訂單已取消',
      order: {
        id: cancelledOrder.id,
        orderNo: cancelledOrder.orderNo,
        status: cancelledOrder.status,
        updatedAt: cancelledOrder.updatedAt,
      },
    });

  } catch (error) {
    logger.error({ err: error }, '取消訂單錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}