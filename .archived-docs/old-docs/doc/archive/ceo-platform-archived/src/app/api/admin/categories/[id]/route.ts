import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import {
  UpdateCategorySchema,
  ReorderCategorySchema,
  MoveCategorySchema,
  ApiResponse,
  CategoryDetail
} from '@/types/admin';
import { logger } from '@/lib/logger'

// 獲取分類詳情
export async function GET(
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

    // 獲取分類詳情
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          }
        },
        children: {
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            sortOrder: 'asc'
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      }
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

    // 格式化響應數據
    const responseData: CategoryDetail = {
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      parent: category.parent,
      children: category.children,
      productCount: category._count.products
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '獲取分類詳情錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// 更新分類
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
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
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
    const validationResult = UpdateCategorySchema.safeParse(body);
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

    // 如果有 parentId 變更，需要檢查循環引用和層級限制
    if (data.parentId !== undefined) {
      const newParentId = data.parentId;
      
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
        if (newParentId) {
          const parentCategory = await prisma.category.findUnique({
            where: { id: newParentId },
          });
          
          if (parentCategory && parentCategory.level >= 3) {
            return NextResponse.json(
              {
                success: false,
                error: '父分類已達到最大層級（3級）',
              } as ApiResponse,
              { status: 400 }
            );
          }
        }
      }
    }

    // 檢查分類名稱是否重複（在同級分類中）
    if (data.name) {
      const parentId = data.parentId !== undefined ? data.parentId : existingCategory.parentId;
      
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name: data.name,
          parentId,
          id: { not: id }
        },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          {
            success: false,
            error: '同級分類中已存在相同名稱的分類',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 計算新的層級（如果 parentId 有變更）
    let level = existingCategory.level;
    if (data.parentId !== undefined) {
      if (data.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: data.parentId },
        });
        level = parentCategory ? parentCategory.level + 1 : 1;
      } else {
        level = 1;
      }
    }

    // 更新分類
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        level,
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    // 格式化響應數據
    const responseData = {
      id: updatedCategory.id,
      name: updatedCategory.name,
      parentId: updatedCategory.parentId,
      level: updatedCategory.level,
      sortOrder: updatedCategory.sortOrder,
      isActive: updatedCategory.isActive,
      createdAt: updatedCategory.createdAt,
      productCount: updatedCategory._count.products
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: '分類更新成功',
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '更新分類錯誤');
    
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// 刪除分類（軟刪除）
export async function DELETE(
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
      include: {
        _count: {
          select: {
            products: true,
            children: true
          }
        }
      }
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

    // 檢查是否有子分類
    if (category._count.children > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '該分類下有子分類，請先刪除或移動子分類',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 檢查是否有關聯的商品
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '該分類下有商品，請先移除或重新分配商品',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 軟刪除：設置 isActive 為 false
    await prisma.category.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: '分類刪除成功',
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '刪除分類錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}