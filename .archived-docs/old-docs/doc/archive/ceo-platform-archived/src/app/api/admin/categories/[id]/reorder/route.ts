import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ReorderCategorySchema, ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { id } = await params;

    // 檢查分類是否存在
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: '分類不存在',
        } as ApiResponse,
        { status: 404 }
      );
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
    const validationResult = ReorderCategorySchema.safeParse(body);
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

    const { newSortOrder } = validationResult.data;

    // 獲取同級的所有分類
    const siblings = await prisma.category.findMany({
      where: {
        parentId: category.parentId,
        id: { not: id }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // 調整排序值
    const updatedSiblings = [];
    let currentSortOrder = 0;

    for (let i = 0; i < siblings.length + 1; i++) {
      if (i === newSortOrder) {
        // 這是當前分類的新位置
        currentSortOrder++;
        continue;
      }

      const sibling = siblings[i < newSortOrder ? i : i - 1];
      if (sibling) {
        updatedSiblings.push({
          id: sibling.id,
          sortOrder: currentSortOrder
        });
        currentSortOrder++;
      }
    }

    // 使用事務更新所有排序
    await prisma.$transaction([
      // 更新當前分類
      prisma.category.update({
        where: { id },
        data: { sortOrder: newSortOrder }
      }),
      // 更新其他分類
      ...updatedSiblings.map(sibling =>
        prisma.category.update({
          where: { id: sibling.id },
          data: { sortOrder: sibling.sortOrder }
        })
      )
    ]);

    return NextResponse.json({
      success: true,
      message: '分類重新排序成功',
      data: { newSortOrder }
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '重新排序分類錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}