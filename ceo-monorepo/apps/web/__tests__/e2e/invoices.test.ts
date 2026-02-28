import { Prisma } from '@prisma/client'

// Define mock data BEFORE the mock is created
let mockDataStore: Record<string, any[]> = {
  users: [],
  orders: [],
  invoices: [],
  lineItems: []
}

// Function to reset all data between tests
const resetMockDataStore = () => {
  mockDataStore.users.length = 0
  mockDataStore.orders.length = 0
  mockDataStore.invoices.length = 0
  mockDataStore.lineItems.length = 0
}

// Mock the prisma module for E2E testing
jest.mock('@/lib/prisma', () => {
  // Return a getter that creates fresh mocks each time
  return {
    get prisma() {
      // Access mockDataStore from module scope when needed
      const mockData = mockDataStore

    return {
      user: {
        create: jest.fn(async ({ data }) => {
          const user = { id: `user-${Date.now()}-${Math.random()}`, ...data }
          mockData.users.push(user)
          return user
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = mockData.users.findIndex(u => u.id === where.id)
          if (idx !== -1) {
            const user = mockData.users[idx]
            mockData.users.splice(idx, 1)
            return user
          }
          return null
        }),
        deleteMany: jest.fn(async ({ where }) => {
          if (where?.OR) {
            const before = mockData.users.length
            mockData.users = mockData.users.filter(u => !where.OR.some((cond: any) => cond.id === u.id))
            return { count: before - mockData.users.length }
          }
          return { count: 0 }
        })
      },
      order: {
        create: jest.fn(async ({ data }) => {
          const order = {
            id: `order-${Date.now()}-${Math.random()}`,
            userId: data.userId,
            orderNo: data.orderNo,
            status: data.status,
            paymentMethod: data.paymentMethod,
            totalAmount: data.totalAmount,
            items: data.items || [],
            createdAt: data.createdAt || new Date()
          }
          mockData.orders.push(order)
          return order
        }),
        findMany: jest.fn(async ({ where, include }) => {
          let results = [...mockData.orders]

          if (where?.paymentMethod) {
            results = results.filter(o => o.paymentMethod === where.paymentMethod)
          }
          if (where?.status?.in) {
            results = results.filter(o => where.status.in.includes(o.status))
          }
          if (where?.createdAt?.gte && where?.createdAt?.lt) {
            results = results.filter(o => {
              const createdAt = o.createdAt ? new Date(o.createdAt) : new Date()
              const gte = new Date(where.createdAt.gte)
              const lt = new Date(where.createdAt.lt)
              const match = createdAt >= gte && createdAt < lt
              return match
            })
          }

          const mapped = results.map(o => ({
            ...o,
            user: mockData.users.find(u => u.id === o.userId)
          }))

          // Add items with product data if include.items is requested
          if (include?.items) {
            return mapped.map(o => ({
              ...o,
              items: (o.items as any[])?.map((item: any) => ({
                ...item,
                product: item.product || { id: item.productId, name: 'Product' }
              })) || []
            }))
          }
          return mapped
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = mockData.orders.findIndex(o => o.id === where.id)
          if (idx !== -1) {
            const order = mockData.orders[idx]
            mockData.orders.splice(idx, 1)
            return order
          }
          return null
        }),
        deleteMany: jest.fn(async ({ where }) => {
          if (where?.OR) {
            const before = mockData.orders.length
            mockData.orders = mockData.orders.filter(o => !where.OR.some((cond: any) => cond.userId === o.userId))
            return { count: before - mockData.orders.length }
          }
          return { count: 0 }
        })
      },
      invoice: {
        count: jest.fn(async ({ where }) => {
          return mockData.invoices.filter(inv => {
            if (where?.billingMonth && inv.billingMonth !== where.billingMonth) return false
            return true
          }).length
        }),
        create: jest.fn(async ({ data }) => {
          const invoice = {
            id: `invoice-${Date.now()}-${Math.random()}`,
            sentAt: null,
            confirmedAt: null,
            paidAt: null,
            ...data
          }
          mockData.invoices.push(invoice)
          return invoice
        }),
        findUnique: jest.fn(async ({ where, include }) => {
          const invoice = mockData.invoices.find(i => i.id === where.id)
          if (invoice && include?.lineItems) {
            return { ...invoice, lineItems: mockData.lineItems.filter(l => l.invoiceId === invoice.id) }
          }
          return invoice
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const toUpdate = mockData.invoices.filter(i => where.id.in.includes(i.id))
          toUpdate.forEach(inv => Object.assign(inv, data))
          return { count: toUpdate.length }
        }),
        update: jest.fn(async ({ where, data }) => {
          const invoice = mockData.invoices.find(i => i.id === where.id)
          if (invoice) {
            Object.assign(invoice, data)
          }
          return invoice
        }),
        findMany: jest.fn(async () => {
          return mockData.invoices
        }),
        deleteMany: jest.fn(async ({ where }) => {
          if (where?.OR) {
            const before = mockData.invoices.length
            mockData.invoices = mockData.invoices.filter(inv => !where.OR.some((cond: any) => cond.userId === inv.userId))
            return { count: before - mockData.invoices.length }
          }
          return { count: 0 }
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = mockData.invoices.findIndex(i => i.id === where.id)
          if (idx !== -1) {
            const invoice = mockData.invoices[idx]
            mockData.invoices.splice(idx, 1)
            return invoice
          }
          return null
        })
      },
      invoiceLineItem: {
        create: jest.fn(async ({ data }) => {
          const lineItem = { id: `line-${Date.now()}-${Math.random()}`, ...data }
          mockData.lineItems.push(lineItem)
          return lineItem
        }),
        findMany: jest.fn(async ({ where }) => {
          return mockData.lineItems.filter(l => l.invoiceId === where.invoiceId)
        }),
        deleteMany: jest.fn(async ({ where }) => {
          const before = mockData.lineItems.length
          mockData.lineItems = mockData.lineItems.filter(l => l.invoiceId !== where.invoiceId)
          return { count: before - mockData.lineItems.length }
        })
      },
      $disconnect: jest.fn(async () => {})
    }
    }
  }
})

