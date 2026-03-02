import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 查詢參數驗證 schema
const querySchema = z.object({
  page: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(100),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'totalSold', 'price']),
  order: z.enum(['asc', 'desc']),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析和驗證查詢參數 - 直接處理 null 值
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      featured: searchParams.get('featured') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      order: searchParams.get('order') || 'desc',
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '無效的查詢參數', errors: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, categoryId, featured, sortBy, order } = validationResult.data;
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = {
      isActive: true,
    };

    // 搜尋條件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分類條件
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 熱門商品條件
    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    // 團購時間檢查 - 修正：使用 AND 邏輯確保商品在有效時間內或沒有時間限制
    const now = new Date();
    where.AND = [
      {
        OR: [
          { startDate: null, endDate: null }, // 沒有時間限制的商品
          { startDate: { lte: now }, endDate: { gte: now } }, // 在團購時間內的商品
        ],
      },
    ];

    // 排序條件
    let orderBy: any = {};
    if (sortBy === 'price') {
      // 價格排序需要特殊處理，使用最低階梯價格
      orderBy = {
        priceTiers: {
          _count: order,
        },
      };
    } else {
      orderBy = { [sortBy]: order };
    }

    // 查詢商品
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          priceTiers: {
            orderBy: { minQty: 'asc' },
            take: 1, // 只取最低價格
          },
          firm: {
            select: { name: true },
          },
          category: {
            select: { name: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // 格式化回應資料
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      image: product.image,
      unit: product.unit,
      spec: product.spec,
      isFeatured: product.isFeatured,
      startDate: product.startDate,
      endDate: product.endDate,
      totalSold: product.totalSold,
      createdAt: product.createdAt,
      price: product.priceTiers[0]?.price || 0,
      firm: product.firm?.name || null,
      category: product.category?.name || null,
    }));

    return NextResponse.json({
      data: formattedProducts,
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
    console.error('取得商品列表錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}