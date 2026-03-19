import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';
import { z } from 'zod';

// 查詢參數驗證 schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
});

// 建立訂單請求驗證 schema
const createOrderSchema = z.object({
  note: z.string().max(500, '備註不能超過500字').optional(),
});

  // 取得訂單列表
export async function GET(request: NextRequest) {
  try {
    // 使用統一的認證 helper
    const authData = await getAuthData(request);
    
    if (!authData) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const { userId } = authData;

    const { searchParams } = new URL(request.url);
    
    // 解析和驗證查詢參數
    const queryParams = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') || undefined,
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '無效的查詢參數', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, status } = validationResult.data;
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    // 查詢訂單
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // 格式化回應資料
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount,
      note: order.note,
      pointsEarned: order.pointsEarned,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.image,
        productUnit: item.product.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    }));

    return NextResponse.json({
      data: formattedOrders,
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
    console.error('取得訂單列表錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

  // 建立訂單
export async function POST(request: NextRequest) {
  try {
    // 使用統一的認證 helper
    const authData = await getAuthData(request);
    
    if (!authData) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const { userId } = authData;

    // Parse and handle JSON errors
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: '無效的 JSON 請求體' },
        { status: 400 }
      );
    }

    // 驗證請求資料
    const validationResult = createOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '驗證失敗', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { note } = validationResult.data;

    // 取得使用者的購物車
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId,
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

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: '購物車是空的' },
        { status: 400 }
      );
    }

    // 檢查所有商品是否可購買
    const now = new Date();
    for (const cartItem of cartItems) {
      if (!cartItem.product.isActive) {
        return NextResponse.json(
          { error: `商品「${cartItem.product.name}」已下架，請從購物車移除` },
          { status: 400 }
        );
      }

      // 檢查團購時間
      const isGroupBuyActive = !cartItem.product.startDate || !cartItem.product.endDate || 
        (cartItem.product.startDate <= now && cartItem.product.endDate >= now);

      if (!isGroupBuyActive) {
        return NextResponse.json(
          { error: `商品「${cartItem.product.name}」目前不在團購時間內` },
          { status: 400 }
        );
      }
    }

    // 計算訂單總金額和明細
    let totalAmount = 0;
    const orderItems: Array<{ productId: string; quantity: number; unitPrice: number; subtotal: number }> = [];
    const productUpdates: Array<{ productId: string; soldIncrement: number }> = [];

    for (const cartItem of cartItems) {
      // 計算商品單價（根據數量）
      const applicableTier = [...cartItem.product.priceTiers]
        .sort((a, b) => b.minQty - a.minQty)
        .find(tier => tier.minQty <= cartItem.quantity);
      
      const unitPrice = Number(applicableTier?.price ?? cartItem.product.priceTiers[0].price);
      const subtotal = unitPrice * cartItem.quantity;
      totalAmount += subtotal;

      // 建立訂單明細
      orderItems.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        unitPrice,
        subtotal,
      });

      // 記錄需要更新的商品銷售量
      productUpdates.push({
        productId: cartItem.productId,
        soldIncrement: cartItem.quantity,
      });
    }

    // 計算獲得的點數（每100元獲得1點）
    const pointsEarned = Math.floor(totalAmount / 100);

    // 產生訂單編號（yyyyMMdd-XXXX）
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });
    const orderNo = `${dateStr}-${(orderCount + 1).toString().padStart(4, '0')}`;

    // 使用事務建立訂單
    const order = await prisma.$transaction(async (tx) => {
      // 建立訂單
      const newOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          status: 'PENDING',
          totalAmount,
          note,
          pointsEarned,
          items: {
            create: orderItems,
          },
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
                },
              },
            },
          },
        },
      });

      // 更新商品銷售量
      for (const productUpdate of productUpdates) {
        await tx.product.update({
          where: { id: productUpdate.productId },
          data: {
            totalSold: {
              increment: productUpdate.soldIncrement,
            },
          },
        });
      }

      // 清空購物車
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      // 檢查並更新會員資料（如果存在）
      const existingMember = await tx.member.findUnique({
        where: { userId },
      });

      if (existingMember) {
        await tx.member.update({
          where: { userId },
          data: {
            points: { increment: pointsEarned },
            totalSpent: { increment: totalAmount },
            lastPurchaseAt: new Date(),
          },
        });
      } else {
        // 如果會員資料不存在，建立新的會員資料
        await tx.member.create({
          data: {
            userId,
            points: pointsEarned,
            totalSpent: totalAmount,
            lastPurchaseAt: new Date(),
          },
        });
      }

      return newOrder;
    });

    // 格式化回應資料
    const formattedOrder = {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount,
      note: order.note,
      pointsEarned: order.pointsEarned,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.image,
        productUnit: item.product.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    };

    return NextResponse.json({
      message: '訂單建立成功',
      order: formattedOrder,
    }, { status: 201 });

  } catch (error) {
    console.error('建立訂單錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}