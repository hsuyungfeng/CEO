import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { generateMonthlyInvoices } from '@/lib/invoice-service'

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const { billingMonth } = await request.json()

    // 驗證 billingMonth 格式 (YYYY-MM)
    if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) {
      return NextResponse.json(
        { error: '無效的計費月份格式，請使用 YYYY-MM' },
        { status: 400 }
      )
    }

    const invoices = await generateMonthlyInvoices(billingMonth)

    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length,
      message: `已為 ${billingMonth} 生成 ${invoices.length} 張發票`
    })
  } catch (error) {
    console.error('生成月度發票錯誤:', error)
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}
