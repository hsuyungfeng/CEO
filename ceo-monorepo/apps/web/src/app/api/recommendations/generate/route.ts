import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generateRecommendations } from '@/lib/services/recommendationService';

// POST /api/recommendations/generate - 為用戶生成推薦
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // 只有管理員或系統可以觸發推薦生成
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    const schema = z.object({
      userId: z.string().cuid().optional(),
      algorithm: z.enum(['POPULARITY', 'HISTORY', 'COLLABORATIVE', 'HYBRID']).default('HYBRID'),
      limit: z.number().min(1).max(100).default(10),
      forceRegenerate: z.boolean().default(false)
    });
    
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '輸入資料無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { userId, algorithm, limit, forceRegenerate } = validationResult.data;
    
    // 如果指定了用戶，檢查用戶是否存在
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return NextResponse.json(
          { error: '用戶不存在' },
          { status: 404 }
        );
      }
    }
    
    // 生成推薦
    const result = await generateRecommendations({
      userId,
      algorithm,
      limit,
      forceRegenerate
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `成功為${userId ? '指定用戶' : '所有活躍用戶'}生成 ${result.generatedCount} 個推薦`
    });
    
  } catch (error) {
    console.error('生成推薦失敗:', error);
    return NextResponse.json(
      { error: '生成推薦失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

// GET /api/recommendations/generate - 獲取推薦生成狀態或統計
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    // 統計推薦數據
    const whereClause: Prisma.PurchaseRecommendationWhereInput = {};
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }
    
    const [
      totalRecommendations,
      viewedRecommendations,
      clickedRecommendations,
      recentRecommendations
    ] = await Promise.all([
      // 總推薦數
      prisma.purchaseRecommendation.count({ where: whereClause }),
      // 已查看推薦數
      prisma.purchaseRecommendation.count({
        where: { ...whereClause, viewed: true }
      }),
      // 已點擊推薦數
      prisma.purchaseRecommendation.count({
        where: { ...whereClause, clicked: true }
      }),
      // 最近生成的推薦
      prisma.purchaseRecommendation.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          product: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);
    
    // 計算點擊率
    const clickThroughRate = totalRecommendations > 0 
      ? (clickedRecommendations / totalRecommendations) * 100 
      : 0;
    
    // 按算法統計
    const algorithmStats = await prisma.purchaseRecommendation.groupBy({
      by: ['algorithm'],
      where: whereClause,
      _count: true,
      _avg: { score: true }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        totalRecommendations,
        viewedRecommendations,
        clickedRecommendations,
        clickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
        algorithmStats,
        recentRecommendations
      }
    });
    
  } catch (error) {
    console.error('獲取推薦統計失敗:', error);
    return NextResponse.json(
      { error: '獲取推薦統計失敗' },
      { status: 500 }
    );
  }
}