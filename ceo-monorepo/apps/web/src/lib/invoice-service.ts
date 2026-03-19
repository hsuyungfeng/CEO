import { Prisma, InvoiceStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Generate monthly invoices for all users with MONTHLY_BILLING orders in the previous month
 * Groups orders by user and creates one invoice per user
 *
 * @param billingMonth - The billing month in YYYY-MM format (e.g., '2026-02')
 * @returns Array of created Invoice records
 */
export async function generateMonthlyInvoices(billingMonth: string) {
  try {
    // Parse billing month
    const [year, month] = billingMonth.split('-').map(Number)
    if (!year || !month || month < 1 || month > 12) {
      throw new Error(`Invalid billing month format: ${billingMonth}. Expected YYYY-MM`)
    }

    // Calculate date range for the billing month
    const billingStartDate = new Date(year, month - 1, 1)
    const billingEndDate = new Date(year, month, 1)

    // Query all COMPLETED or SHIPPED MONTHLY_BILLING orders from the previous month
    // We use the order's createdAt to determine if it's in the billing month
    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: 'MONTHLY_BILLING',
        status: {
          in: ['COMPLETED', 'SHIPPED']
        },
        createdAt: {
          gte: billingStartDate,
          lt: billingEndDate
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    })

    if (orders.length === 0) {
      return []
    }

    // Group orders by userId
    const ordersByUser = new Map<string, typeof orders>()
    for (const order of orders) {
      const userId = order.userId
      if (!ordersByUser.has(userId)) {
        ordersByUser.set(userId, [])
      }
      ordersByUser.get(userId)!.push(order)
    }

    // Create invoices for each user
    const invoices = []

    for (const [userId, userOrders] of ordersByUser) {
      // Calculate total amount and item count
      let totalAmount = new Prisma.Decimal(0)
      let totalItems = 0

      for (const order of userOrders) {
        totalAmount = totalAmount.plus(order.totalAmount)
        totalItems += order.items.length
      }

      // Generate invoice number: INV-YYYY-MM-sequence
      const existingInvoiceCount = await prisma.invoice.count({
        where: {
          billingMonth,
          invoiceNo: {
            startsWith: `INV-${billingMonth}-`
          }
        }
      })

      const sequence = String(existingInvoiceCount + 1).padStart(3, '0')
      const invoiceNo = `INV-${billingMonth}-${sequence}`

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo,
          userId,
          billingMonth,
          billingStartDate,
          billingEndDate,
          totalAmount,
          totalItems,
          status: 'DRAFT'
        }
      })

      // Create invoice line items for each order
      for (const order of userOrders) {
        for (const item of order.items) {
          await prisma.invoiceLineItem.create({
            data: {
              invoiceId: invoice.id,
              orderId: order.id,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal
            }
          })
        }
      }

      invoices.push(invoice)
    }

    return invoices
  } catch (error) {
    console.error('Error generating monthly invoices:', error)
    throw error
  }
}

/**
 * Send invoices by updating their status to SENT and recording sentAt timestamp
 *
 * @param invoiceIds - Array of invoice IDs to send
 * @returns Object with count of updated invoices
 */
export async function sendInvoices(invoiceIds: string[]) {
  try {
    if (!invoiceIds || invoiceIds.length === 0) {
      return { count: 0 }
    }

    const result = await prisma.invoice.updateMany({
      where: {
        id: {
          in: invoiceIds
        }
      },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    })

    return { count: result.count }
  } catch (error) {
    console.error('Error sending invoices:', error)
    throw error
  }
}

/**
 * Confirm an invoice (employee acknowledges receipt)
 * Updates status to CONFIRMED and records confirmedAt timestamp
 *
 * @param invoiceId - ID of the invoice to confirm
 * @returns Updated Invoice record
 */
export async function confirmInvoice(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.update({
      where: {
        id: invoiceId
      },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
    })

    return invoice
  } catch (error) {
    console.error('Error confirming invoice:', error)
    throw error
  }
}

/**
 * Mark an invoice as paid (admin action)
 * Updates status to PAID and records paidAt timestamp
 *
 * @param invoiceId - ID of the invoice to mark as paid
 * @returns Updated Invoice record
 */
export async function markInvoicePaid(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.update({
      where: {
        id: invoiceId
      },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    })

    return invoice
  } catch (error) {
    console.error('Error marking invoice as paid:', error)
    throw error
  }
}

/**
 * Get invoices by status for reporting and management
 *
 * @param status - Invoice status to filter by
 * @param limit - Number of records to return (default 100)
 * @returns Array of Invoice records with user data
 */
export async function getInvoicesByStatus(status: InvoiceStatus, limit = 100) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            taxId: true
          }
        },
        lineItems: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return invoices
  } catch (error) {
    console.error('Error fetching invoices by status:', error)
    throw error
  }
}

/**
 * Get detailed invoice information
 *
 * @param invoiceId - ID of the invoice to retrieve
 * @returns Invoice record with user and line items
 */
export async function getInvoiceDetails(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            taxId: true,
            address: true,
            phone: true,
            fax: true
          }
        },
        lineItems: {
          include: {
            order: true
          }
        }
      }
    })

    return invoice
  } catch (error) {
    console.error('Error fetching invoice details:', error)
    throw error
  }
}