import { prisma } from '@/lib/prisma'
import { generateMonthlyInvoices, sendInvoices, confirmInvoice, markInvoicePaid } from '@/lib/invoice-service'

describe('Invoice E2E Flow', () => {
  beforeEach(() => {
    // Reset mock data and clear jest mocks before each test to ensure test isolation
    resetMockDataStore()
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('complete monthly billing flow - DRAFT to PAID', async () => {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        email: `e2e-test-${Date.now()}@example.com`,
        taxId: `E2E${Date.now()}`,
        password: 'hashed_password',
        name: 'E2E Test User',
        role: 'MEMBER',
        status: 'ACTIVE'
      }
    })

    // 2. Create test orders for MONTHLY_BILLING
    const orderDate = new Date(2026, 0, 15) // January 15, 2026
    const billingMonth = '2026-01'

    const order1 = await prisma.order.create({
      data: {
        userId: user.id,
        orderNo: `E2E-ORD-${Date.now()}-1`,
        status: 'COMPLETED',
        paymentMethod: 'MONTHLY_BILLING',
        totalAmount: new Prisma.Decimal('5000.00'),
        items: [{
          productId: 'prod-1',
          quantity: 5,
          unitPrice: new Prisma.Decimal('1000.00'),
          subtotal: new Prisma.Decimal('5000.00'),
          product: { id: 'prod-1', name: 'Test Product 1' }
        }],
        createdAt: orderDate
      }
    })

    const order2 = await prisma.order.create({
      data: {
        userId: user.id,
        orderNo: `E2E-ORD-${Date.now()}-2`,
        status: 'COMPLETED',
        paymentMethod: 'MONTHLY_BILLING',
        totalAmount: new Prisma.Decimal('3000.00'),
        items: [{
          productId: 'prod-2',
          quantity: 3,
          unitPrice: new Prisma.Decimal('1000.00'),
          subtotal: new Prisma.Decimal('3000.00'),
          product: { id: 'prod-2', name: 'Test Product 2' }
        }],
        createdAt: orderDate
      }
    })

    // 3. Generate monthly invoices (DRAFT state)
    const invoices = await generateMonthlyInvoices(billingMonth)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].userId).toBe(user.id)
    expect(invoices[0].totalAmount).toEqual(new Prisma.Decimal('8000.00'))
    expect(invoices[0].status).toBe('DRAFT')
    expect(invoices[0].sentAt).toBeNull()

    const invoiceId = invoices[0].id

    // 4. Send invoices (SENT state)
    const sendResult = await sendInvoices([invoiceId])
    expect(sendResult.count).toBe(1)

    // Verify invoice is now SENT
    let invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })
    expect(invoice?.status).toBe('SENT')
    expect(invoice?.sentAt).not.toBeNull()

    // 5. Employee confirms invoice (CONFIRMED state)
    const confirmed = await confirmInvoice(invoiceId)
    expect(confirmed.status).toBe('CONFIRMED')
    expect(confirmed.confirmedAt).not.toBeNull()

    // 6. Admin marks as paid (PAID state)
    const paid = await markInvoicePaid(invoiceId)
    expect(paid.status).toBe('PAID')
    expect(paid.paidAt).not.toBeNull()

    // 7. Verify final state
    invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lineItems: true }
    })
    expect(invoice?.status).toBe('PAID')
    expect(invoice?.lineItems.length).toBe(2) // Two orders = two line items
    expect(invoice?.totalItems).toBe(2)

    // Cleanup
    await prisma.invoiceLineItem.deleteMany({
      where: { invoiceId }
    })
    await prisma.invoice.delete({
      where: { id: invoiceId }
    })
    await prisma.order.deleteMany({
      where: { userId: user.id }
    })
    await prisma.user.delete({
      where: { id: user.id }
    })
  })

  test('invoice line items are created correctly', async () => {
    // Create test user and orders with items
    const user = await prisma.user.create({
      data: {
        email: `e2e-items-${Date.now()}@example.com`,
        taxId: `E2ITEMS${Date.now()}`,
        password: 'hashed',
        name: 'Items Test User',
        role: 'MEMBER',
        status: 'ACTIVE'
      }
    })

    const orderDate2 = new Date(2026, 0, 15) // January 15, 2026
    const billingMonth = '2026-01'

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNo: `E2E-ITEMS-${Date.now()}`,
        status: 'COMPLETED',
        paymentMethod: 'MONTHLY_BILLING',
        totalAmount: new Prisma.Decimal('1500.00'),
        items: [{
          productId: 'prod-1',
          quantity: 1,
          unitPrice: new Prisma.Decimal('1500.00'),
          subtotal: new Prisma.Decimal('1500.00'),
          product: { id: 'prod-1', name: 'Test Product' }
        }],
        createdAt: orderDate2
      }
    })

    // Generate invoice
    const invoices = await generateMonthlyInvoices(billingMonth)
    expect(invoices.length).toBeGreaterThan(0)

    const invoice = invoices.find(inv => inv.userId === user.id)
    expect(invoice).toBeDefined()

    // Verify line items
    const lineItems = await prisma.invoiceLineItem.findMany({
      where: { invoiceId: invoice!.id }
    })
    expect(lineItems).toHaveLength(1)
    expect(lineItems[0].orderId).toBe(order.id)

    // Cleanup
    await prisma.invoiceLineItem.deleteMany({
      where: { invoiceId: invoice!.id }
    })
    await prisma.invoice.delete({
      where: { id: invoice!.id }
    })
    await prisma.order.delete({
      where: { id: order.id }
    })
    await prisma.user.delete({
      where: { id: user.id }
    })
  })

  test('multiple users get separate invoices', async () => {
    // Create two test users
    const user1 = await prisma.user.create({
      data: {
        email: `e2e-multi-1-${Date.now()}@example.com`,
        taxId: `E2EMULTI1${Date.now()}`,
        password: 'hashed',
        name: 'Multi Test User 1',
        role: 'MEMBER',
        status: 'ACTIVE'
      }
    })

    const user2 = await prisma.user.create({
      data: {
        email: `e2e-multi-2-${Date.now()}@example.com`,
        taxId: `E2EMULTI2${Date.now()}`,
        password: 'hashed',
        name: 'Multi Test User 2',
        role: 'MEMBER',
        status: 'ACTIVE'
      }
    })

    const orderDate3 = new Date(2026, 0, 15) // January 15, 2026
    const billingMonth = '2026-01'

    // Create orders for both users
    await prisma.order.create({
      data: {
        userId: user1.id,
        orderNo: `E2E-MULTI-U1-${Date.now()}`,
        status: 'COMPLETED',
        paymentMethod: 'MONTHLY_BILLING',
        totalAmount: new Prisma.Decimal('2000.00'),
        items: [{
          productId: 'prod-1',
          quantity: 2,
          unitPrice: new Prisma.Decimal('1000.00'),
          subtotal: new Prisma.Decimal('2000.00'),
          product: { id: 'prod-1', name: 'Test Product 1' }
        }],
        createdAt: orderDate3
      }
    })

    await prisma.order.create({
      data: {
        userId: user2.id,
        orderNo: `E2E-MULTI-U2-${Date.now()}`,
        status: 'COMPLETED',
        paymentMethod: 'MONTHLY_BILLING',
        totalAmount: new Prisma.Decimal('3000.00'),
        items: [{
          productId: 'prod-2',
          quantity: 3,
          unitPrice: new Prisma.Decimal('1000.00'),
          subtotal: new Prisma.Decimal('3000.00'),
          product: { id: 'prod-2', name: 'Test Product 2' }
        }],
        createdAt: orderDate3
      }
    })

    // Generate invoices
    const invoices = await generateMonthlyInvoices(billingMonth)
    expect(invoices.length).toBeGreaterThanOrEqual(2)

    // Verify each user has their own invoice
    const user1Invoices = invoices.filter(inv => inv.userId === user1.id)
    const user2Invoices = invoices.filter(inv => inv.userId === user2.id)

    expect(user1Invoices.length).toBe(1)
    expect(user2Invoices.length).toBe(1)
    expect(user1Invoices[0].totalAmount).toEqual(new Prisma.Decimal('2000.00'))
    expect(user2Invoices[0].totalAmount).toEqual(new Prisma.Decimal('3000.00'))

    // Cleanup - delete all invoices and orders for both users
    for (const inv of [...user1Invoices, ...user2Invoices]) {
      await prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: inv.id }
      })
      await prisma.invoice.delete({
        where: { id: inv.id }
      })
    }

    await prisma.order.deleteMany({
      where: {
        OR: [
          { userId: user1.id },
          { userId: user2.id }
        ]
      }
    })

    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: user1.id },
          { id: user2.id }
        ]
      }
    })
  })
})
