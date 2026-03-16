import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;
    const alt = formData.get('alt') as string;

    if (!file || !productId) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageUrl = `data:${file.type};base64,${base64}`;

    const sortOrder = await prisma.productImage.count({
      where: { productId },
    });

    const productImage = await prisma.productImage.create({
      data: {
        productId,
        imageUrl,
        alt: alt || file.name,
        sortOrder: sortOrder + 1,
        isMain: sortOrder === 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: productImage.id,
        url: productImage.imageUrl,
        alt: productImage.alt,
      },
    });
  } catch (error) {
    console.error('上傳圖片錯誤:', error);
    return NextResponse.json(
      { success: false, error: '上傳失敗' },
      { status: 500 }
    );
  }
}
