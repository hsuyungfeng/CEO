import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse } from '@/types/admin';
import { faqQuerySchema, faqSchema } from './schema';
import { logger } from '@/lib/logger'

// 錯誤訊息常數
const ERROR_MESSAGES = {
  VALIDATION_FAILED: '查詢參數驗證失敗',
  SERVER_ERROR: '伺服器錯誤，請稍後再試',
} as const;

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { searchParams } = new URL(request.url);
    
    // 解析和驗證查詢參數
    const queryParams = faqQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') || undefined,
    });

    if (!queryParams.success) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_FAILED,
          errors: queryParams.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    const { page, limit, search, isActive } = queryParams.data;
    const skip = (page - 1) * limit;

    // 建立查詢條件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // 搜尋條件
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 狀態條件
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 查詢 FAQ
    const [faqs, total] = await Promise.all([
      prisma.faq.findMany({
        where,
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.faq.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: faqs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '取得 FAQ 列表錯誤');
    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.SERVER_ERROR,
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
          error: '請求體格式錯誤，必須是有效的 JSON',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 驗證請求數據
    const validationResult = faqSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: '數據驗證失敗',
          errors,
        } as ApiResponse,
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 檢查 FAQ 問題是否重複（不區分大小寫）
    const existingFaq = await prisma.faq.findFirst({
      where: {
        question: {
          equals: data.question,
          mode: 'insensitive',
        },
      },
    });

    if (existingFaq) {
      return NextResponse.json(
        {
          success: false,
          error: '已存在相同問題的 FAQ',
        } as ApiResponse,
        { status: 409 }
      );
    }
    
    // 計算最大 sortOrder
    const maxSortOrder = await prisma.faq.aggregate({
      _max: {
        sortOrder: true,
      },
    });

    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

    // 創建 FAQ
    const faq = await prisma.faq.create({
      data: {
        question: data.question,
        answer: data.answer,
        isActive: data.isActive,
        sortOrder: nextSortOrder,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: faq,
        message: 'FAQ 創建成功',
      } as ApiResponse,
      { status: 201 }
    );

  } catch (error) {
    logger.error({ err: error }, '創建 FAQ 錯誤');
    
    // 處理 Prisma 唯一約束錯誤
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 問題可能已存在',
        } as ApiResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.SERVER_ERROR,
      } as ApiResponse,
      { status: 500 }
    );
  }
}