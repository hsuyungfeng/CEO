/**
 * Phase 4.5 Task 5 — Admin Send Rebates API
 *
 * POST /api/admin/groups/[id]/send-rebates  → 為所有成員建立並發送返利發票
 *
 * 前置條件：
 *   - 必須先呼叫 /finalize（Order.groupRefund 需已填值）
 *   - 冪等操作：已建立的發票會被跳過
 *
 * 流程：
 * 1. 驗證管理員
 * 2. 計算返利（取得最新數據）
 * 3. 建立返利發票（isGroupInvoice=true）
 * 4. 更新發票狀態為 SENT
 * 5. 回傳建立結果
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { calcGroupRebates, createRebateInvoices } from '@/lib/rebate-service'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. 管理員驗證
  const adminCheck = await requireAdmin()
  if ('error' in adminCheck) return adminCheck.error

  try {
    const { id: groupId } = await params

    // 2. 確認已有返利數據（需先執行 finalize）
    const unfinalized = await prisma.order.count({
      where: {
        groupId,
        groupStatus: 'GROUPED',
        groupRefund: { equals: 0 },
        NOT: { groupTotalItems: null },
      },
    })

    if (unfinalized > 0) {
      // 檢查是否有任何非零返利
      const hasRebate = await prisma.order.count({
        where: { groupId, groupRefund: { gt: 0 } },
      })
      if (hasRebate === 0) {
        return NextResponse.json(
          {
            error: '尚未執行結算，或此團購無任何返利金額。請先呼叫 POST /finalize',
          },
          { status: 422 }
        )
      }
    }

    // 3. 取得最新計算結果
    let summary
    try {
      summary = await calcGroupRebates(groupId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    // 4. 建立返利發票（冪等）
    const { created, skipped } = await createRebateInvoices(groupId, summary)

    // 5. 更新剛建立的發票狀態為 SENT（標記已發送）
    if (created > 0) {
      await prisma.invoice.updateMany({
        where: {
          groupId,
          isGroupInvoice: true,
          status: 'DRAFT',
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    }

    // 6. 取得最終發票清單回傳
    const invoices = await prisma.invoice.findMany({
      where: { groupId, isGroupInvoice: true },
      select: {
        id:         true,
        invoiceNo:  true,
        userId:     true,
        totalAmount: true,
        status:     true,
        sentAt:     true,
        user: { select: { name: true, firmName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      message: created > 0
        ? `已成功建立並發送 ${created} 張返利發票`
        : `所有返利發票已在先前發送，本次無新建（略過 ${skipped} 張）`,
      data: {
        groupId,
        discountRate:  summary.discountRate,
        discountPct:   `${(summary.discountRate * 100).toFixed(0)}%`,
        totalRebate:   summary.totalRebate,
        created,
        skipped,
        invoices: invoices.map(inv => ({
          invoiceId:  inv.id,
          invoiceNo:  inv.invoiceNo,
          company:    (inv.user as { firmName?: string }).firmName ?? (inv.user as { name?: string }).name,
          email:      (inv.user as { email?: string }).email,
          rebateAmt:  Number(inv.totalAmount),
          status:     inv.status,
          sentAt:     inv.sentAt,
        })),
      },
    })
  } catch (error) {
    console.error('POST /api/admin/groups/[id]/send-rebates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
