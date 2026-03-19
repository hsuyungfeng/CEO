import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    // 確認供應商存在
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, companyName: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: '供應商不存在' },
        { status: 404 }
      );
    }

    const where = {
      supplierId: id,
      isActive: true,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [products, total] = await Promise.all([
      prisma.supplierProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplierProduct.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.imageUrl,
        unit: p.unit,
        spec: null,
        category: p.category ?? null,
        priceTiers: [{ minQty: p.moq, price: Number(p.price) }],
        totalSold: 0,
        createdAt: p.createdAt,
        sku: p.SKU,
        stock: p.stock,
        description: p.description,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('取得供應商商品錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
