import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { UpdateUserStatusSchema, UpdateUserInfoSchema, ApiResponse } from '@/types/admin';

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

    // 查詢會員詳情
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        pointTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
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

    // 計算統計數據
    const orderStats = {
      total: user.orders.length,
      totalAmount: user.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
      completed: user.orders.filter(order => order.status === 'COMPLETED').length,
      pending: user.orders.filter(order => order.status === 'PENDING').length,
    };

    // 格式化響應數據
    const responseData = {
      id: user.id,
      email: user.email,
      name: user.name,
      taxId: user.taxId,
      phone: user.phone,
      fax: user.fax,
      address: user.address,
      contactPerson: user.contactPerson,
      points: user.points,
      role: user.role,
      status: user.status,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      orders: user.orders,
      recentPointTransactions: user.pointTransactions,
      orderStats,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    } as ApiResponse);

  } catch (error) {
    console.error('取得會員詳情錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // 根據請求內容決定使用哪個Schema驗證
    let validationResult;
    let updateType = 'info';

    if (body.status !== undefined) {
      validationResult = UpdateUserStatusSchema.safeParse(body);
      updateType = 'status';
    } else {
      validationResult = UpdateUserInfoSchema.safeParse(body);
    }

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

    // 使用事務更新會員並記錄操作日誌
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 更新會員
      const updated = await tx.user.update({
        where: { id },
        data,
      });

      // 記錄操作日誌
      const anyData = data as Record<string, unknown>;
      let logAction: 'INFO_UPDATE' | 'STATUS_CHANGE' = 'INFO_UPDATE';
      let oldValue: string | null = null;
      let newValue: string | null = null;
      let metadata: Record<string, unknown> | null = null;

      if (updateType === 'status') {
        logAction = 'STATUS_CHANGE';
        oldValue = user.status;
        newValue = (anyData.status as string) ?? null;
        metadata = { reason: anyData.reason ?? null } as Record<string, unknown>;
      } else {
        // 記錄變更的欄位
        const changedFields: Record<string, { old: unknown; new: unknown }> = {};
        Object.keys(anyData).forEach(key => {
          if (user[key as keyof typeof user] !== anyData[key]) {
            changedFields[key] = {
              old: user[key as keyof typeof user],
              new: anyData[key],
            };
          }
        });

        if (Object.keys(changedFields).length > 0) {
          metadata = { changedFields };
        }
      }

      await tx.userLog.create({
        data: {
          userId: id,
          adminId: adminUser.id,
          action: logAction,
          oldValue,
          newValue,
          reason: (anyData.reason as string | null) ?? null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: updateType === 'status' ? '會員狀態更新成功' : '會員資訊更新成功',
    } as ApiResponse);

  } catch (error) {
    console.error('更新會員錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}