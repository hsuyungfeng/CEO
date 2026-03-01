/**
 * Phase 4.5 Task 3 — Group Detail API
 *
 * GET /api/groups/[id]  → 查看團購詳情（含成員訂單摘要）
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupDiscount, GROUP_DISCOUNT_TIERS } from '@/lib/group-buying'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params

    if (!groupId) {
      return NextResponse.json({ error: '缺少 groupId' }, { status: 400 })
    }

    // 取得團長訂單
    const leaderOrder = await prisma.order.findFirst({
      where: { groupId, isGroupLeader: true },
      include: {
        user: { select: { id: true, name: true, firmName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, unit: true, price: true } },
          },
        },
      },
    })

    if (!leaderOrder) {
      return NextResponse.json({ error: '找不到此團購' }, { status: 404 })
    }

    // 取得成員訂單摘要
    const memberOrders = await prisma.order.findMany({
      where: { groupId, isGroupLeader: false },
      select: {
        id: true,
        orderNo: true,
        groupTotalItems: true,
        totalAmount: true,
        groupRefund: true,
        createdAt: true,
        user: { select: { id: true, name: true, firmName: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // 計算統計數據
    const leaderQty  = leaderOrder.orderItems.reduce((s, i) => s + i.quantity, 0)
    const memberQty  = memberOrders.reduce((s, o) => s + (o.groupTotalItems ?? 0), 0)
    const totalQty   = leaderQty + memberQty
    const discount   = getGroupDiscount(totalQty)
    const isActive   = leaderOrder.groupDeadline
      ? leaderOrder.groupDeadline > new Date()
      : false

    // 計算下一階梯需要多少件數
    const nextTier = GROUP_DISCOUNT_TIERS.find(t => t.minQty > totalQty)
    const qtyToNextTier = nextTier ? nextTier.minQty - totalQty : null

    return NextResponse.json({
      success: true,
      data: {
        groupId,
        isActive,
        deadline: leaderOrder.groupDeadline,
        title: leaderOrder.note?.split('\n')[0] ?? '團購活動',

        // 發起公司
        leader: {
          orderId:  leaderOrder.id,
          orderNo:  leaderOrder.orderNo,
          company:  leaderOrder.user.firmName ?? leaderOrder.user.name,
          qty:      leaderQty,
        },

        // 商品資訊
        product: leaderOrder.orderItems[0]?.product ?? null,

        // 成員列表（僅公開公司名稱與件數）
        members: memberOrders.map(o => ({
          orderId: o.id,
          orderNo: o.orderNo,
          company: o.user.firmName ?? o.user.name,
          qty:     o.groupTotalItems ?? 0,
          joinedAt: o.createdAt,
        })),

        // 統計
        stats: {
          memberCount:     memberOrders.length,
          totalQty,
          currentDiscount: discount,
          currentDiscountPct: `${(discount * 100).toFixed(0)}%`,
          qtyToNextTier,
          nextTierDiscount: nextTier?.discount ?? null,
        },

        // 折扣階梯
        discountTiers: GROUP_DISCOUNT_TIERS,
      },
    })
  } catch (error) {
    console.error('GET /api/groups/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
