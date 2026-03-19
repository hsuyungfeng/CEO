import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';
import { z } from 'zod';

// 查詢參數驗證 schema
const querySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/supplier/orders
 * 取得供應商的訂單（通過供應商商品關聯）
 */
export async function GET(request: NextRequest) {
  try {
    const authData = await getAuthData(request);

    if (!authData?.user) {
      return NextResponse.json(
        { error: '未授權，請先登入' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 解析查詢參數
    const queryParams = {
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '無效的查詢參數', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { status, startDate, endDate, page, limit } = validationResult.data;
    const skip = (page - 1) * limit;

    // 檢查供應商身份（ADMIN 可查看所有供應商第一筆）
    let supplierId: string;
    let supplierProductIds: string[];

    if ((authData.user as any).role === 'ADMIN') {
      const supplier = await prisma.supplier.findFirst({
        where: { status: 'ACTIVE' },
        include: { products: { select: { productId: true } } },
      });
      if (!supplier) {
        return NextResponse.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
      supplierId = supplier.id;
      supplierProductIds = supplier.products.map((p) => p.productId).filter((id): id is string => id !== null);
    } else {
      const userSupplier = await prisma.userSupplier.findFirst({
        where: { userId: authData.user.id },
        include: {
          supplier: {
            include: { products: { select: { productId: true } } },
          },
        },
      });

      if (!userSupplier?.supplier) {
        return NextResponse.json(
          { error: '您不是供應商，無法查看供應商訂單' },
          { status: 403 }
        );
      }
      supplierId = userSupplier.supplier.id;
      supplierProductIds = userSupplier.supplier.products.map((p) => p.productId).filter((id): id is string => id !== null);
    }

    // 建立查詢條件
    const where: any = {
      items: {
        some: {
          productId: {
            in: supplierProductIds,
          },
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 並行查詢訂單和統計
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            where: {
              productId: {
                in: supplierProductIds,
              },
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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

    // 轉換訂單格式
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.items.reduce((sum, item) => sum + Number(item.subtotal), 0),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice),
        image: item.product.image,
      })),
      createdAt: order.createdAt.toISOString(),
      buyer: order.user,
    }));

    return NextResponse.json(
      {
        data: formattedOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[/api/supplier/orders] Error:', error);
    return NextResponse.json(
      { error: '無法取得供應商訂單' },
      { status: 500 }
    );
  }
}
