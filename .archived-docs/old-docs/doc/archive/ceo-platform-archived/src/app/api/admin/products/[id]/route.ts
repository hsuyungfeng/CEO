import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { UpdateProductSchema, ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: 更新商品
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    // 獲取商品 ID
    const { id } = await params;

    // 檢查商品是否存在
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: '商品不存在',
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
    const validationResult = UpdateProductSchema.safeParse(body);
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
    if (data.firmId !== undefined) {
      if (data.firmId === null) {
        // 允許設置為 null
      } else {
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
    }

    // 檢查分類是否存在（如果提供了 categoryId）
    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        // 允許設置為 null
      } else {
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
    }

    // 檢查時間範圍是否有效
    if (data.startDate !== undefined && data.endDate !== undefined) {
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
    } else if (data.startDate !== undefined && existingProduct.endDate) {
      // 只更新開始時間，檢查現有結束時間
      const startDate = new Date(data.startDate || '');
      const endDate = existingProduct.endDate;
      
      if (startDate && endDate && startDate >= endDate) {
        return NextResponse.json(
          {
            success: false,
            error: '開始時間必須早於結束時間',
          } as ApiResponse,
          { status: 400 }
        );
      }
    } else if (data.endDate !== undefined && existingProduct.startDate) {
      // 只更新結束時間，檢查現有開始時間
      const startDate = existingProduct.startDate;
      const endDate = new Date(data.endDate || '');
      
      if (startDate && endDate && startDate >= endDate) {
        return NextResponse.json(
          {
            success: false,
            error: '開始時間必須早於結束時間',
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // 更新商品（使用事務確保數據一致性）
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 準備更新數據
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.image !== undefined) updateData.image = data.image || null;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.spec !== undefined) updateData.spec = data.spec;
      if (data.firmId !== undefined) updateData.firmId = data.firmId;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

      // 更新商品基本信息
      const product = await tx.product.update({
        where: { id },
        data: updateData,
      });

      // 如果提供了 priceTiers，則更新階梯定價
      if (data.priceTiers !== undefined) {
        // 刪除現有階梯定價
        await tx.priceTier.deleteMany({
          where: { productId: id },
        });

        // 創建新的階梯定價
        if (data.priceTiers.length > 0) {
          const priceTiersData = data.priceTiers.map(tier => ({
            productId: id,
            minQty: tier.minQty,
            price: tier.price,
          }));

          await tx.priceTier.createMany({
            data: priceTiersData,
          });
        }
      }

      // 獲取完整的商品數據（包含關聯）
      const productWithRelations = await tx.product.findUnique({
        where: { id },
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

    if (!updatedProduct) {
      throw new Error('商品更新失敗');
    }

    // 格式化響應數據
    const responseData = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      subtitle: updatedProduct.subtitle,
      description: updatedProduct.description,
      image: updatedProduct.image,
      unit: updatedProduct.unit,
      spec: updatedProduct.spec,
      firmId: updatedProduct.firmId,
      categoryId: updatedProduct.categoryId,
      isActive: updatedProduct.isActive,
      isFeatured: updatedProduct.isFeatured,
      startDate: updatedProduct.startDate,
      endDate: updatedProduct.endDate,
      totalSold: updatedProduct.totalSold,
      sortOrder: updatedProduct.sortOrder,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
      priceTiers: updatedProduct.priceTiers.map(tier => ({
        id: tier.id,
        minQty: tier.minQty,
        price: tier.price,
      })),
      firm: updatedProduct.firm,
      category: updatedProduct.category,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: '商品更新成功',
      } as ApiResponse,
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '更新商品錯誤');
    
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

    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '商品不存在',
        } as ApiResponse,
        { status: 404 }
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

// DELETE: 刪除商品（軟刪除）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    // 獲取商品 ID
    const { id } = await params;

    // 檢查商品是否存在
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: '商品不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 檢查商品是否已經被刪除
    if (!existingProduct.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: '商品已經被刪除',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 檢查商品是否有未完成的訂單
    const activeOrders = await prisma.orderItem.findFirst({
      where: {
        productId: id,
        order: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'SHIPPED'],
          },
        },
      },
    });

    if (activeOrders) {
      return NextResponse.json(
        {
          success: false,
          error: '商品有未完成的訂單，無法刪除',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 軟刪除商品（設置 isActive: false）
    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '商品刪除成功',
      } as ApiResponse,
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '刪除商品錯誤');
    
    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '商品不存在',
        } as ApiResponse,
        { status: 404 }
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

// GET: 獲取商品詳情（管理員版本，可以看到非活躍商品）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取商品 ID
    const { id } = await params;

    // 查詢商品詳情（管理員可以看到非活躍商品）
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        priceTiers: {
          orderBy: { minQty: 'asc' },
        },
        firm: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            parent: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: '商品不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 計算價格區間
    const priceTiers = product.priceTiers.map(tier => ({
      id: tier.id,
      minQty: tier.minQty,
      price: tier.price,
    }));

    // 計算建議購買數量（達到下一個價格區間）
    let suggestedQty = 1;
    if (priceTiers.length > 1) {
      const currentTier = priceTiers[0];
      const nextTier = priceTiers.find(tier => tier.minQty > 1);
      if (nextTier) {
        suggestedQty = nextTier.minQty;
      }
    }

    // 格式化分類路徑
    const categoryPath = [];
    if (product.category) {
      if (product.category.parent?.parent) {
        categoryPath.push(product.category.parent.parent.name);
      }
      if (product.category.parent) {
        categoryPath.push(product.category.parent.name);
      }
      categoryPath.push(product.category.name);
    }

    // 檢查團購時間是否有效
    const now = new Date();
    const isGroupBuyActive = !product.startDate || !product.endDate || 
      (product.startDate <= now && product.endDate >= now);

    // 格式化回應資料
    const response = {
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
      priceTiers,
      suggestedQty,
      isGroupBuyActive,
      firm: product.firm,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        path: categoryPath,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: response,
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '取得管理員商品詳情錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}