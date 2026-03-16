/**
 * 搜尋 API 端點
 *
 * 路徑: /api/search
 * 描述: 全域搜尋產品、供應商等資源
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withOptionalAuth,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { z } from 'zod';
import { SYSTEM_ERRORS } from '@/lib/constants';

// 搜尋查詢驗證 Schema
const SearchQuerySchema = z.object({
  q: z.string().min(1, '搜尋查詞不能為空').max(100, '搜尋查詞過長'),
  type: z.string().nullable().optional(),
  limit: z.string().nullable().optional(),
  page: z.string().nullable().optional(),
});

// GET /api/search - 全域搜尋
export const GET = withOptionalAuth(async (request: NextRequest, { authData }) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 驗證查詢參數
    const validation = SearchQuerySchema.safeParse({
      q: searchParams.get('q'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      page: searchParams.get('page'),
    });

    if (!validation.success) {
      const errorMessages = validation.error.errors
        ?.map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ') || validation.error.message;
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '搜尋參數驗證失敗',
        errorMessages,
        400
      );
    }

    const { q, type: typeParam, limit: limitParam, page: pageParam } = validation.data;

    // 設定預設值並進行類型轉換
    const type = (typeParam as any) || 'all';
    const limit = Math.min(Math.max(parseInt(limitParam || '10'), 1), 50);
    const page = Math.max(parseInt(pageParam || '1'), 1);
    const skip = (page - 1) * limit;

    let results: any = {
      query: q,
      type: type,
      results: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      }
    };

    // 驗證 type 值
    if (!['all', 'products', 'suppliers', 'categories'].includes(type)) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '搜尋類型無效',
        `允許的類型: all, products, suppliers, categories`,
        400
      );
    }

    // 搜尋產品
    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { subtitle: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          name: true,
          subtitle: true,
          description: true,
          image: true,
          unit: true,
        },
        take: limit,
        skip: skip,
      });

      const productCount = await prisma.product.count({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { subtitle: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
      });

      results.results.push({
        type: 'products',
        count: productCount,
        data: products,
      });

      if (type === 'products') {
        results.pagination.total = productCount;
        results.pagination.totalPages = Math.ceil(productCount / limit);
      }
    }

    // 搜尋供應商
    if (type === 'all' || type === 'suppliers') {
      const suppliers = await prisma.supplier.findMany({
        where: {
          OR: [
            { companyName: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          taxId: true,
          companyName: true,
          contactPerson: true,
          email: true,
          phone: true,
        },
        take: type === 'all' ? 3 : limit,
        skip: type === 'all' ? 0 : skip,
      });

      const supplierCount = await prisma.supplier.count({
        where: {
          OR: [
            { companyName: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
      });

      results.results.push({
        type: 'suppliers',
        count: supplierCount,
        data: suppliers,
      });

      if (type === 'suppliers') {
        results.pagination.total = supplierCount;
        results.pagination.totalPages = Math.ceil(supplierCount / limit);
      }
    }

    // 搜尋分類
    if (type === 'all' || type === 'categories') {
      const categories = await prisma.category.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' }
        },
        select: {
          id: true,
          name: true,
        },
        take: type === 'all' ? 3 : limit,
        skip: type === 'all' ? 0 : skip,
      });

      const categoryCount = await prisma.category.count({
        where: {
          name: { contains: q, mode: 'insensitive' }
        }
      });

      results.results.push({
        type: 'categories',
        count: categoryCount,
        data: categories,
      });

      if (type === 'categories') {
        results.pagination.total = categoryCount;
        results.pagination.totalPages = Math.ceil(categoryCount / limit);
      }
    }

    return createSuccessResponse(results);

  } catch (error) {
    console.error('搜尋 API 錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤',
      500
    );
  }
});
