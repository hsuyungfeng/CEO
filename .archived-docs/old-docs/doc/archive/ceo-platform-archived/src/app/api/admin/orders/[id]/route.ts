import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { UpdateOrderStatusSchema, ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 獲取訂單詳情（管理員版本）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取訂單 ID
    const { id } = await params;

    // 查詢訂單詳情（管理員可以看到所有訂單）
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            phone: true,
            fax: true,
            address: true,
            contactPerson: true,
            role: true,
            status: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                subtitle: true,
                image: true,
                unit: true,
                spec: true,
                firm: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    address: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 格式化回應資料
    const response = {
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
        productSubtitle: item.product.subtitle,
        productImage: item.product.image,
        productUnit: item.product.unit,
        productSpec: item.product.spec,
        firm: item.product.firm,
        category: item.product.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    };

    return NextResponse.json({
      success: true,
      data: response,
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '取得管理員訂單詳情錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// PATCH: 更新訂單狀態
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    // 獲取訂單 ID
    const { id } = await params;

    // 檢查訂單是否存在
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 解析請求體
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '請求體格式錯誤，必須是有效的 JSON',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 驗證請求數據
    const validationResult = UpdateOrderStatusSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: '數據驗證失敗',
          errors,
        } as ApiResponse,
        { status: 400 }
      );
    }

    const { status, note: adminNote } = validationResult.data;

    // 檢查狀態變更是否有效
    const currentStatus = existingOrder.status;
    const newStatus = status;

    // 狀態變更規則驗證
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['COMPLETED'],
      'COMPLETED': [], // 已完成訂單不能變更狀態
      'CANCELLED': [], // 已取消訂單不能變更狀態
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `無法將訂單從 ${currentStatus} 變更為 ${newStatus}`,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 如果新狀態是 CANCELLED，需要回補商品銷售量和會員點數
    if (newStatus === 'CANCELLED' && currentStatus !== 'CANCELLED') {
      // 使用事務更新訂單狀態並回補數據
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // 更新訂單狀態
        const order = await tx.order.update({
          where: { id },
          data: { 
            status: newStatus,
            note: adminNote ? `${existingOrder.note ? existingOrder.note + '\n' : ''}[管理員備註: ${adminNote}]` : existingOrder.note,
          },
        });

        // 回補商品銷售量
        for (const item of existingOrder.items) {
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
          where: { userId: existingOrder.userId },
          data: {
            points: { decrement: existingOrder.pointsEarned },
            totalSpent: { decrement: existingOrder.totalAmount },
          },
        });

        return order;
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            id: updatedOrder.id,
            orderNo: updatedOrder.orderNo,
            status: updatedOrder.status,
            updatedAt: updatedOrder.updatedAt,
          },
          message: '訂單已取消，相關數據已回補',
        } as ApiResponse,
        { status: 200 }
      );
    }

    // 普通狀態更新
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: newStatus,
        note: adminNote ? `${existingOrder.note ? existingOrder.note + '\n' : ''}[管理員備註: ${adminNote}]` : existingOrder.note,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          status: updatedOrder.status,
          updatedAt: updatedOrder.updatedAt,
        },
        message: '訂單狀態更新成功',
      } as ApiResponse,
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '更新訂單狀態錯誤');
    
    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// DELETE: 刪除訂單（軟刪除，實際上是取消訂單）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    // 獲取訂單 ID
    const { id } = await params;

    // 檢查訂單是否存在
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 檢查訂單狀態是否可以刪除
    if (existingOrder.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: '訂單已經被取消',
        } as ApiResponse,
        { status: 400 }
      );
    }

    if (existingOrder.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: '已完成的訂單不能刪除',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 使用事務取消訂單並回補數據
    await prisma.$transaction(async (tx) => {
      // 更新訂單狀態為 CANCELLED
      await tx.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          note: `${existingOrder.note ? existingOrder.note + '\n' : ''}[管理員刪除: ${adminUser.name} - ${new Date().toISOString()}]`,
        },
      });

      // 回補商品銷售量
      for (const item of existingOrder.items) {
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
        where: { userId: existingOrder.userId },
        data: {
          points: { decrement: existingOrder.pointsEarned },
          totalSpent: { decrement: existingOrder.totalAmount },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: '訂單刪除成功（已取消訂單並回補相關數據）',
      } as ApiResponse,
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '刪除訂單錯誤');
    
    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}