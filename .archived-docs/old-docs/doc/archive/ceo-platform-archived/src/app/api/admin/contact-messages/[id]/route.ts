import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse } from '@/types/admin';
import { markAsReadSchema } from '../schema';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 獲取聯絡訊息詳情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取聯絡訊息 ID
    const { id } = await params;

    // 查詢聯絡訊息詳情
    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: '聯絡訊息不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 如果訊息未讀，自動標記為已讀
    if (!message.isRead) {
      await prisma.contactMessage.update({
        where: { id },
        data: { isRead: true },
      });
      message.isRead = true;
    }

    return NextResponse.json({
      success: true,
      data: message,
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '取得聯絡訊息詳情錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// PATCH: 更新聯絡訊息（標記已讀/未讀）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取聯絡訊息 ID
    const { id } = await params;

    // 檢查聯絡訊息是否存在
    const existingMessage = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      return NextResponse.json(
        {
          success: false,
          error: '聯絡訊息不存在',
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
    const validationResult = markAsReadSchema.safeParse(body);
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

    const { isRead } = validationResult.data;

    // 更新聯絡訊息
    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { isRead },
    });

    return NextResponse.json({
      success: true,
      data: updatedMessage,
      message: isRead ? '已標記為已讀' : '已標記為未讀',
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '更新聯絡訊息錯誤');
    
    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '聯絡訊息不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// DELETE: 刪除聯絡訊息
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取聯絡訊息 ID
    const { id } = await params;

    // 檢查聯絡訊息是否存在
    const existingMessage = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      return NextResponse.json(
        {
          success: false,
          error: '聯絡訊息不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 刪除聯絡訊息
    await prisma.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '聯絡訊息刪除成功',
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '刪除聯絡訊息錯誤');
    
    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '聯絡訊息不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}