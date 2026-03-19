import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SupplierRatingUpdateSchema } from '@/types/supplier-rating';

// GET /api/supplier-ratings/[id] - 獲取單一評分詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入才能查看評分' },
        { status: 401 }
      );
    }

    const rating = await prisma.supplierRating.findUnique({
      where: { id },
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
      }
    });
    
    if (!rating) {
      return NextResponse.json({ error: '評分不存在' }, { status: 404 });
    }
    
    // 權限檢查：只有評分者本人、管理員或評分是公開的才能查看
    const isOwner = rating.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const isPublic = rating.isPublic;
    
    if (!isOwner && !isAdmin && !isPublic) {
      return NextResponse.json(
        { error: '權限不足，無法查看此評分' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: rating,
      message: '評分詳情獲取成功'
    });
    
  } catch (error) {
    console.error('獲取評分詳情失敗:', error);
    return NextResponse.json(
      { error: '獲取評分詳情失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

// PUT /api/supplier-ratings/[id] - 更新評分
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入才能更新評分' },
        { status: 401 }
      );
    }

    const rating = await prisma.supplierRating.findUnique({
      where: { id }
    });
    
    if (!rating) {
      return NextResponse.json({ error: '評分不存在' }, { status: 404 });
    }
    
    // 權限檢查：只有評分者本人或管理員可以更新
    const isOwner = rating.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: '權限不足，只能更新自己的評分' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validationResult = SupplierRatingUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '輸入資料無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // 使用事務更新評分並重新計算供應商統計
    const result = await prisma.$transaction(async (tx) => {
      // 準備更新數據
      const updateData: {
        updatedAt: Date;
        overallScore?: number;
        qualityScore?: number;
        deliveryScore?: number;
        serviceScore?: number;
        comment?: string | null;
        photoUrls?: string[];
        isPublic?: boolean;
      } = {
        updatedAt: new Date()
      };
      
      if (data.overallScore !== undefined) updateData.overallScore = data.overallScore;
      if (data.qualityScore !== undefined) updateData.qualityScore = data.qualityScore;
      if (data.deliveryScore !== undefined) updateData.deliveryScore = data.deliveryScore;
      if (data.serviceScore !== undefined) updateData.serviceScore = data.serviceScore;
      if (data.comment !== undefined) updateData.comment = data.comment;
      if (data.photoUrls !== undefined) updateData.photoUrls = data.photoUrls;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      
      // 更新評分記錄
      const updatedRating = await tx.supplierRating.update({
        where: { id },
        data: updateData,
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
      
      // 重新計算供應商評分統計
      const supplierStats = await tx.supplierRating.aggregate({
        where: { supplierId: rating.supplierId },
        _avg: { overallScore: true },
        _count: true
      });
      
      await tx.supplier.update({
        where: { id: rating.supplierId },
        data: {
          avgRating: supplierStats._avg.overallScore || 0,
          totalRatings: supplierStats._count
        }
      });
      
      return updatedRating;
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '評分更新成功'
    });
    
  } catch (error) {
    console.error('更新評分失敗:', error);
    return NextResponse.json(
      { error: '更新評分失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

// DELETE /api/supplier-ratings/[id] - 刪除評分
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入才能刪除評分' },
        { status: 401 }
      );
    }

    const rating = await prisma.supplierRating.findUnique({
      where: { id }
    });
    
    if (!rating) {
      return NextResponse.json({ error: '評分不存在' }, { status: 404 });
    }
    
    // 權限檢查：只有評分者本人或管理員可以刪除
    const isOwner = rating.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: '權限不足，只能刪除自己的評分' },
        { status: 403 }
      );
    }
    
    // 使用事務刪除評分並重新計算供應商統計
    await prisma.$transaction(async (tx) => {
      // 刪除評分記錄
      await tx.supplierRating.delete({
        where: { id }
      });
      
      // 重新計算供應商評分統計
      const supplierStats = await tx.supplierRating.aggregate({
        where: { supplierId: rating.supplierId },
        _avg: { overallScore: true },
        _count: true
      });
      
      await tx.supplier.update({
        where: { id: rating.supplierId },
        data: {
          avgRating: supplierStats._avg.overallScore || 0,
          totalRatings: supplierStats._count
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      message: '評分刪除成功'
    });
    
  } catch (error) {
    console.error('刪除評分失敗:', error);
    return NextResponse.json(
      { error: '刪除評分失敗，請稍後再試' },
      { status: 500 }
    );
  }
}