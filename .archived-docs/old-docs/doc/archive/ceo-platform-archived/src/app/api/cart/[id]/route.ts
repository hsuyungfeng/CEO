import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 更新購物車項目數量請求驗證 schema
const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, '數量必須大於0'),
});

// 更新購物車項目數量
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
    const body = await request.json();
    
    // 驗證請求資料
    const validationResult = updateCartItemSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '驗證失敗', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { quantity } = validationResult.data;

    // 檢查購物車項目是否存在且屬於當前使用者
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: '購物車項目不存在' },
        { status: 404 }
      );
    }

    // 檢查商品是否仍可購買
    if (!cartItem.product.isActive) {
      return NextResponse.json(
        { error: '商品已下架，請從購物車移除' },
        { status: 400 }
      );
    }

    // 檢查團購時間
    const now = new Date();
    const isGroupBuyActive = !cartItem.product.startDate || !cartItem.product.endDate || 
      (cartItem.product.startDate <= now && cartItem.product.endDate >= now);

    if (!isGroupBuyActive) {
      return NextResponse.json(
        { error: '此商品目前不在團購時間內' },
        { status: 400 }
      );
    }

    // 更新購物車項目數量
    const updatedCartItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    });

    // 計算價格
    const applicableTier = [...updatedCartItem.product.priceTiers]
      .sort((a, b) => b.minQty - a.minQty)
      .find(tier => tier.minQty <= updatedCartItem.quantity);
    
    const unitPrice = Number(applicableTier?.price || updatedCartItem.product.priceTiers[0].price);
    const subtotal = unitPrice * updatedCartItem.quantity;

    return NextResponse.json({
      message: '購物車已更新',
      cartItem: {
        id: updatedCartItem.id,
        productId: updatedCartItem.productId,
        quantity: updatedCartItem.quantity,
        unitPrice,
        subtotal,
        product: {
          id: updatedCartItem.product.id,
          name: updatedCartItem.product.name,
          image: updatedCartItem.product.image,
          unit: updatedCartItem.product.unit,
        },
      },
    });

  } catch (error) {
    logger.error({ err: error }, '更新購物車錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 刪除購物車項目
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 檢查購物車項目是否存在且屬於當前使用者
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: '購物車項目不存在' },
        { status: 404 }
      );
    }

    // 刪除購物車項目
    await prisma.cartItem.delete({
      where: { id },
    });

    return NextResponse.json({
      message: '已從購物車移除',
    });

  } catch (error) {
    logger.error({ err: error }, '刪除購物車錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}