import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        mainAccount: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            applications: true,
            products: true,
            userSuppliers: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: '供應商不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: supplier.id,
        taxId: supplier.taxId,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        industry: supplier.industry,
        description: supplier.description,
        status: supplier.status,
        isVerified: supplier.isVerified,
        verifiedAt: supplier.verifiedAt,
        verifiedBy: supplier.verifiedBy,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        mainAccount: supplier.mainAccount,
        applicationsCount: supplier._count.applications,
        productsCount: supplier._count.products,
        approvedUsersCount: supplier._count.userSuppliers,
        // Phase 8 評分相關欄位
        avgRating: supplier.avgRating,
        totalRatings: supplier.totalRatings,
        onTimeDeliveryRate: supplier.onTimeDeliveryRate,
        totalDeliveries: supplier.totalDeliveries,
      },
    });

  } catch (error) {
    console.error('取得供應商詳情錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '請先登入帳號' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: '供應商不存在' },
        { status: 404 }
      );
    }

    if (supplier.mainAccountId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: '您無權修改此供應商資訊' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '請求體格式錯誤' },
        { status: 400 }
      );
    }

    const allowedFields = [
      'companyName', 'contactPerson', 'phone', 'email',
      'address', 'industry', 'description'
    ];

    const updateData: {
      companyName?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      industry?: string;
      description?: string;
    } = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '沒有要更新的欄位' },
        { status: 400 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: {
        mainAccount: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        companyName: updated.companyName,
        contactPerson: updated.contactPerson,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        industry: updated.industry,
        description: updated.description,
        updatedAt: updated.updatedAt,
      },
      message: '供應商資訊更新成功',
    });

  } catch (error) {
    console.error('更新供應商錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
