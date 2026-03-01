/**
 * Phase 4.5 Task 5 — Admin Finalize Group API
 *
 * POST /api/admin/groups/[id]/finalize  → 結算團購（計算 + 寫入返利）
 *
 * 步驟：
 * 1. 驗證管理員身份
 * 2. 確認團購存在（已截止或管理員強制結算）
 * 3. 計算每位成員的返利金額
 * 4. 批次更新 Order.groupRefund
 * 5. 將所有訂單狀態改為 CONFIRMED
 * 6. 回傳結算摘要
 *
 * 冪等：若已有返利資料，可選擇 force=true 強制重算
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { calcGroupRebates, applyGroupRebates } from '@/lib/rebate-service'

const bodySchema = z.object({
  force: z.boolean().optional().default(false), // 強制重新結算
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. 管理員驗證
  const adminCheck = await requireAdmin()
  if ('error' in adminCheck) return adminCheck.error

  try {
    const { id: groupId } = await params

    // 2. 解析 body
    let body: unknown = {}
    try { body = await request.json() } catch { /* body 可為空 */ }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '參數格式錯誤', details: parsed.error.issues },
        { status: 400 }
      )
    }
    const { force } = parsed.data

    // 3. 計算返利（純計算，不含寫入）
    let summary
    try {
      summary = await calcGroupRebates(groupId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    // 4. 冪等保護：若折扣率 0 且非強制則警告
    if (summary.discountRate === 0 && !force) {
      return NextResponse.json(
        {
          error: '此團購目前件數未達折扣門檻（需滿 100 件），返利金額為 0。若仍要結算請帶 force: true',
          data: { totalQty: summary.totalQty, discountRate: 0 },
        },
        { status: 422 }
      )
    }

    // 5. 寫入返利至各訂單
    await applyGroupRebates(summary)

    return NextResponse.json({
      success: true,
      message: '團購結算完成，返利已寫入各訂單',
      data: {
        groupId:       summary.groupId,
        totalQty:      summary.totalQty,
        discountRate:  summary.discountRate,
        discountPct:   `${(summary.discountRate * 100).toFixed(0)}%`,
        totalRebate:   summary.totalRebate,
        memberCount:   summary.memberCount,
        orders: summary.orders.map(o => ({
          orderId:     o.orderId,
          orderNo:     o.orderNo,
          company:     o.company,
          qty:         o.qty,
          originalAmt: o.originalAmt,
          rebateAmt:   o.rebateAmt,
        })),
      },
    })
  } catch (error) {
    console.error('POST /api/admin/groups/[id]/finalize error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
