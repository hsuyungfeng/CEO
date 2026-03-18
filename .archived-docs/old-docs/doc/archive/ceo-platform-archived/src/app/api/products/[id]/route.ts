import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 查詢商品詳情
    const product = await prisma.product.findUnique({
      where: { 
        id,
        isActive: true,
      },
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
        { error: '商品不存在或已下架' },
        { status: 404 }
      );
    }

    // 檢查團購時間
    const now = new Date();
    const isGroupBuyActive = !product.startDate || !product.endDate || 
      (product.startDate <= now && product.endDate >= now);

    if (!isGroupBuyActive) {
      return NextResponse.json(
        { error: '此商品目前不在團購時間內' },
        { status: 400 }
      );
    }

    // 計算價格區間
    const priceTiers = product.priceTiers.map(tier => ({
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

    // 格式化回應資料
    const response = {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      image: product.image,
      unit: product.unit,
      spec: product.spec,
      isFeatured: product.isFeatured,
      startDate: product.startDate,
      endDate: product.endDate,
      totalSold: product.totalSold,
      minGroupQty: product.minGroupQty,
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

    return NextResponse.json(response);

  } catch (error) {
    logger.error({ err: error }, '取得商品詳情錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}