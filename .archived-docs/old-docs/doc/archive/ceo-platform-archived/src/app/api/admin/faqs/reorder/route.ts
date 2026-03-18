import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse, ReorderFaqSchema } from '@/types/admin';
import { logger } from '@/lib/logger'

const ERROR_MESSAGES = {
  METHOD_NOT_ALLOWED: '此端點僅支援 POST 請求',
  INVALID_JSON: '請求體格式錯誤，必須是有效的 JSON',
  VALIDATION_FAILED: '數據驗證失敗',
  FAQ_NOT_FOUND: '以下 FAQ 不存在: ',
  DUPLICATE_SORT_ORDER: '排序值必須是唯一的',
  SERVER_ERROR: '伺服器錯誤，請稍後再試',
  SUCCESS: 'FAQ 重新排序成功',
} as const;

export async function POST(request: NextRequest) {
  // 驗證 HTTP 方法
  if (request.method !== 'POST') {
    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
      } as ApiResponse,
      { status: 405 }
    );
  }

  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 解析請求體
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.INVALID_JSON,
          errors: [{ field: 'body', message: ERROR_MESSAGES.INVALID_JSON }],
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 驗證請求數據
    const validationResult = ReorderFaqSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          errors,
        } as ApiResponse,
        { status: 400 }
      );
    }

    const { items } = validationResult.data;

    // 檢查所有 FAQ ID 是否存在
    const faqIds = items.map(item => item.id);
    const existingFaqs = await prisma.faq.findMany({
      where: {
        id: { in: faqIds },
      },
      select: { id: true },
    });

    const existingIds = new Set(existingFaqs.map(faq => faq.id));
    const missingIds = faqIds.filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      const errorMessage = `${ERROR_MESSAGES.FAQ_NOT_FOUND}${missingIds.join(', ')}`;
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errors: missingIds.map(id => ({
            field: 'id',
            message: `FAQ ID ${id} 不存在`,
          })),
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 檢查排序值是否唯一
    const sortOrders = items.map(item => item.sortOrder);
    const uniqueSortOrders = new Set(sortOrders);
    if (uniqueSortOrders.size !== sortOrders.length) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.DUPLICATE_SORT_ORDER,
          errors: [{ field: 'sortOrder', message: ERROR_MESSAGES.DUPLICATE_SORT_ORDER }],
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 使用事務更新所有 FAQ 的排序
    const updateOperations = items.map(item =>
      prisma.faq.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await prisma.$transaction(updateOperations);

    return NextResponse.json({
      success: true,
      message: ERROR_MESSAGES.SUCCESS,
      data: { updatedCount: items.length },
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '重新排序 FAQ 錯誤');
    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.SERVER_ERROR,
      } as ApiResponse,
      { status: 500 }
    );
  }
}