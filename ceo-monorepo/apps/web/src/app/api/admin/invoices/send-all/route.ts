import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendInvoices } from '@/lib/invoice-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const { billingMonth } = await request.json()

    if (!billingMonth) {
      return NextResponse.json(
        { error: '計費月份為必填項' },
        { status: 400 }
      )
    }

    // 查找該月份的草稿發票
    const drafts = await prisma.invoice.findMany({
      where: {
        billingMonth,
        status: 'DRAFT'
      }
    })

    if (drafts.length === 0) {
      return NextResponse.json(
        { error: `找不到 ${billingMonth} 的草稿發票` },
        { status: 404 }
      )
    }

    // 發送所有草稿發票
    const result = await sendInvoices(drafts.map(inv => inv.id))

    return NextResponse.json({
      success: true,
      data: { count: result.count },
      message: `已發送 ${result.count} 張發票`
    })
  } catch (error) {
    console.error('發送發票錯誤:', error)
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}
