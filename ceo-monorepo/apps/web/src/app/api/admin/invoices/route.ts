import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const { searchParams } = new URL(request.url)
    const billingMonth = searchParams.get('billingMonth')
    const status = searchParams.get('status')

    const validStatuses = ['DRAFT', 'SENT', 'CONFIRMED', 'PAID']
    const where: Prisma.InvoiceWhereInput = {}
    if (billingMonth && /^\d{4}-\d{2}$/.test(billingMonth)) {
      where.billingMonth = billingMonth
    }
    if (status && validStatuses.includes(status)) {
      where.status = status as any
    }

    // 同時查詢發票總數
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          lineItems: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length,
      total
    })
  } catch (error) {
    console.error('取得發票列表錯誤:', error)
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}
