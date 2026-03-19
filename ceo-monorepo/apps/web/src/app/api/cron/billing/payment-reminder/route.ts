import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyCronAuth } from '@/lib/cron-auth'
import { auditLogger } from '@/lib/audit-logger'
import { PrismaCursorPagination, BatchProcessor } from '@/lib/cursor-pagination'

function subDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = verifyCronAuth(request)
    if (!authorized) return response!

    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const results: Array<{
      invoiceId: string
      supplierId: string
      companyName: string
      amount: Prisma.Decimal
      dueDate: Date
      daysSinceDue: number
      reminderType: 'LOW_BALANCE' | 'WEEKLY_REMINDER' | 'FINAL_WARNING' | 'SUSPEND_WARNING'
    }> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchProcessor = new BatchProcessor<any>()

    // 使用游標分頁處理未付款發票，批次大小 100
    const processingResult = await PrismaCursorPagination.processSupplierInvoices(
      prisma,
      {
        status: 'UNPAID',
        dueDate: {
          lte: now,
        },
      },
      async (invoices) => {
        // 批次獲取所有供應商 ID
        const supplierIds = invoices.map(invoice => invoice.supplierId).filter(Boolean)
        
        // 批量查詢哪些供應商已有最近提醒（避免 N+1）
        const recentReminders = await prisma.paymentReminder.findMany({
          where: {
            supplierId: { in: supplierIds },
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
          select: {
            supplierId: true,
          },
          distinct: ['supplierId'],
        })
        
        const suppliersWithRecentReminder = new Set(
          recentReminders.map(reminder => reminder.supplierId)
        )

        // 批次處理發票
        await batchProcessor.processItems(invoices, async (invoice) => {
          if (!invoice.supplier?.account) return

          // 檢查供應商是否有最近提醒
          if (suppliersWithRecentReminder.has(invoice.supplierId)) return

          const daysSinceDue = Math.floor(
            (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          )

          let reminderType: 'LOW_BALANCE' | 'WEEKLY_REMINDER' | 'FINAL_WARNING' | 'SUSPEND_WARNING'
          if (daysSinceDue >= 21) {
            reminderType = 'FINAL_WARNING'
          } else if (daysSinceDue >= 7) {
            reminderType = 'WEEKLY_REMINDER'
          } else {
            reminderType = 'LOW_BALANCE'
          }

          await prisma.paymentReminder.create({
            data: {
              supplierId: invoice.supplierId,
              type: reminderType,
              balance: invoice.supplier.account.balance,
              dueAmount: invoice.totalAmount,
              daysOverdue: daysSinceDue,
              isSent: true,
              sentAt: now,
            },
          })

          results.push({
            invoiceId: invoice.id,
            supplierId: invoice.supplierId,
            companyName: invoice.supplier.companyName,
            amount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            daysSinceDue,
            reminderType,
          })
        }, {
          continueOnError: true,
          maxErrors: 50,
        })
      },
      {
        batchSize: 100,
        include: {
          supplier: {
            include: {
              account: true,
            },
          },
        },
        onProgress: (processed, totalBatches, currentBatch) => {
          console.log(`付款提醒進度：已處理 ${processed} 張發票，第 ${currentBatch}/${totalBatches} 批次`)
        },
      }
    )

    const batchStats = batchProcessor.getStats()

    auditLogger.cronAction('CRON_PAYMENT_REMINDER', {
      remindersSent: results.length,
      batchStats: {
        totalProcessed: processingResult.totalProcessed,
        totalBatches: processingResult.totalBatches,
        success: processingResult.success,
        itemStats: {
          successCount: batchStats.successCount,
          errorCount: batchStats.errorCount,
          totalProcessed: batchStats.totalProcessed,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `發送 ${results.length} 筆付款提醒（批次處理：${processingResult.totalBatches} 批次，${processingResult.totalProcessed} 張發票）`,
      results,
      batchStats: {
        totalProcessed: processingResult.totalProcessed,
        totalBatches: processingResult.totalBatches,
        success: processingResult.success,
        itemStats: {
          successCount: batchStats.successCount,
          errorCount: batchStats.errorCount,
          totalProcessed: batchStats.totalProcessed,
        },
        errors: batchStats.errors.length > 0 ? batchStats.errors.slice(0, 10) : undefined,
      },
    })
  } catch (error) {
    console.error('付款提醒錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Use POST method' }, { status: 405 })
}