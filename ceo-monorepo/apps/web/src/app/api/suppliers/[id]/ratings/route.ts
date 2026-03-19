import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SupplierRatingQuerySchema } from '@/types/supplier-rating';

// GET /api/suppliers/[id]/ratings - 獲取供應商的評分列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入才能查看供應商評分' },
        { status: 401 }
      );
    }

    // 檢查供應商是否存在
    const supplier = await prisma.supplier.findUnique({
      where: { id }
    });
    
    if (!supplier) {
      return NextResponse.json({ error: '供應商不存在' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
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
    const where: Prisma.SupplierRatingWhereInput = {
      supplierId: id
    };
    
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

    // 普通用戶只能看到公開評分
    if (session.user.role === 'MEMBER') {
      where.isPublic = true;
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

    // 計算評分統計
    const ratingStats = await prisma.supplierRating.aggregate({
      where: { supplierId: id },
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
      where: { supplierId: id },
      _count: true
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(item => {
      const rating = item.overallScore;
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution] = item._count;
      }
    });

    // 獲取最近的評價（有評論的）
    const recentComments = await prisma.supplierRating.findMany({
      where: {
        supplierId: id,
        comment: { not: null },
        isPublic: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 準備回應數據
    const stats = {
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
      ratingDistribution: distribution,
      supplier: {
        id: supplier.id,
        companyName: supplier.companyName,
        avgRating: supplier.avgRating,
        totalRatings: supplier.totalRatings,
        onTimeDeliveryRate: supplier.onTimeDeliveryRate,
        totalDeliveries: supplier.totalDeliveries
      }
    };

    // 處理匿名評分：如果不是管理員，隱藏非公開評分的用戶資訊
    const safeRatings = ratings.map(rating => {
      if (!rating.isPublic && session.user.role === 'MEMBER' && rating.userId !== session.user.id) {
        return {
          ...rating,
          user: null
        };
      }
      return rating;
    });

    return NextResponse.json({
      success: true,
      data: safeRatings,
      stats,
      recentComments: recentComments.map(comment => ({
        id: comment.id,
        overallScore: comment.overallScore,
        comment: comment.comment,
        createdAt: comment.createdAt,
        user: comment.isPublic ? comment.user : null
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      },
      message: '供應商評分列表獲取成功'
    });
    
  } catch (error) {
    console.error('獲取供應商評分列表失敗:', error);
    return NextResponse.json(
      { error: '獲取供應商評分列表失敗，請稍後再試' },
      { status: 500 }
    );
  }
}