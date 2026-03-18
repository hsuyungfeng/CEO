import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger'

// 查詢參數驗證 schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
});

// 建立訂單請求驗證 schema
const createOrderSchema = z.object({
  note: z.string().max(500, '備註不能超過500字').optional(),
  shippingInfo: z.object({
    name: z.string().min(1, '姓名不能為空'),
    taxId: z.string().optional(),
    email: z.string().email('電子郵件格式不正確'),
    phone: z.string().min(1, '電話不能為空'),
    billingAddress: z.string().min(1, '發票寄送地址不能為空'),
    shippingAddress: z.string().min(1, '收貨地址不能為空'),
    paymentMethod: z.enum(['CREDIT_CARD', 'ATM', 'COD', 'LINE_PAY', 'JKO_PAY', 'TAIWAN_PAY']),
  }),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).optional(),
});

// 取得訂單列表
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

    const { searchParams } = new URL(request.url);
    
    // 解析和驗證查詢參數
    const queryParams = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
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
      userId: session.user.id,
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
    logger.error({ err: error }, '取得訂單列表錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// 建立訂單
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
    const validationResult = createOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '驗證失敗', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { note, shippingInfo } = validationResult.data;

    // 取得使用者的購物車
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
      
      // 檢查最低集購數量
      const minGroupQty = (cartItem.product as any).minGroupQty || 1;
      const currentSold = (cartItem.product as any).totalSold || 0;
      const qtyAfterOrder = currentSold + cartItem.quantity;
      
      if (minGroupQty > 1 && qtyAfterOrder < minGroupQty) {
        return NextResponse.json(
          { error: `商品「${cartItem.product.name}」還差 ${minGroupQty - qtyAfterOrder} ${(cartItem.product as any).unit} 達到最低集購數量（${minGroupQty} ${(cartItem.product as any).unit}）` },
          { status: 400 }
        );
      }
    }

    // 計算訂單總金額和明細
    let totalAmount = 0;
    const orderItems: any[] = [];
    const productUpdates: any[] = [];

    for (const cartItem of cartItems) {
      // 計算商品單價（根據數量）
      const applicableTier = [...cartItem.product.priceTiers]
        .sort((a, b) => b.minQty - a.minQty)
        .find(tier => tier.minQty <= cartItem.quantity);
      
      const unitPrice = Number(applicableTier?.price || cartItem.product.priceTiers[0].price);
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
        id: cartItem.productId,
        quantity: cartItem.quantity,
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
          userId: session.user.id,
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

      // 建立付款記錄
      const payment = await tx.payment.create({
        data: {
          orderId: newOrder.id,
          userId: session.user.id,
          status: 'PENDING',
          paymentMethod: shippingInfo.paymentMethod,
          amount: totalAmount,
          currency: 'TWD',
        },
      });

      // 建立物流記錄
      const shipping = await tx.shipping.create({
        data: {
          orderId: newOrder.id,
          shippingMethod: 'HOME_DELIVERY', // 預設宅配，可根據需求調整
          status: 'PREPARING',
          shippingAddress: shippingInfo.shippingAddress,
          receiverName: shippingInfo.name,
          receiverPhone: shippingInfo.phone,
        },
      });

      // 建立發票記錄（待開立）
      const invoice = await tx.invoice.create({
        data: {
          orderId: newOrder.id,
          userId: session.user.id,
          status: 'PENDING',
          type: 'ELECTRONIC',
          taxId: shippingInfo.taxId || null,
          buyerName: shippingInfo.name,
          buyerAddress: shippingInfo.billingAddress,
          amount: totalAmount,
          taxAmount: 0, // 可根據稅率計算
        },
      });

      // 更新商品銷售量
      for (const productUpdate of productUpdates) {
        await tx.product.update({
          where: { id: productUpdate.id },
          data: {
            totalSold: {
              increment: productUpdate.quantity,
            },
          },
        });
      }

      // 清空購物車
      await tx.cartItem.deleteMany({
        where: { userId: session.user.id },
      });

      // 更新會員資料
      await tx.member.update({
        where: { userId: session.user.id },
        data: {
          points: { increment: pointsEarned },
          totalSpent: { increment: totalAmount },
          lastPurchaseAt: new Date(),
        },
      });

      // 重新取得包含關聯的訂單
      const orderWithRelations = await tx.order.findUnique({
        where: { id: newOrder.id },
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
          payment: true,
          invoice: true,
          shipping: true,
        },
      });
      
      return orderWithRelations!;
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
      payment: order.payment ? {
        id: order.payment.id,
        status: order.payment.status,
        paymentMethod: order.payment.paymentMethod,
        amount: order.payment.amount,
        currency: order.payment.currency,
      } : null,
      invoice: order.invoice ? {
        id: order.invoice.id,
        status: order.invoice.status,
        type: order.invoice.type,
        taxId: order.invoice.taxId,
        amount: order.invoice.amount,
      } : null,
      shipping: order.shipping ? {
        id: order.shipping.id,
        status: order.shipping.status,
        shippingMethod: order.shipping.shippingMethod,
        trackingNumber: order.shipping.trackingNumber,
        shippingAddress: order.shipping.shippingAddress,
        receiverName: order.shipping.receiverName,
        receiverPhone: order.shipping.receiverPhone,
      } : null,
    };

    return NextResponse.json({
      message: '訂單建立成功',
      order: formattedOrder,
    }, { status: 201 });

  } catch (error) {
    logger.error({ err: error }, '建立訂單錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}