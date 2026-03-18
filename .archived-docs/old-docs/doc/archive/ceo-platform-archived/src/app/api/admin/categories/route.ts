import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  BatchCategoryOperationSchema,
  ApiResponse,
  CategoryWithChildren
} from '@/types/admin';
import { logger } from '@/lib/logger'

// 構建分類樹的輔助函數
function buildCategoryTree(
  categories: any[],
  parentId: string | null = null
): CategoryWithChildren[] {
  return categories
    .filter(category => category.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(category => ({
      ...category,
      children: buildCategoryTree(categories, category.id)
    }));
}

// 獲取分類樹
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // 建立查詢條件
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    // 獲取所有分類
    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    // 格式化分類數據
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      productCount: category._count.products
    }));

    // 構建分類樹
    const categoryTree = buildCategoryTree(formattedCategories);

    return NextResponse.json({
      success: true,
      data: categoryTree,
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '獲取分類樹錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// 創建新分類
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
    const validationResult = CreateCategorySchema.safeParse(body);
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

    // 檢查父分類是否存在（如果提供了 parentId）
    let parentCategory = null;
    let level = 1;
    
    if (data.parentId) {
      parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      
      if (!parentCategory) {
        return NextResponse.json(
          {
            success: false,
            error: '指定的父分類不存在',
          } as ApiResponse,
          { status: 400 }
        );
      }

      // 檢查層級限制（最多3級）
      level = parentCategory.level + 1;
      if (level > 3) {
        return NextResponse.json(
          {
            success: false,
            error: '分類層級不能超過3級',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 檢查分類名稱是否重複（在同級分類中）
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: data.name,
        parentId: data.parentId,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          error: '同級分類中已存在相同名稱的分類',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 創建分類
    const category = await prisma.category.create({
      data: {
        name: data.name,
        parentId: data.parentId,
        level,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
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
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      productCount: category._count.products
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: '分類創建成功',
      } as ApiResponse,
      { status: 201 }
    );

  } catch (error) {
    logger.error({ err: error }, '創建分類錯誤');
    
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// 批量操作
export async function PATCH(request: NextRequest) {
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
    const validationResult = BatchCategoryOperationSchema.safeParse(body);
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

    const { ids, operation } = validationResult.data;

    // 檢查所有分類是否存在
    const categories = await prisma.category.findMany({
      where: {
        id: { in: ids }
      }
    });

    if (categories.length !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          error: '部分分類不存在',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 執行批量操作
    let updateData: any = {};
    let message = '';

    switch (operation) {
      case 'activate':
        updateData = { isActive: true };
        message = '分類啟用成功';
        break;
      case 'deactivate':
        updateData = { isActive: false };
        message = '分類停用成功';
        break;
      case 'delete':
        // 軟刪除：設置 isActive 為 false
        updateData = { isActive: false };
        message = '分類刪除成功';
        break;
    }

    await prisma.category.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message,
      data: { count: ids.length }
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '批量操作分類錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}