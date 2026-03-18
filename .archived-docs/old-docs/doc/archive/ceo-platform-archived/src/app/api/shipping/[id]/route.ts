import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// 更新物流狀態的 schema（管理員用）
const updateShippingSchema = z.object({
  status: z.enum(['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED']).optional(),
  trackingNumber: z.string().optional(),
  provider: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// 取得單筆物流記錄
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

    // 查詢物流記錄
    const shipping = await prisma.shipping.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!shipping) {
      return NextResponse.json(
        { error: '物流記錄不存在' },
        { status: 404 }
      );
    }

    // 檢查權限（只能查看自己訂單的物流記錄或管理員）
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    if (!isAdmin && shipping.order.user.id !== session.user.id) {
      return NextResponse.json(
        { error: '無權限查看此物流記錄' },
        { status: 403 }
      );
    }

    // 格式化回應資料
    const formattedShipping = {
      id: shipping.id,
      orderId: shipping.orderId,
      orderNo: shipping.order.orderNo,
      shippingMethod: shipping.shippingMethod,
      provider: shipping.provider,
      trackingNumber: shipping.trackingNumber,
      status: shipping.status,
      estimatedDelivery: shipping.estimatedDelivery,
      actualDelivery: shipping.actualDelivery,
      shippingAddress: shipping.shippingAddress,
      receiverName: shipping.receiverName,
      receiverPhone: shipping.receiverPhone,
      notes: shipping.notes,
      createdAt: shipping.createdAt,
      updatedAt: shipping.updatedAt,
      order: {
        user: shipping.order.user,
      },
    };

    return NextResponse.json({
      data: formattedShipping,
    });

  } catch (error) {
    logger.error({ err: error }, '取得物流記錄錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 更新物流狀態（管理員用）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證使用者是否為管理員
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      return NextResponse.json(
        { error: '需要管理員權限' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 查詢物流記錄
    const shipping = await prisma.shipping.findUnique({
      where: { id },
    });

    if (!shipping) {
      return NextResponse.json(
        { error: '物流記錄不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // 驗證請求資料
    const validationResult = updateShippingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '驗證失敗', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { status, trackingNumber, provider, estimatedDelivery, notes } = validationResult.data;

    // 準備更新資料
    const updateData: any = {};
    if (status) updateData.status = status;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (provider) updateData.provider = provider;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
    if (notes !== undefined) updateData.notes = notes;

    // 如果狀態更新為 DELIVERED，記錄實際送達時間
    if (status === 'DELIVERED') {
      updateData.actualDelivery = new Date();
    }

    // 更新物流記錄
    const updatedShipping = await prisma.shipping.update({
      where: { id },
      data: updateData,
    });

    // 如果物流狀態為 DELIVERED，更新訂單狀態為 COMPLETED
    if (status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: shipping.orderId },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    return NextResponse.json({
      message: '物流記錄更新成功',
      data: {
        id: updatedShipping.id,
        status: updatedShipping.status,
        trackingNumber: updatedShipping.trackingNumber,
        provider: updatedShipping.provider,
        estimatedDelivery: updatedShipping.estimatedDelivery,
        actualDelivery: updatedShipping.actualDelivery,
      },
    });

  } catch (error) {
    logger.error({ err: error }, '更新物流記錄錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}