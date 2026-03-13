/**
 * API v1 產品端點
 *
 * 版本: v1
 * 路徑: /api/v1/products
 * 描述: 獲取產品列表，支持搜尋、分類篩選、排序和分頁
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { PAGINATION, SYSTEM_ERRORS } from '@/lib/constants';
import { z } from 'zod';

// ==================== 查詢參數驗證 ====================

const GetProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().optional().default(''),
  categoryId: z.string().optional(),
  featured: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sortBy: z.enum(['createdAt', 'name', 'totalSold', 'price']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==================== GET: 獲取產品列表 ====================

export async function GET(request: NextRequest) {
  try {
    const queryParams = GetProductsQuerySchema.parse({
      page: request.nextUrl.searchParams.get('page') || '1',
      limit: request.nextUrl.searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT),
      search: request.nextUrl.searchParams.get('search') || '',
      categoryId: request.nextUrl.searchParams.get('categoryId') || undefined,
      featured: request.nextUrl.searchParams.get('featured') || undefined,
      sortBy: request.nextUrl.searchParams.get('sortBy') || 'createdAt',
      order: request.nextUrl.searchParams.get('order') || 'desc',
    });

    const skip = (queryParams.page - 1) * queryParams.limit;

    // 建立查詢條件
    const where: any = {
      isActive: true,
    };

    // 搜尋條件
    if (queryParams.search) {
      where.OR = [
        { name: { contains: queryParams.search, mode: 'insensitive' } },
        { subtitle: { contains: queryParams.search, mode: 'insensitive' } },
        { description: { contains: queryParams.search, mode: 'insensitive' } },
      ];
    }

    // 分類條件
    if (queryParams.categoryId) {
      where.categoryId = queryParams.categoryId;
    }

    // 熱門商品條件
    if (queryParams.featured !== undefined) {
      where.isFeatured = queryParams.featured;
    }

    // 團購時間檢查
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
    let orderBy: any = { [queryParams.sortBy]: queryParams.order };

    // 查詢商品
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          priceTiers: {
            orderBy: { minQty: 'asc' },
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
        take: queryParams.limit,
      }),
      prisma.product.count({ where }),
    ]);

    // 格式化回應資料
    const formattedProducts = await Promise.all(products.map(async product => {
      // 計算團購期間
      const isGroupBuyActive = !product.startDate || !product.endDate ||
        (product.startDate <= now && product.endDate >= now);

      // 計算目前集購數量
      let currentGroupBuyQty = 0;
      if (isGroupBuyActive && product.startDate && product.endDate) {
        const orderItems = await prisma.orderItem.findMany({
          where: {
            productId: product.id,
            order: {
              status: {
                in: ['CONFIRMED', 'PENDING', 'SHIPPED', 'COMPLETED'],
              },
              createdAt: {
                gte: product.startDate,
                lte: product.endDate,
              },
            },
          },
          select: {
            quantity: true,
          },
        });
        currentGroupBuyQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      }

      // 計算建議購買數量
      let suggestedQty = 1;
      if (product.priceTiers.length > 1) {
        const nextTier = product.priceTiers.find(tier => tier.minQty > currentGroupBuyQty);
        if (nextTier) {
          suggestedQty = nextTier.minQty;
        }
      }

      // 計算距離下一個階梯
      let qtyToNextTier = 0;
      if (product.priceTiers.length > 1) {
        const nextTier = product.priceTiers.find(tier => tier.minQty > currentGroupBuyQty);
        if (nextTier) {
          qtyToNextTier = nextTier.minQty - currentGroupBuyQty;
        }
      }

      return {
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
        priceTiers: product.priceTiers.map(tier => ({
          minQty: tier.minQty,
          price: tier.price,
        })),
        currentGroupBuyQty,
        qtyToNextTier,
        suggestedQty,
        isGroupBuyActive,
        firm: product.firm?.name || null,
        category: product.category?.name || null,
      };
    }));

    const totalPages = Math.ceil(total / queryParams.limit);

    return createSuccessResponse(formattedProducts, {
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total,
        totalPages,
        hasNextPage: queryParams.page * queryParams.limit < total,
        hasPrevPage: queryParams.page > 1,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '查詢參數驗證失敗'
      );
    }

    console.error('取得產品列表錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR
    );
  }
}
