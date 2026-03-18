import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { MoveCategorySchema, ApiResponse } from '@/types/admin';
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
    const validationResult = MoveCategorySchema.safeParse(body);
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

    const { newParentId } = validationResult.data;

    // 檢查是否嘗試將自己設為父分類
    if (newParentId === id) {
      return NextResponse.json(
        {
          success: false,
          error: '不能將自己設為父分類',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 檢查循環引用：確保新父分類不是當前分類的子分類
    if (newParentId) {
      const checkCircularReference = async (categoryId: string, targetId: string): Promise<boolean> => {
        const children = await prisma.category.findMany({
          where: { parentId: categoryId },
          select: { id: true }
        });
        
        for (const child of children) {
          if (child.id === targetId) {
            return true;
          }
          if (await checkCircularReference(child.id, targetId)) {
            return true;
          }
        }
        return false;
      };

      if (await checkCircularReference(id, newParentId)) {
        return NextResponse.json(
          {
            success: false,
            error: '不能將子分類設為父分類',
          } as ApiResponse,
          { status: 400 }
        );
      }

      // 檢查層級限制
      const parentCategory = await prisma.category.findUnique({
        where: { id: newParentId },
      });
      
      if (!parentCategory) {
        return NextResponse.json(
          {
            success: false,
            error: '父分類不存在',
          } as ApiResponse,
          { status: 400 }
        );
      }

      if (parentCategory.level >= 3) {
        return NextResponse.json(
          {
            success: false,
            error: '父分類已達到最大層級（3級）',
          } as ApiResponse,
          { status: 400 }
        );
      }

      // 計算新的層級
      const newLevel = parentCategory.level + 1;

      // 檢查子分類的層級是否會超過限制
      const checkChildrenLevel = async (categoryId: string, baseLevel: number): Promise<boolean> => {
        const children = await prisma.category.findMany({
          where: { parentId: categoryId },
        });
        
        for (const child of children) {
          if (baseLevel + 1 > 3) {
            return false;
          }
          if (!await checkChildrenLevel(child.id, baseLevel + 1)) {
            return false;
          }
        }
        return true;
      };

      if (!await checkChildrenLevel(id, newLevel)) {
        return NextResponse.json(
          {
            success: false,
            error: '移動後某些子分類的層級會超過3級限制',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 計算新的層級
    let newLevel = 1;
    let parentIdForQuery = newParentId;
    if (newParentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: newParentId },
      });
      newLevel = parentCategory ? parentCategory.level + 1 : 1;
    } else {
      parentIdForQuery = null; // 確保 null 而不是 undefined
    }

    // 獲取目標父分類下的最大排序值
    const maxSortOrder = await prisma.category.aggregate({
      where: {
        parentId: parentIdForQuery,
        id: { not: id }
      },
      _max: {
        sortOrder: true
      }
    });

    const newSortOrder = (maxSortOrder._max.sortOrder || -1) + 1;

    // 使用事務更新分類及其子分類的層級
    const updateCategoryAndChildren = async (categoryId: string, parentId: string | null, level: number) => {
      // 更新當前分類
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          parentId,
          level,
          sortOrder: categoryId === id ? newSortOrder : undefined
        }
      });

      // 遞歸更新子分類
      const children = await prisma.category.findMany({
        where: { parentId: categoryId },
      });

      for (const child of children) {
        await updateCategoryAndChildren(child.id, categoryId, level + 1);
      }
    };

    await updateCategoryAndChildren(id, newParentId ?? null, newLevel);

    return NextResponse.json({
      success: true,
      message: '分類移動成功',
      data: {
        newParentId,
        newLevel,
        newSortOrder
      }
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '移動分類錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}