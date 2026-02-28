import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { markInvoicePaid } from '@/lib/invoice-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const invoiceId = params.id

    if (!invoiceId) {
      return NextResponse.json(
        { error: '發票 ID 為必填項' },
        { status: 400 }
      )
    }

    const updated = await markInvoicePaid(invoiceId)

    return NextResponse.json({
      success: true,
      data: updated,
      message: `發票 ${updated.invoiceNo} 已標記為已支付`
    })
  } catch (error: any) {
    console.error('標記發票為已支付錯誤:', error)

    // 處理發票不存在的情況
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '找不到指定的發票' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}
