import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

// 取得單筆付款記錄
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

    // 查詢付款記錄
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: '付款記錄不存在' },
        { status: 404 }
      );
    }

    // 檢查權限（只能查看自己的付款記錄）
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: '無權限查看此付款記錄' },
        { status: 403 }
      );
    }

    // 格式化回應資料
    const formattedPayment = {
      id: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      amount: payment.amount,
      currency: payment.currency,
      gateway: payment.gateway,
      gatewayTransactionId: payment.gatewayTransactionId,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };

    return NextResponse.json({
      data: formattedPayment,
    });

  } catch (error) {
    logger.error({ err: error }, '取得付款記錄錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 模擬付款處理（用於測試）
export async function POST(
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

    // 查詢付款記錄
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: '付款記錄不存在' },
        { status: 404 }
      );
    }

    // 檢查權限
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: '無權限操作此付款記錄' },
        { status: 403 }
      );
    }

    // 檢查付款狀態（只能處理 PENDING 狀態）
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `付款狀態為 ${payment.status}，無法處理` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = body.action || 'SUCCESS'; // 預設成功
    
    // 模擬付款處理
    let newStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let gatewayTransactionId = `MOCK_${Date.now()}`;
    
    if (action === 'FAIL') {
      newStatus = 'FAILED';
      gatewayTransactionId = `MOCK_FAILED_${Date.now()}`;
    }

    // 更新付款記錄
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payment.update({
        where: { id },
        data: {
          status: newStatus,
          gateway: 'MOCK',
          gatewayTransactionId,
          metadata: { mock: true, action, processedAt: new Date() },
        },
      });

      // 如果付款成功，更新訂單狀態
      if (newStatus === 'SUCCESS') {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'CONFIRMED', // 訂單確認
          },
        });

        // 更新發票狀態為 ISSUED（模擬開立發票）
        await tx.invoice.updateMany({
          where: { orderId: payment.orderId },
          data: {
            status: 'ISSUED',
            invoiceNumber: `INV${Date.now().toString().slice(-8)}`,
            invoiceDate: new Date(),
            issuedAt: new Date(),
          },
        });

        // 更新物流狀態為 PREPARING（準備出貨）
        await tx.shipping.updateMany({
          where: { orderId: payment.orderId },
          data: {
            status: 'PREPARING',
          },
        });
      }

      return paymentUpdate;
    });

    return NextResponse.json({
      message: `付款${newStatus === 'SUCCESS' ? '成功' : '失敗'}`,
      data: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        gatewayTransactionId: updatedPayment.gatewayTransactionId,
      },
    });

  } catch (error) {
    logger.error({ err: error }, '模擬付款處理錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}