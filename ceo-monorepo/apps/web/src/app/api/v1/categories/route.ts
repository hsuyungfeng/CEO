/**
 * API v1 分類端點
 *
 * 版本: v1
 * 路徑: /api/v1/categories
 * 描述: 獲取分類列表（支持三級分類樹狀結構）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withOptionalAuth,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { PAGINATION, SYSTEM_ERRORS } from '@/lib/constants';
import { z } from 'zod';

// ==================== 查詢參數驗證 ====================

const GetCategoriesQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).transform(val => val === 'true').optional().default(false),
  page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
});

// ==================== GET: 獲取分類列表 ====================

export async function GET(request: NextRequest) {
  try {
    const queryParams = GetCategoriesQuerySchema.parse({
      includeInactive: request.nextUrl.searchParams.get('includeInactive') || 'false',
      page: request.nextUrl.searchParams.get('page') || '1',
      limit: request.nextUrl.searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT),
    });

    // 查詢所有分類
    const categories = await prisma.category.findMany({
      where: {
        isActive: queryParams.includeInactive ? undefined : true,
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        children: {
          where: {
            isActive: queryParams.includeInactive ? undefined : true,
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: {
              where: {
                isActive: queryParams.includeInactive ? undefined : true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    // 建立三級分類樹
    const categoryTree = categories
      .filter(category => category.level === 1) // 第一級分類
      .map(level1Category => ({
        id: level1Category.id,
        name: level1Category.name,
        level: level1Category.level,
        sortOrder: level1Category.sortOrder,
        isActive: level1Category.isActive,
        children: level1Category.children
          .filter(child => child.level === 2) // 第二級分類
          .map(level2Category => ({
            id: level2Category.id,
            name: level2Category.name,
            level: level2Category.level,
            sortOrder: level2Category.sortOrder,
            isActive: level2Category.isActive,
            children: level2Category.children
              .filter(child => child.level === 3) // 第三級分類
              .map(level3Category => ({
                id: level3Category.id,
                name: level3Category.name,
                level: level3Category.level,
                sortOrder: level3Category.sortOrder,
                isActive: level3Category.isActive,
              })),
          })),
      }));

    // 計算分頁
    const totalCategories = categories.filter(cat => cat.level === 1).length;
    const totalPages = Math.ceil(totalCategories / queryParams.limit);

    return createSuccessResponse(categoryTree, {
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: totalCategories,
        totalPages: totalPages,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '查詢參數驗證失敗'
      );
    }

    console.error('取得分類列表錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR
    );
  }
}
