import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';
import { z } from 'zod';

// GET /api/recommendations/[id] - 獲取單個推薦詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authData = await getAuthData(request);

    if (!authData) {
      return NextResponse.json(
        { error: '需要登入' },
        { status: 401 }
      );
    }

    const recommendationId = id;
    const userId = authData.userId;
    
    const recommendation = await prisma.purchaseRecommendation.findUnique({
      where: { id: recommendationId },
      include: {
        product: {
          include: {
            priceTiers: {
              orderBy: { minQty: 'asc' }
            },
            firm: true,
            category: true
          }
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            email: true,
            avgRating: true,
            totalRatings: true,
            onTimeDeliveryRate: true,
            totalDeliveries: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!recommendation) {
      return NextResponse.json(
        { error: '推薦記錄不存在' },
        { status: 404 }
      );
    }
    
    // 檢查權限（只能查看自己的推薦或管理員）
    if (recommendation.userId !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: recommendation
    });
    
  } catch (error) {
    console.error('獲取推薦詳情失敗:', error);
    return NextResponse.json(
      { error: '獲取推薦詳情失敗' },
      { status: 500 }
    );
  }
}

// PUT /api/recommendations/[id] - 更新推薦狀態（查看、點擊、忽略）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authData = await getAuthData(request);

    if (!authData) {
      return NextResponse.json(
        { error: '需要登入' },
        { status: 401 }
      );
    }

    const recommendationId = id;
    const userId = authData.userId;
    
    // 檢查推薦記錄是否存在且屬於當前用戶
    const existingRecommendation = await prisma.purchaseRecommendation.findUnique({
      where: { id: recommendationId }
    });
    
    if (!existingRecommendation) {
      return NextResponse.json(
        { error: '推薦記錄不存在' },
        { status: 404 }
      );
    }
    
    if (existingRecommendation.userId !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    const schema = z.object({
      action: z.enum(['view', 'click', 'dismiss', 'reset']),
      note: z.string().optional()
    });
    
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '輸入資料無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { action, note } = validationResult.data;
    
    let updateData: any = { updatedAt: new Date() };
    
    switch (action) {
      case 'view':
        updateData.viewed = true;
        updateData.viewedAt = new Date();
        break;
      case 'click':
        updateData.clicked = true;
        updateData.clickedAt = new Date();
        // 如果點擊了推薦，也標記為已查看
        updateData.viewed = true;
        updateData.viewedAt = updateData.viewedAt || new Date();
        break;
      case 'dismiss':
        updateData.dismissed = true;
        updateData.dismissedAt = new Date();
        break;
      case 'reset':
        updateData.viewed = false;
        updateData.clicked = false;
        updateData.dismissed = false;
        updateData.viewedAt = null;
        updateData.clickedAt = null;
        updateData.dismissedAt = null;
        break;
    }
    
    if (note) {
      updateData.note = note;
    }
    
    const updatedRecommendation = await prisma.purchaseRecommendation.update({
      where: { id: recommendationId },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });
    
    // 如果是點擊操作，記錄到用戶採購歷史中（用於改進推薦算法）
    if (action === 'click') {
      try {
        await prisma.userPurchaseHistory.upsert({
          where: {
            userId_productId_supplierId: {
              userId: existingRecommendation.userId,
              productId: existingRecommendation.productId,
              supplierId: existingRecommendation.supplierId || 'NONE' // 處理null值
            }
          },
          update: {
            totalQuantity: { increment: 1 },
            totalOrders: { increment: 1 },
            lastPurchasedAt: new Date()
          },
          create: {
            userId: existingRecommendation.userId,
            productId: existingRecommendation.productId,
            supplierId: existingRecommendation.supplierId,
            totalQuantity: 1,
            totalOrders: 1,
            lastPurchasedAt: new Date()
          }
        });
      } catch (historyError) {
        console.error('更新用戶採購歷史失敗:', historyError);
        // 不阻斷主要操作
      }
    }
    
    return NextResponse.json({
      success: true,
      data: updatedRecommendation,
      message: `推薦已標記為${action === 'view' ? '已查看' : action === 'click' ? '已點擊' : action === 'dismiss' ? '已忽略' : '已重置'}`
    });
    
  } catch (error) {
    console.error('更新推薦狀態失敗:', error);
    return NextResponse.json(
      { error: '更新推薦狀態失敗' },
      { status: 500 }
    );
  }
}

// DELETE /api/recommendations/[id] - 刪除推薦記錄（管理員用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入' },
        { status: 401 }
      );
    }
    
    const recommendationId = id;
    
    // 檢查推薦記錄是否存在
    const existingRecommendation = await prisma.purchaseRecommendation.findUnique({
      where: { id: recommendationId }
    });
    
    if (!existingRecommendation) {
      return NextResponse.json(
        { error: '推薦記錄不存在' },
        { status: 404 }
      );
    }
    
    await prisma.purchaseRecommendation.delete({
      where: { id: recommendationId }
    });
    
    return NextResponse.json({
      success: true,
      message: '推薦記錄已刪除'
    });
    
  } catch (error) {
    console.error('刪除推薦記錄失敗:', error);
    return NextResponse.json(
      { error: '刪除推薦記錄失敗' },
      { status: 500 }
    );
  }
}