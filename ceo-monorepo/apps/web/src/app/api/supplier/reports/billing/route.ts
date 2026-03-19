/**
 * 供應商帳單報表 API
 * GET /api/supplier/reports/billing
 * 
 * 提供供應商的帳單狀態報表，包括：
 * - 帳戶餘額資訊
 * - 帳單狀態統計
 * - 最近交易記錄
 * - 逾期帳單詳情
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// 查詢參數 schema
const querySchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(),   // YYYY-MM-DD
  detailed: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
})

export async function GET(request: NextRequest) {
  try {
    // 驗證用戶身份
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '請先登入帳號' },
        { status: 401 }
      )
    }

    // 檢查用戶是否為供應商主帳號或附屬帳號
    const userSupplier = await prisma.userSupplier.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['MAIN_ACCOUNT', 'SUB_ACCOUNT'] },
      },
      include: {
        supplier: {
          include: {
            account: true,
          },
        },
      },
    })

    if (!userSupplier || !userSupplier.supplier) {
      return NextResponse.json(
        { success: false, error: '您不是供應商帳號' },
        { status: 403 }
      )
    }

    const supplier = userSupplier.supplier
    const account = supplier.account

    // 解析查詢參數
    const { searchParams } = new URL(request.url)
    const query = querySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      detailed: searchParams.get('detailed'),
    })

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: '查詢參數錯誤', details: query.error.issues },
        { status: 400 }
      )
    }

    const { startDate, endDate, detailed } = query.data

    // 構建日期過濾條件
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      dateFilter.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    // 獲取帳單數據
    const [invoices, transactions, reminders] = await Promise.all([
      // 帳單列表
      prisma.supplierInvoice.findMany({
        where: {
          supplierId: supplier.id,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        orderBy: { dueDate: 'desc' },
        take: detailed ? 100 : 20,
      }),
      
      // 最近交易記錄
      prisma.supplierTransaction.findMany({
        where: {
          supplierId: supplier.id,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: detailed ? 50 : 10,
      }),
      
      // 付款提醒記錄
      prisma.paymentReminder.findMany({
        where: {
          supplierId: supplier.id,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // 計算統計數據
    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const paidAmount = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const unpaidAmount = invoices
      .filter(inv => inv.status === 'UNPAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const overdueAmount = invoices
      .filter(inv => inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

    const invoiceStats = {
      total: totalInvoices,
      totalAmount,
      paid: invoices.filter(inv => inv.status === 'PAID').length,
      paidAmount,
      unpaid: invoices.filter(inv => inv.status === 'UNPAID').length,
      unpaidAmount,
      overdue: invoices.filter(inv => inv.status === 'OVERDUE').length,
      overdueAmount,
    }

    // 交易統計
    const depositAmount = transactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const chargeAmount = transactions
      .filter(t => t.type === 'MONTHLY_CHARGE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // 構建報表響應
    const report = {
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          companyName: supplier.companyName,
          taxId: supplier.taxId,
          status: supplier.status,
          isVerified: supplier.isVerified,
        },
        account: {
          balance: account?.balance || 0,
          totalSpent: account?.totalSpent || 0,
          billingRate: account?.billingRate || 0,
          creditLimit: account?.creditLimit || 0,
          isSuspended: account?.isSuspended || false,
        },
        statistics: {
          invoices: invoiceStats,
          transactions: {
            total: transactions.length,
            depositAmount,
            chargeAmount,
            lastUpdated: transactions[0]?.createdAt || null,
          },
          reminders: {
            total: reminders.length,
            lastSent: reminders[0]?.sentAt || null,
          },
        },
        // 詳細數據（根據 detailed 參數決定是否包含）
        ...(detailed ? {
          detailedData: {
            invoices: invoices.map(inv => ({
              id: inv.id,
              invoiceNo: inv.invoiceNo,
              type: inv.type,
              totalAmount: inv.totalAmount,
              status: inv.status,
              dueDate: inv.dueDate,
              createdAt: inv.createdAt,
              paidAt: inv.paidAt,
            })),
            transactions: transactions.map(t => ({
              id: t.id,
              type: t.type,
              amount: t.amount,
              note: t.note,
              balanceBefore: t.balanceBefore,
              balanceAfter: t.balanceAfter,
              createdAt: t.createdAt,
            })),
            reminders: reminders.map(r => ({
              id: r.id,
              type: r.type,
              balance: r.balance,
              dueAmount: r.dueAmount,
              daysOverdue: r.daysOverdue,
              sentAt: r.sentAt,
            })),
          },
        } : {}),
        summary: {
          currentBalance: Number(account?.balance || 0),
          outstandingAmount: unpaidAmount + overdueAmount,
          nextPaymentDue: invoices
            .filter(inv => inv.status === 'UNPAID' && inv.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]?.dueDate || null,
          lowBalanceWarning: Number(account?.balance || 0) < 1000,
        },
        timeframe: {
          startDate: startDate || '全部',
          endDate: endDate || '現在',
          generatedAt: new Date().toISOString(),
        },
      },
    }

    return NextResponse.json(report)

  } catch (error) {
    console.error('供應商帳單報表錯誤:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}