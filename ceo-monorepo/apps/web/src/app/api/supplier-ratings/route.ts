import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  SupplierRatingCreateSchema,
  SupplierRatingQuerySchema,
  type SupplierRatingCreateInput,
  type SupplierRatingQuery
} from '@/types/supplier-rating';

// GET /api/supplier-ratings - 獲取評分列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入才能查看評分' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      supplierId: searchParams.get('supplierId') || undefined,
      userId: searchParams.get('userId') || undefined,
      minRating: searchParams.get('minRating') || undefined,
      maxRating: searchParams.get('maxRating') || undefined,
      hasComment: searchParams.get('hasComment') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    };

    const validationResult = SupplierRatingQuerySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '查詢參數無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const query = validationResult.data;
    const skip = (query.page - 1) * query.limit;

    // 構建查詢條件
    const where: Prisma.SupplierRatingWhereInput = {};
    
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    
    if (query.userId) {
      where.userId = query.userId;
    }
    
    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.overallScore = {
        ...(query.minRating !== undefined ? { gte: query.minRating } : {}),
        ...(query.maxRating !== undefined ? { lte: query.maxRating } : {}),
      };
    }
    
    if (query.hasComment === true) {
      where.comment = { not: null };
    } else if (query.hasComment === false) {
      where.comment = null;
    }

    // 檢查權限：普通用戶只能查看自己的評分或公開評分
    if (session.user.role === 'MEMBER') {
      // 如果查詢特定用戶但不是自己，拒絕訪問
      if (query.userId && query.userId !== session.user.id) {
        return NextResponse.json(
          { error: '權限不足，只能查看自己的評分' },
          { status: 403 }
        );
      }
      // 如果沒有指定 userId，則只返回當前用戶的評分
      if (!query.userId) {
        where.userId = session.user.id;
      }
      // 如果查詢其他供應商的評分，只返回公開評分
      if (query.supplierId) {
        where.isPublic = true;
      }
    }

    // 查詢評分記錄
    const [ratings, total] = await Promise.all([
      prisma.supplierRating.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          supplier: {
            select: {
              id: true,
              companyName: true,
              avgRating: true,
              totalRatings: true
            }
          },
          order: {
            select: {
              id: true,
              orderNo: true,
              totalAmount: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          [query.sortBy === 'overallScore' ? 'overallScore' : 'createdAt']: query.sortOrder
        },
        skip,
        take: query.limit
      }),
      prisma.supplierRating.count({ where })
    ]);

    // 計算評分統計（如果查詢單個供應商）
    let stats = null;
    if (query.supplierId) {
      const ratingStats = await prisma.supplierRating.aggregate({
        where: { supplierId: query.supplierId },
        _avg: { 
          overallScore: true,
          qualityScore: true,
          deliveryScore: true,
          serviceScore: true
        },
        _count: true,
        _min: { overallScore: true },
        _max: { overallScore: true }
      });

      // 計算評分分布
      const ratingDistribution = await prisma.supplierRating.groupBy({
        by: ['overallScore'],
        where: { supplierId: query.supplierId },
        _count: true
      });

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingDistribution.forEach(item => {
        const rating = item.overallScore;
        if (rating >= 1 && rating <= 5) {
          distribution[rating as keyof typeof distribution] = item._count;
        }
      });

      stats = {
        averageRating: ratingStats._avg.overallScore || 0,
        totalRatings: ratingStats._count,
        minRating: ratingStats._min.overallScore,
        maxRating: ratingStats._max.overallScore,
        dimensionAverages: {
          overallScore: ratingStats._avg.overallScore || 0,
          qualityScore: ratingStats._avg.qualityScore || 0,
          deliveryScore: ratingStats._avg.deliveryScore || 0,
          serviceScore: ratingStats._avg.serviceScore || 0
        },
        ratingDistribution: distribution
      };
    }

    return NextResponse.json({
      success: true,
      data: ratings,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      },
      stats,
      message: '評分列表獲取成功'
    });
    
  } catch (error) {
    console.error('獲取評分列表失敗:', error);
    return NextResponse.json(
      { error: '獲取評分列表失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

// POST /api/supplier-ratings - 提交供應商評分
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入才能提交評分' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    
    const validationResult = SupplierRatingCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '輸入資料無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data: SupplierRatingCreateInput = validationResult.data;
    
    // 檢查供應商是否存在
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId }
    });
    
    if (!supplier) {
      return NextResponse.json({ error: '供應商不存在' }, { status: 404 });
    }
    
    // 檢查是否已經評分過（同一用戶對同一供應商只能評分一次）
    const existingRating = await prisma.supplierRating.findFirst({
      where: {
        supplierId: data.supplierId,
        userId
      }
    });
    
    if (existingRating) {
      return NextResponse.json(
        { error: '您已經對該供應商評分過了，請使用更新功能修改評分' },
        { status: 400 }
      );
    }
    
    // 如果提供了 orderId，檢查訂單是否存在且屬於當前用戶
    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: data.orderId,
          userId
        }
      });
      
      if (!order) {
        return NextResponse.json(
          { error: '訂單不存在或您無權訪問此訂單' },
          { status: 403 }
        );
      }
    }
    
    // 使用 Prisma 事務創建評分並更新供應商統計
    const result = await prisma.$transaction(async (tx) => {
      // 創建評分記錄
      const rating = await tx.supplierRating.create({
        data: {
          supplierId: data.supplierId,
          userId,
          orderId: data.orderId,
          overallScore: data.overallScore,
          qualityScore: data.qualityScore || data.overallScore,
          deliveryScore: data.deliveryScore || data.overallScore,
          serviceScore: data.serviceScore || data.overallScore,
          comment: data.comment,
          photoUrls: data.photoUrls || [],
          isPublic: data.isPublic
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
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
      
      // 更新供應商評分統計
      const supplierStats = await tx.supplierRating.aggregate({
        where: { supplierId: data.supplierId },
        _avg: { overallScore: true },
        _count: true
      });
      
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: {
          avgRating: supplierStats._avg.overallScore || 0,
          totalRatings: supplierStats._count
        }
      });
      
      return rating;
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '評分提交成功，感謝您的回饋！'
    }, { status: 201 });
    
  } catch (error) {
    console.error('提交評分失敗:', error);
    return NextResponse.json(
      { error: '提交評分失敗，請稍後再試' },
      { status: 500 }
    );
  }
}