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
    const twentyEightDaysAgo = subDays(now, 28)
    const results: Array<{
      invoiceId: string
      supplierId: string
      companyName: string
      amount: Prisma.Decimal
      dueDate: Date
      daysOverdue: number
    }> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchProcessor = new BatchProcessor<any>()

    // 使用游標分頁處理逾期發票，批次大小 100
    const processingResult = await PrismaCursorPagination.processSupplierInvoices(
      prisma,
      {
        status: 'UNPAID',
        dueDate: {
          lt: twentyEightDaysAgo,
        },
      },
      async (invoices) => {
        // 批次處理發票
        await batchProcessor.processItems(invoices, async (invoice) => {
          await prisma.supplierInvoice.update({
            where: { id: invoice.id },
            data: {
              status: 'OVERDUE',
            },
          })

          if (invoice.supplier.status === 'ACTIVE') {
            // 使用事務處理供應商停權
            await prisma.$transaction(async (tx) => {
              await tx.supplier.update({
                where: { id: invoice.supplierId },
                data: {
                  status: 'SUSPENDED',
                },
              })

              const account = await tx.supplierAccount.findUnique({
                where: { supplierId: invoice.supplierId },
              })

              if (account) {
                await tx.supplierAccount.update({
                  where: { id: account.id },
                  data: {
                    isSuspended: true,
                  },
                })
              }
            })
          }

          results.push({
            invoiceId: invoice.id,
            supplierId: invoice.supplierId,
            companyName: invoice.supplier.companyName,
            amount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            daysOverdue: Math.floor(
              (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            ),
          })
        }, {
          continueOnError: true,
          maxErrors: 50,
        })
      },
      {
        batchSize: 100,
        include: {
          supplier: true,
        },
        onProgress: (processed, totalBatches, currentBatch) => {
          console.log(`逾期檢查進度：已處理 ${processed} 張發票，第 ${currentBatch}/${totalBatches} 批次`)
        },
      }
    )

    const batchStats = batchProcessor.getStats()

    auditLogger.cronAction('CRON_CHECK_OVERDUE', {
      overdueCount: results.length,
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
      message: `處理了 ${results.length} 筆逾期帳單（批次處理：${processingResult.totalBatches} 批次，${processingResult.totalProcessed} 張發票）`,
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
    console.error('逾期檢查錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Use POST method' }, { status: 405 })
}