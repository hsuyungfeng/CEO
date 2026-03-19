import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/groups/[id] - 取得單一團購詳情（以 groupId 聚合）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    const orders = await prisma.order.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: '團購不存在' },
        { status: 404 }
      );
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalItems = orders[0].groupTotalItems ?? 0;
    const discountPercentage = totalItems >= 500 ? 10 : totalItems >= 100 ? 5 : 0;

    return NextResponse.json({
      success: true,
      data: {
        id: groupId,
        name: `團購 ${groupId.slice(-6)}`,
        status: orders[0].status,
        memberCount: orders.length,
        totalAmount,
        totalItems,
        discountPercentage,
        deadline: orders[0].groupDeadline?.toISOString() ?? null,
        createdAt: orders[0].createdAt.toISOString(),
        orders: orders.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          groupRefund: Number(o.groupRefund ?? 0),
          isGroupLeader: o.isGroupLeader,
          createdAt: o.createdAt.toISOString(),
          user: o.user,
          items: o.items.map(i => ({
            productName: i.product?.name ?? '未知商品',
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        })),
      },
    });
  } catch (error) {
    console.error('獲取團購詳情錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
