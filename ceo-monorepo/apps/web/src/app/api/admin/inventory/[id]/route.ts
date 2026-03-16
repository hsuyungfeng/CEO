import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const body = await request.json();
    const { quantity } = body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        {
          success: false,
          error: '庫存數量必須是非負數字',
        },
        { status: 400 }
      );
    }

    // 更新產品庫存
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { stock: quantity },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        stock: product.stock,
        message: '庫存更新成功',
      },
    });
  } catch (error) {
    console.error('更新庫存錯誤:', error);

    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: '商品不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      },
      { status: 500 }
    );
  }
}
