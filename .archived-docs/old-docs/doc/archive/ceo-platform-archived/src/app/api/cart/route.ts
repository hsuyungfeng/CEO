import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger'

// 加入購物車請求驗證 schema
const addToCartSchema = z.object({
  productId: z.string().min(1, '商品ID不能為空'),
  quantity: z.number().int().positive().min(1, '數量必須大於0'),
});

// 取得購物車
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

    // 查詢使用者的購物車
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
            firm: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 計算購物車總計
    let totalItems = 0;
    let totalAmount = 0;
    let totalSavings = 0;

    const formattedItems = await Promise.all(cartItems.map(async (item) => {
      // 計算商品單價（根據數量）
      let unitPrice = 0;
      if (item.product.priceTiers.length > 0) {
        // 找到適合數量的價格區間
        const applicableTier = [...item.product.priceTiers]
          .sort((a, b) => b.minQty - a.minQty)
          .find(tier => tier.minQty <= item.quantity);
        
        unitPrice = Number(applicableTier?.price || item.product.priceTiers[0].price);
      }

      // 計算小計
      const subtotal = Number(unitPrice) * item.quantity;
      
      // 計算原價（最低數量價格）
      const originalPrice = Number(item.product.priceTiers[0]?.price || 0);
      const originalSubtotal = originalPrice * item.quantity;
      const savings = originalSubtotal - subtotal;

      // 累加總計
      totalItems += item.quantity;
      totalAmount += subtotal;
      totalSavings += savings;

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        savings,
        product: {
          id: item.product.id,
          name: item.product.name,
          subtitle: item.product.subtitle,
          image: item.product.image,
          unit: item.product.unit,
          spec: item.product.spec,
          priceTiers: item.product.priceTiers.map(tier => ({
            minQty: tier.minQty,
            price: tier.price,
          })),
          firm: item.product.firm?.name || null,
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }));

    return NextResponse.json({
      data: formattedItems,
      summary: {
        totalItems,
        totalAmount,
        totalSavings,
        finalAmount: totalAmount,
      },
    });

  } catch (error) {
    logger.error({ err: error }, '取得購物車錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 加入購物車
export async function POST(request: NextRequest) {
  try {
    // 驗證使用者是否已登入
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 驗證請求資料
    const validationResult = addToCartSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '驗證失敗', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { productId, quantity } = validationResult.data;

    // 檢查商品是否存在且可購買
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        isActive: true,
      },
      include: {
        priceTiers: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: '商品不存在或已下架' },
        { status: 404 }
      );
    }

    // 檢查團購時間
    const now = new Date();
    const isGroupBuyActive = !product.startDate || !product.endDate || 
      (product.startDate <= now && product.endDate >= now);

    if (!isGroupBuyActive) {
      return NextResponse.json(
        { error: '此商品目前不在團購時間內' },
        { status: 400 }
      );
    }

    // 檢查購物車是否已有此商品
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    });

    let cartItem: any;
    if (existingCartItem) {
      // 更新現有商品數量
      cartItem = await prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: existingCartItem.quantity + quantity,
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
    } else {
      // 新增購物車項目
      cartItem = await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          quantity,
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
    }

    // 計算價格
    const applicableTier = [...cartItem.product.priceTiers]
      .sort((a, b) => b.minQty - a.minQty)
      .find(tier => tier.minQty <= cartItem.quantity);
    
    const unitPrice = Number(applicableTier?.price || cartItem.product.priceTiers[0].price);
    const subtotal = unitPrice * cartItem.quantity;

    return NextResponse.json({
      message: '已加入購物車',
      cartItem: {
        id: cartItem.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        unitPrice,
        subtotal,
        product: {
          id: cartItem.product.id,
          name: cartItem.product.name,
          image: cartItem.product.image,
          unit: cartItem.product.unit,
        },
      },
    }, { status: 201 });

  } catch (error) {
    logger.error({ err: error }, '加入購物車錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}