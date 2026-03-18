import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { CreateProductSchema, ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

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
    const validationResult = CreateProductSchema.safeParse(body);
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
    
    // 檢查廠商是否存在（如果提供了 firmId）
    if (data.firmId) {
      const firm = await prisma.firm.findUnique({
        where: { id: data.firmId, isActive: true },
      });
      
      if (!firm) {
        return NextResponse.json(
          {
            success: false,
            error: '指定的廠商不存在或已停用',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 檢查分類是否存在（如果提供了 categoryId）
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId, isActive: true },
      });
      
      if (!category) {
        return NextResponse.json(
          {
            success: false,
            error: '指定的分類不存在或已停用',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 檢查時間範圍是否有效
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (startDate >= endDate) {
        return NextResponse.json(
          {
            success: false,
            error: '開始時間必須早於結束時間',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 創建商品（使用事務確保數據一致性）
    const product = await prisma.$transaction(async (tx) => {
      // 創建商品
      const newProduct = await tx.product.create({
        data: {
          name: data.name,
          subtitle: data.subtitle,
          description: data.description,
          image: data.image || null,
          unit: data.unit,
          spec: data.spec,
          firmId: data.firmId || null,
          categoryId: data.categoryId || null,
          isFeatured: data.isFeatured,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          isActive: true,
        },
      });

      // 創建階梯定價
      if (data.priceTiers && data.priceTiers.length > 0) {
        const priceTiersData = data.priceTiers.map(tier => ({
          productId: newProduct.id,
          minQty: tier.minQty,
          price: tier.price,
        }));

        await tx.priceTier.createMany({
          data: priceTiersData,
        });
      }

      // 獲取完整的商品數據（包含關聯）
      const productWithRelations = await tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          priceTiers: {
            orderBy: { minQty: 'asc' },
          },
          firm: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return productWithRelations;
    });

    if (!product) {
      throw new Error('商品創建失敗');
    }

    // 格式化響應數據
    const responseData = {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      image: product.image,
      unit: product.unit,
      spec: product.spec,
      firmId: product.firmId,
      categoryId: product.categoryId,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      startDate: product.startDate,
      endDate: product.endDate,
      totalSold: product.totalSold,
      sortOrder: product.sortOrder,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      priceTiers: product.priceTiers.map(tier => ({
        id: tier.id,
        minQty: tier.minQty,
        price: tier.price,
      })),
      firm: product.firm,
      category: product.category,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: '商品創建成功',
      } as ApiResponse,
      { status: 201 }
    );

  } catch (error) {
    logger.error({ err: error }, '創建商品錯誤');
    
    // 處理 Prisma 唯一約束錯誤
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: '商品名稱可能已存在',
        } as ApiResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// 可選：添加 GET 方法用於獲取管理員商品列表
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { searchParams } = new URL(request.url);
    
    // 解析查詢參數
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');
    const isFeatured = searchParams.get('isFeatured');
    
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = {};

    // 搜尋條件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分類條件
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 狀態條件
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // 熱門商品條件
    if (isFeatured !== null) {
      where.isFeatured = isFeatured === 'true';
    }

    // 查詢商品（管理員可以看到所有商品，包括非活躍的）
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          priceTiers: {
            orderBy: { minQty: 'asc' },
            take: 1, // 只取最低價格
          },
          firm: {
            select: { name: true },
          },
          category: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // 格式化回應資料
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      image: product.image,
      unit: product.unit,
      spec: product.spec,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      startDate: product.startDate,
      endDate: product.endDate,
      totalSold: product.totalSold,
      sortOrder: product.sortOrder,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      price: product.priceTiers[0]?.price || 0,
      firm: product.firm?.name || null,
      category: product.category?.name || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedProducts,
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
    logger.error({ err: error }, '取得管理員商品列表錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}