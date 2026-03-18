import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 模擬支付閘道 webhook（用於測試）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 驗證 webhook 簽名（模擬）
    const signature = request.headers.get('x-mock-signature');
    if (!signature || signature !== 'MOCK_SIGNATURE') {
      logger.warn({ body }, '無效的 webhook 簽名');
      return NextResponse.json(
        { error: '無效簽名' },
        { status: 401 }
      );
    }

    const { paymentId, status, transactionId, metadata } = body;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // 查詢付款記錄
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      logger.warn({ paymentId }, '付款記錄不存在');
      return NextResponse.json(
        { error: '付款記錄不存在' },
        { status: 404 }
      );
    }

    // 檢查付款狀態是否已處理
    if (payment.status !== 'PENDING') {
      logger.info({ paymentId, currentStatus: payment.status }, '付款狀態已更新，忽略 webhook');
      return NextResponse.json(
        { message: '付款狀態已更新' },
        { status: 200 }
      );
    }

    // 更新付款記錄
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          gateway: 'MOCK',
          gatewayTransactionId: transactionId || `MOCK_${Date.now()}`,
          metadata: metadata || { webhook: true, receivedAt: new Date() },
        },
      });

      // 如果付款成功，更新訂單狀態
      if (status === 'SUCCESS') {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'CONFIRMED',
          },
        });

        // 更新發票狀態為 ISSUED
        await tx.invoice.updateMany({
          where: { orderId: payment.orderId },
          data: {
            status: 'ISSUED',
            invoiceNumber: `INV${Date.now().toString().slice(-8)}`,
            invoiceDate: new Date(),
            issuedAt: new Date(),
          },
        });

        // 更新物流狀態為 PREPARING
        await tx.shipping.updateMany({
          where: { orderId: payment.orderId },
          data: {
            status: 'PREPARING',
          },
        });
      }

      return paymentUpdate;
    });

    logger.info({ paymentId, status }, 'webhook 處理成功');

    return NextResponse.json({
      message: 'Webhook 處理成功',
      data: {
        id: updatedPayment.id,
        status: updatedPayment.status,
      },
    });

  } catch (error) {
    logger.error({ err: error }, 'webhook 處理錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}