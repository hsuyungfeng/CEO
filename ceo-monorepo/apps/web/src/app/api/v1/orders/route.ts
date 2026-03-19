/**
 * API v1 訂單端點 - 簡化版本
 * 
 * 版本: v1
 * 路徑: /api/v1/orders
 * 描述: 獲取訂單列表（簡化版本，根據實際 Prisma 模型調整）
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, OrderStatus } from '@prisma/client';
import {
  withAuth,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import {
  PAGINATION,
  SYSTEM_ERRORS
} from '@/lib/constants';
import { z } from 'zod';

// ==================== 查詢參數驗證 ====================

const GetOrdersQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ALL']).optional().default('ALL'),
  page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
});

// ==================== 輔助函數 ====================

// 創建帶有版本標頭的錯誤響應
function createV1ErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
) {
  const response = createErrorResponse(code, message, details, status);
  response.headers.set('X-API-Version', 'v1');
  return response;
}

// 創建帶有版本標頭的成功響應
function createV1SuccessResponse<T = unknown>(
  data: T,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  status: number = 200
) {
  const response = createSuccessResponse(data, pagination, status);
  response.headers.set('X-API-Version', 'v1');
  return response;
}

// ==================== API 端點 ====================

// GET /api/v1/orders - 獲取訂單列表（簡化版本）
export const GET = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData) {
      return createV1ErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '需要登入才能查看訂單',
        401
      );
    }

    const userId = authData.userId;

    // 解析查詢參數
    const url = new URL(request.url);
    const queryParams = {
      status: url.searchParams.get('status') || 'ALL',
      page: url.searchParams.get('page') || PAGINATION.DEFAULT_PAGE.toString(),
      limit: url.searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString(),
    };

    // 驗證查詢參數
    const validationResult = GetOrdersQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '查詢參數驗證失敗',
        400,
        errors
      );
    }

    const { status, page, limit } = validationResult.data;
    const skip = (page - 1) * limit;

    // 構建查詢條件
    const where: Prisma.OrderWhereInput = {
      userId,
    };

    if (status !== 'ALL') {
      where.status = status as OrderStatus;
    }

    // 查詢訂單（簡化查詢，只獲取基本資訊）
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNo: true, // 注意：實際字段名是 orderNo，不是 orderNumber
          status: true,
          totalAmount: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          paymentMethod: true,
          pointsEarned: true,
          // 訂單項目數量
          items: {
            select: {
              id: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // 格式化響應數據
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNo, // 映射到更友好的字段名
      status: order.status,
      totalAmount: order.totalAmount,
      note: order.note,
      paymentMethod: order.paymentMethod,
      pointsEarned: order.pointsEarned,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemsCount: order.items.length,
    }));

    // 計算分頁資訊
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
    };

    const response = createV1SuccessResponse(formattedOrders, pagination, 200);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;

  } catch (error) {
    console.error('v1 訂單列表獲取錯誤:', error);
    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      500
    );
  }
});

// POST /api/v1/orders - 創建新訂單（暫不實現，需要更複雜的業務邏輯）
export const POST = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData) {
      return createV1ErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '需要登入才能創建訂單',
        401
      );
    }

    // 暫時返回未實現的錯誤
    return createV1ErrorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      '訂單創建功能暫未實現',
      501
    );

  } catch (error) {
    console.error('v1 訂單創建錯誤:', error);
    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      '訂單創建時發生錯誤',
      500
    );
  }
});