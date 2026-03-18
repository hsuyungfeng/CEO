import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');

    const now = new Date();

    // 查詢熱門商品
    const featuredProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        OR: [
          { startDate: null, endDate: null }, // 沒有時間限制的商品
          { startDate: { lte: now }, endDate: { gte: now } }, // 在團購時間內的商品
        ],
      },
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
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // 格式化回應資料
    const formattedProducts = featuredProducts.map(product => {
      // 計算倒數時間（如果有的話）
      let timeLeft = null;
      if (product.endDate) {
        const endTime = new Date(product.endDate).getTime();
        const nowTime = now.getTime();
        const diffMs = endTime - nowTime;
        
        if (diffMs > 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          timeLeft = { days, hours };
        }
      }

      return {
        id: product.id,
        name: product.name,
        subtitle: product.subtitle,
        image: product.image,
        unit: product.unit,
        isFeatured: product.isFeatured,
        startDate: product.startDate,
        endDate: product.endDate,
        totalSold: product.totalSold,
        price: product.priceTiers[0]?.price || 0,
        firm: product.firm?.name || null,
        category: product.category?.name || null,
        timeLeft,
      };
    });

    return NextResponse.json(formattedProducts);

  } catch (error) {
    logger.error({ err: error }, '取得熱門商品錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}