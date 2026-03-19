import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';


export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // 未登入
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '請先登入' },
        { status: 401 }
      );
    }

    // ADMIN 角色：回傳第一個供應商供後台瀏覽使用
    if ((session.user as { role?: string }).role === 'ADMIN') {
      const supplier = await prisma.supplier.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, companyName: true, taxId: true, status: true },
      });
      return NextResponse.json({
        success: true,
        supplier: supplier ?? { id: 'admin', companyName: '管理員檢視', taxId: '00000000', status: 'ACTIVE' },
      });
    }

    // 正常模式：查詢當前使用者的供應商關係
    const userSupplier = await prisma.userSupplier.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: {
        supplier: {
          select: {
            id: true,
            companyName: true,
            taxId: true,
            status: true,
          },
        },
      },
    });

    if (!userSupplier) {
      return NextResponse.json(
        { success: false, error: '您目前沒有供應商帳號' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, supplier: userSupplier.supplier });
  } catch (error) {
    console.error('取得供應商資料錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
