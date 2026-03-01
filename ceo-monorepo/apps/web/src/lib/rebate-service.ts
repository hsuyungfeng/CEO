/**
 * Phase 4.5 — Rebate Service（返利計算服務）
 *
 * 負責：
 * 1. 計算每筆成員訂單的返利金額
 * 2. 建立返利發票（Invoice with isGroupInvoice=true）
 * 3. 批次更新 Order.groupRefund 欄位
 */

import { prisma } from '@/lib/prisma'
import { getGroupDiscount } from '@/lib/group-buying'
import { Decimal } from '@prisma/client/runtime/library'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderRebateSummary {
  orderId:      string
  orderNo:      string
  userId:       string
  company:      string
  originalAmt:  number  // 原始訂單金額
  qty:          number  // 件數
  rebateAmt:    number  // 返利金額
  discountRate: number  // 折扣率
}

export interface GroupFinalizeSummary {
  groupId:       string
  totalQty:      number
  discountRate:  number
  totalRebate:   number
  memberCount:   number
  orders:        OrderRebateSummary[]
}

// ─── 計算返利（不寫入 DB） ──────────────────────────────────────────────────

/**
 * 計算某個團購所有訂單的返利金額（純計算，不寫入 DB）
 */
export async function calcGroupRebates(groupId: string): Promise<GroupFinalizeSummary> {
  // 取得所有訂單（含團長）
  const allOrders = await prisma.order.findMany({
    where: { groupId },
    select: {
      id:             true,
      orderNo:        true,
      userId:         true,
      totalAmount:    true,
      groupTotalItems: true,
      isGroupLeader:  true,
      user: { select: { name: true, firmName: true } },
    },
  })

  if (allOrders.length === 0) {
    throw new Error(`找不到 groupId=${groupId} 的訂單`)
  }

  // 計算總件數 + 折扣率
  const totalQty    = allOrders.reduce((s, o) => s + (o.groupTotalItems ?? 0), 0)
  const discountRate = getGroupDiscount(totalQty)

  // 計算每筆訂單的返利
  const orders: OrderRebateSummary[] = allOrders.map(o => {
    const originalAmt = Number(o.totalAmount)
    const rebateAmt   = Math.round(originalAmt * discountRate * 100) / 100
    return {
      orderId:      o.id,
      orderNo:      o.orderNo,
      userId:       o.userId,
      company:      o.user.firmName ?? o.user.name ?? '未知',
      originalAmt,
      qty:          o.groupTotalItems ?? 0,
      rebateAmt,
      discountRate,
    }
  })

  const totalRebate = orders.reduce((s, o) => s + o.rebateAmt, 0)
  const memberCount = allOrders.filter(o => !o.isGroupLeader).length

  return { groupId, totalQty, discountRate, totalRebate, memberCount, orders }
}

// ─── 寫入返利金額（finalize 步驟）──────────────────────────────────────────

/**
 * 將計算好的返利金額寫入每筆訂單的 groupRefund 欄位
 */
export async function applyGroupRebates(summary: GroupFinalizeSummary): Promise<void> {
  await prisma.$transaction(
    summary.orders.map(o =>
      prisma.order.update({
        where: { id: o.orderId },
        data:  { groupRefund: new Decimal(o.rebateAmt) },
      })
    )
  )
}

// ─── 建立返利發票 ─────────────────────────────────────────────────────────────

/**
 * 為每個成員建立一張返利發票（isGroupInvoice=true）
 * 已存在者略過（冪等操作）
 */
export async function createRebateInvoices(
  groupId:   string,
  summary:   GroupFinalizeSummary
): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0
  const now = new Date()
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  for (const o of summary.orders) {
    if (o.rebateAmt <= 0) { skipped++; continue }

    // 冪等：若已有此 groupId + userId 的返利發票則略過
    const existing = await prisma.invoice.findFirst({
      where: { groupId, userId: o.userId, isGroupInvoice: true },
    })
    if (existing) { skipped++; continue }

    const invoiceNo = `RBT-${groupId.slice(0, 6).toUpperCase()}-${o.userId.slice(0, 6).toUpperCase()}`

    // 找到對應訂單（用來建 lineItem）
    const order = await prisma.order.findUnique({
      where: { id: o.orderId },
      include: { items: { include: { product: true } } },
    })

    if (!order) { skipped++; continue }

    await prisma.invoice.create({
      data: {
        invoiceNo,
        userId:         o.userId,
        billingMonth,
        billingStartDate: now,
        billingEndDate:   now,
        totalAmount:    new Decimal(o.rebateAmt),
        totalItems:     o.qty,
        status:         'DRAFT',
        isGroupInvoice: true,
        groupId,
        lineItems: {
          create: order.items.map(item => ({
            orderId:    o.orderId,
            productName: item.product?.name ?? '商品',
            quantity:   item.quantity,
            unitPrice:  item.unitPrice,
            subtotal:   new Decimal(
              Math.round(Number(item.subtotal) * summary.discountRate * 100) / 100
            ),
          })),
        },
      },
    })
    created++
  }

  return { created, skipped }
}
