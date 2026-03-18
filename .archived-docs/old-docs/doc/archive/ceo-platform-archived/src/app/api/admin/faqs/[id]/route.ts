import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse } from '@/types/admin';
import { faqUpdateSchema } from '../schema';
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 獲取 FAQ 詳情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取 FAQ ID
    const { id } = await params;

    // 查詢 FAQ 詳情
    const faq = await prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: faq,
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '取得 FAQ 詳情錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// PATCH: 更新 FAQ
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    // 獲取 FAQ ID
    const { id } = await params;

    // 檢查 FAQ 是否存在
    const existingFaq = await prisma.faq.findUnique({
      where: { id },
    });

    if (!existingFaq) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 不存在',
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
    const validationResult = faqUpdateSchema.safeParse(body);
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
    
    // 準備更新數據
    const updateData: Prisma.FaqUpdateInput = {};
    
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // 更新 FAQ
    const updatedFaq = await prisma.faq.update({
      where: { id },
      data: updateData,
    });

    if (!updatedFaq) {
      throw new Error('FAQ 更新失敗');
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedFaq,
        message: 'FAQ 更新成功',
      } as ApiResponse,
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '更新 FAQ 錯誤');
    
    // 處理 Prisma 唯一約束錯誤
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 可能已存在',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 不存在',
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

// DELETE: 刪除 FAQ
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    // 獲取 FAQ ID
    const { id } = await params;

    // 檢查 FAQ 是否存在
    const existingFaq = await prisma.faq.findUnique({
      where: { id },
    });

    if (!existingFaq) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 不存在',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // 軟刪除 FAQ (設置為非活躍狀態)
    const deletedFaq = await prisma.faq.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(
      {
        success: true,
        data: deletedFaq,
        message: 'FAQ 刪除成功',
      } as ApiResponse,
      { status: 200 }
    );

  } catch (error) {
    logger.error({ err: error }, '刪除 FAQ 錯誤');
    
    // 處理 Prisma 記錄不存在錯誤
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FAQ 不存在',
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