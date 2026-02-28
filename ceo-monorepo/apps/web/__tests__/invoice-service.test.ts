import { Prisma } from '@prisma/client'
import {
  generateMonthlyInvoices,
  sendInvoices,
  confirmInvoice,
  markInvoicePaid,
  getInvoicesByStatus,
  getInvoiceDetails
} from '@/lib/invoice-service'

// Mock the prisma module
jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    order: {
      findMany: jest.fn()
    },
    invoice: {
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    invoiceLineItem: {
      create: jest.fn()
    },
    $disconnect: jest.fn()
  }
  return { prisma: mockPrisma }
})

import { prisma } from '@/lib/prisma'

describe('Invoice Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateMonthlyInvoices', () => {
    test('should create invoices for MONTHLY_BILLING orders in the billing month', async () => {
      // Setup: Mock data
      const userId = 'user-1'
      const billingMonth = '2026-02'

      const mockOrders = [
        {
          id: 'order-1',
          userId,
          orderNo: 'ORD-001',
          status: 'COMPLETED',
          paymentMethod: 'MONTHLY_BILLING',
          totalAmount: new Prisma.Decimal('1000.00'),
          createdAt: new Date('2026-02-15'),
          items: [
            {
              id: 'item-1',
              quantity: 1,
              unitPrice: new Prisma.Decimal('1000.00'),
              subtotal: new Prisma.Decimal('1000.00'),
              product: {
                id: 'prod-1',
                name: 'Product 1'
              }
            }
          ],
          user: {
            id: userId,
            email: 'test@example.com'
          }
        }
      ]

      ;(prisma.order.findMany as jest.Mock).mockResolvedValueOnce(mockOrders)
      ;(prisma.invoice.count as jest.Mock).mockResolvedValueOnce(0)
      ;(prisma.invoice.create as jest.Mock).mockResolvedValueOnce({
        id: 'inv-1',
        invoiceNo: 'INV-2026-02-001',
        userId,
        billingMonth,
        billingStartDate: new Date('2026-02-01'),
        billingEndDate: new Date('2026-03-01'),
        totalAmount: new Prisma.Decimal('1000.00'),
        totalItems: 1,
        status: 'DRAFT',
        sentAt: null,
        confirmedAt: null,
        paidAt: null
      })
      ;(prisma.invoiceLineItem.create as jest.Mock).mockResolvedValueOnce({
        id: 'line-1',
        invoiceId: 'inv-1',
        orderId: 'order-1',
        productName: 'Product 1',
        quantity: 1,
        unitPrice: new Prisma.Decimal('1000.00'),
        subtotal: new Prisma.Decimal('1000.00')
      })

      const invoices = await generateMonthlyInvoices(billingMonth)

      expect(invoices).toHaveLength(1)
      expect(invoices[0].userId).toBe(userId)
      expect(parseFloat(invoices[0].totalAmount.toString())).toBe(1000)
      expect(invoices[0].status).toBe('DRAFT')
      expect(invoices[0].billingMonth).toBe(billingMonth)
    })

    test('should group multiple orders by user', async () => {
      const userId = 'user-2'
      const billingMonth = '2026-02'

      const mockOrders = [
        {
          id: 'order-1',
          userId,
          orderNo: 'ORD-001',
          status: 'COMPLETED',
          paymentMethod: 'MONTHLY_BILLING',
          totalAmount: new Prisma.Decimal('500.00'),
          createdAt: new Date('2026-02-15'),
          items: [
            {
              id: 'item-1',
              quantity: 1,
              unitPrice: new Prisma.Decimal('500.00'),
              subtotal: new Prisma.Decimal('500.00'),
              product: {
                id: 'prod-1',
                name: 'Product 1'
              }
            }
          ],
          user: {
            id: userId,
            email: 'test@example.com'
          }
        },
        {
          id: 'order-2',
          userId,
          orderNo: 'ORD-002',
          status: 'COMPLETED',
          paymentMethod: 'MONTHLY_BILLING',
          totalAmount: new Prisma.Decimal('600.00'),
          createdAt: new Date('2026-02-20'),
          items: [
            {
              id: 'item-2',
              quantity: 1,
              unitPrice: new Prisma.Decimal('600.00'),
              subtotal: new Prisma.Decimal('600.00'),
              product: {
                id: 'prod-2',
                name: 'Product 2'
              }
            }
          ],
          user: {
            id: userId,
            email: 'test@example.com'
          }
        }
      ]

      ;(prisma.order.findMany as jest.Mock).mockResolvedValueOnce(mockOrders)
      ;(prisma.invoice.count as jest.Mock).mockResolvedValueOnce(0)
      ;(prisma.invoice.create as jest.Mock).mockResolvedValueOnce({
        id: 'inv-1',
        invoiceNo: 'INV-2026-02-001',
        userId,
        billingMonth,
        billingStartDate: new Date('2026-02-01'),
        billingEndDate: new Date('2026-03-01'),
        totalAmount: new Prisma.Decimal('1100.00'),
        totalItems: 2,
        status: 'DRAFT',
        sentAt: null,
        confirmedAt: null,
        paidAt: null
      })
      ;(prisma.invoiceLineItem.create as jest.Mock)
        .mockResolvedValueOnce({
          id: 'line-1',
          invoiceId: 'inv-1',
          orderId: 'order-1',
          productName: 'Product 1',
          quantity: 1,
          unitPrice: new Prisma.Decimal('500.00'),
          subtotal: new Prisma.Decimal('500.00')
        })
        .mockResolvedValueOnce({
          id: 'line-2',
          invoiceId: 'inv-1',
          orderId: 'order-2',
          productName: 'Product 2',
          quantity: 1,
          unitPrice: new Prisma.Decimal('600.00'),
          subtotal: new Prisma.Decimal('600.00')
        })

      const invoices = await generateMonthlyInvoices(billingMonth)

      expect(invoices).toHaveLength(1)
      expect(parseFloat(invoices[0].totalAmount.toString())).toBe(1100)
      expect(invoices[0].totalItems).toBe(2)
    })

    test('should return empty array when no MONTHLY_BILLING orders exist', async () => {
      ;(prisma.order.findMany as jest.Mock).mockResolvedValueOnce([])

      const invoices = await generateMonthlyInvoices('2026-02')

      expect(invoices).toHaveLength(0)
    })

    test('should throw error for invalid billing month format', async () => {
      await expect(generateMonthlyInvoices('invalid')).rejects.toThrow()
    })
  })

  describe('sendInvoices', () => {
    test('should update status to SENT for given invoice IDs', async () => {
      const invoiceIds = ['inv-1', 'inv-2']

      ;(prisma.invoice.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 2
      })

      const result = await sendInvoices(invoiceIds)

      expect(result.count).toBe(2)
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: invoiceIds
          }
        },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date)
        }
      })
    })

    test('should return count 0 for empty invoice IDs array', async () => {
      const result = await sendInvoices([])

      expect(result.count).toBe(0)
      expect(prisma.invoice.updateMany).not.toHaveBeenCalled()
    })

    test('should handle multiple invoices', async () => {
      const invoiceIds = ['inv-1', 'inv-2', 'inv-3']

      ;(prisma.invoice.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 3
      })

      const result = await sendInvoices(invoiceIds)

      expect(result.count).toBe(3)
    })
  })

  describe('confirmInvoice', () => {
    test('should update status to CONFIRMED', async () => {
      const invoiceId = 'inv-1'

      ;(prisma.invoice.update as jest.Mock).mockResolvedValueOnce({
        id: invoiceId,
        invoiceNo: 'INV-2026-02-001',
        userId: 'user-1',
        billingMonth: '2026-02',
        billingStartDate: new Date('2026-02-01'),
        billingEndDate: new Date('2026-03-01'),
        totalAmount: new Prisma.Decimal('1000.00'),
        totalItems: 1,
        status: 'CONFIRMED',
        sentAt: new Date(),
        confirmedAt: new Date(),
        paidAt: null
      })

      const result = await confirmInvoice(invoiceId)

      expect(result.status).toBe('CONFIRMED')
      expect(result.confirmedAt).toBeDefined()
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: expect.any(Date)
        }
      })
    })
  })

  describe('markInvoicePaid', () => {
    test('should update status to PAID', async () => {
      const invoiceId = 'inv-1'

      ;(prisma.invoice.update as jest.Mock).mockResolvedValueOnce({
        id: invoiceId,
        invoiceNo: 'INV-2026-02-001',
        userId: 'user-1',
        billingMonth: '2026-02',
        billingStartDate: new Date('2026-02-01'),
        billingEndDate: new Date('2026-03-01'),
        totalAmount: new Prisma.Decimal('1000.00'),
        totalItems: 1,
        status: 'PAID',
        sentAt: new Date(),
        confirmedAt: new Date(),
        paidAt: new Date()
      })

      const result = await markInvoicePaid(invoiceId)

      expect(result.status).toBe('PAID')
      expect(result.paidAt).toBeDefined()
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date)
        }
      })
    })
  })

  describe('getInvoicesByStatus', () => {
    test('should fetch invoices by status', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNo: 'INV-2026-02-001',
          userId: 'user-1',
          billingMonth: '2026-02',
          status: 'SENT',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            taxId: 'TAX123'
          },
          lineItems: []
        }
      ]

      ;(prisma.invoice.findMany as jest.Mock).mockResolvedValueOnce(mockInvoices)

      const invoices = await getInvoicesByStatus('SENT')

      expect(invoices).toHaveLength(1)
      expect(invoices[0].status).toBe('SENT')
    })
  })

  describe('getInvoiceDetails', () => {
    test('should fetch invoice with details', async () => {
      const invoiceId = 'inv-1'
      const mockInvoice = {
        id: invoiceId,
        invoiceNo: 'INV-2026-02-001',
        userId: 'user-1',
        billingMonth: '2026-02',
        status: 'CONFIRMED',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          taxId: 'TAX123',
          address: '123 Main St',
          phone: '555-1234',
          fax: '555-5678'
        },
        lineItems: [
          {
            id: 'line-1',
            invoiceId,
            orderId: 'order-1',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: new Prisma.Decimal('1000.00'),
            subtotal: new Prisma.Decimal('1000.00'),
            order: {
              id: 'order-1',
              orderNo: 'ORD-001'
            }
          }
        ]
      }

      ;(prisma.invoice.findUnique as jest.Mock).mockResolvedValueOnce(mockInvoice)

      const invoice = await getInvoiceDetails(invoiceId)

      expect(invoice?.id).toBe(invoiceId)
      expect(invoice?.user).toBeDefined()
      expect(invoice?.lineItems).toHaveLength(1)
    })
  })
})
