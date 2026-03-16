import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const productImages = await prisma.productImage.findMany({
      include: {
        product: { select: { name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = productImages.map((img) => ({
      id: img.id,
      productId: img.productId,
      productName: img.product.name,
      imageUrl: img.imageUrl,
      alt: img.alt || '',
      sortOrder: img.sortOrder,
      isMain: img.isMain,
      uploadedAt: img.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('獲取產品圖片錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
