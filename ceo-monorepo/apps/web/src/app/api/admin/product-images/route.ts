import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 暫時返回空列表（productImage 表可能不存在）
    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (error) {
    console.error('獲取產品圖片錯誤:', error);
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    );
  }
}
