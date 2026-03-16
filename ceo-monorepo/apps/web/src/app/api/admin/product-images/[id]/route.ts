import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    await prisma.productImage.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: '圖片刪除成功',
    });
  } catch (error) {
    console.error('刪除圖片錯誤:', error);
    return NextResponse.json(
      { success: false, error: '刪除失敗' },
      { status: 500 }
    );
  }
}
