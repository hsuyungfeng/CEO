import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/groups - 聚合 groupId 相同的訂單，回傳團購列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    const status = rawStatus && validStatuses.includes(rawStatus) ? rawStatus : undefined;

    // 查詢所有有 groupId 的訂單，按 groupId 分組
    const orders = await prisma.order.findMany({
      where: {
        groupId: { not: null },
        ...(status ? { status: status as any } : {}),
      },
      select: {
        groupId: true,
        status: true,
        totalAmount: true,
        groupTotalItems: true,
        groupDeadline: true,
        groupRefund: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按 groupId 聚合
    const groupMap = new Map<string, {
      id: string;
      name: string;
      status: string;
      memberCount: number;
      totalAmount: number;
      discountPercentage: number;
      createdAt: string;
      deadline?: string;
    }>();

    for (const order of orders) {
      const gid = order.groupId!;
      if (!groupMap.has(gid)) {
        groupMap.set(gid, {
          id: gid,
          name: `團購 ${gid.slice(-6)}`,
          status: order.status,
          memberCount: 0,
          totalAmount: 0,
          discountPercentage: 0,
          createdAt: order.createdAt.toISOString(),
          deadline: order.groupDeadline?.toISOString(),
        });
      }
      const g = groupMap.get(gid)!;
      g.memberCount += 1;
      g.totalAmount += Number(order.totalAmount);

      // 折扣計算：100件5%，500件10%
      const totalItems = order.groupTotalItems ?? 0;
      if (totalItems >= 500) g.discountPercentage = 10;
      else if (totalItems >= 100) g.discountPercentage = 5;
    }

    return NextResponse.json({
      success: true,
      data: Array.from(groupMap.values()),
    });
  } catch (error) {
    console.error('獲取團購列表錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
