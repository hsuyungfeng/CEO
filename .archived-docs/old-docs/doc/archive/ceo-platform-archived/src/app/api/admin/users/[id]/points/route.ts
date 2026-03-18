import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { AdjustPointsSchema, ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    const { id } = await params;

    // 檢查會員是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '會員不存在',
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
    const validationResult = AdjustPointsSchema.safeParse(body);
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

    const { amount, reason, type } = validationResult.data;

    // 計算新點數
    let newPoints = user.points;
    let adjustmentAmount = amount;

    if (type === 'ADD') {
      newPoints += amount;
    } else if (type === 'SUBTRACT') {
      newPoints -= amount;
      adjustmentAmount = -amount; // 存儲為負數
    } else if (type === 'SET') {
      adjustmentAmount = amount - user.points;
      newPoints = amount;
    }

    // 檢查點數是否為負數
    if (newPoints < 0) {
      return NextResponse.json(
        {
          success: false,
          error: '點數不能為負數',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 使用事務更新點數並記錄
    const result = await prisma.$transaction(async (tx) => {
      // 更新會員點數
      const updatedUser = await tx.user.update({
        where: { id },
        data: { points: newPoints },
      });

      // 創建點數交易記錄
      const transaction = await tx.pointTransaction.create({
        data: {
          userId: id,
          amount: adjustmentAmount,
          balance: newPoints,
          type: 'MANUAL_ADJUST',
          reason,
        },
      });

      // 記錄操作日誌
      await tx.userLog.create({
        data: {
          userId: id,
          adminId: adminUser.id,
          action: 'POINTS_ADJUST',
          oldValue: user.points.toString(),
          newValue: newPoints.toString(),
          reason,
          metadata: {
            transactionId: transaction.id,
            adjustmentType: type,
            amount: adjustmentAmount,
          },
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: id,
        oldPoints: user.points,
        newPoints: result.updatedUser.points,
        transaction: result.transaction,
      },
      message: '點數調整成功',
    } as ApiResponse, { status: 201 });

  } catch (error) {
    logger.error({ err: error }, '調整點數錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const { id } = await params;

    // 檢查會員是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '會員不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // 解析查詢參數
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const transactionType = searchParams.get('type');
    
    const skip = (page - 1) * limit;

    // 建立查詢條件
    const where: any = { userId: id };
    if (transactionType) {
      where.type = transactionType;
    }

    // 查詢點數交易記錄
    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pointTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
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
    logger.error({ err: error }, '取得點數交易記錄錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}