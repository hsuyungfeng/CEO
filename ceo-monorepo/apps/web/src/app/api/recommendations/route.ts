import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';
import { z } from 'zod';

// GET /api/recommendations - 獲取當前用戶的採購推薦
export async function GET(request: NextRequest) {
  try {
    const authData = await getAuthData(request);

    if (!authData) {
      return NextResponse.json(
        { error: '需要登入才能獲取推薦' },
        { status: 401 }
      );
    }

    const userId = authData.userId;
    
    // 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const algorithm = searchParams.get('algorithm') || undefined;
    const viewed = searchParams.get('viewed') === 'true' ? true : 
                  searchParams.get('viewed') === 'false' ? false : undefined;
    
    // 查詢推薦記錄
    const recommendations = await prisma.purchaseRecommendation.findMany({
      where: {
        userId,
        ...(algorithm && { algorithm }),
        ...(viewed !== undefined && { viewed })
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            subtitle: true,
            image: true,
            unit: true,
            spec: true,
            popularityScore: true,
            purchaseCount: true,
            priceTiers: {
              orderBy: { minQty: 'asc' },
              take: 1
            }
          }
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
            avgRating: true,
            totalRatings: true,
            onTimeDeliveryRate: true
          }
        }
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    // 如果推薦數量不足，可以觸發生成新的推薦
    if (recommendations.length < 5) {
      // 這裡可以非同步觸發推薦生成，但不阻塞當前響應
      // 暫時留空，後續實現
    }

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
    
  } catch (error) {
    console.error('獲取推薦失敗:', error);
    return NextResponse.json(
      { error: '獲取推薦失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

// POST /api/recommendations - 創建新的推薦（管理員/系統用）
export async function POST(request: NextRequest) {
  try {
    const authData = await getAuthData(request);

    if (!authData || authData.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const schema = z.object({
      userId: z.string().cuid(),
      productId: z.string().cuid(),
      supplierId: z.string().cuid().optional(),
      score: z.number().min(0).max(1).default(0.5),
      reason: z.string().optional(),
      algorithm: z.string().default('MANUAL')
    });
    
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '輸入資料無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // 檢查用戶、產品、供應商是否存在
    const [user, product, supplier] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.userId } }),
      prisma.product.findUnique({ where: { id: data.productId } }),
      data.supplierId ? prisma.supplier.findUnique({ where: { id: data.supplierId } }) : Promise.resolve(null)
    ]);
    
    if (!user) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 });
    }
    
    if (!product) {
      return NextResponse.json({ error: '產品不存在' }, { status: 404 });
    }
    
    if (data.supplierId && !supplier) {
      return NextResponse.json({ error: '供應商不存在' }, { status: 404 });
    }
    
    // 創建推薦記錄
    const recommendation = await prisma.purchaseRecommendation.create({
      data: {
        userId: data.userId,
        productId: data.productId,
        supplierId: data.supplierId,
        score: data.score,
        reason: data.reason,
        algorithm: data.algorithm,
        viewed: false,
        clicked: false,
        dismissed: false
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        supplier: {
          select: {
            id: true,
            companyName: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: recommendation,
      message: '推薦創建成功'
    }, { status: 201 });
    
  } catch (error) {
    console.error('創建推薦失敗:', error);
    return NextResponse.json(
      { error: '創建推薦失敗，請稍後再試' },
      { status: 500 }
    );
  }
}