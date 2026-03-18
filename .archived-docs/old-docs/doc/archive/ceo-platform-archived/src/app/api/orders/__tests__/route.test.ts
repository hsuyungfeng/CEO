/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    cartItem: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    product: {
      update: vi.fn(),
    },
    member: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

 
const mockAuth = auth as any
 
const mockPrisma = prisma as any

function createRequest(url: string, options?: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

describe('GET /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = createRequest('/api/orders')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('未授權，請先登入')
  })

  it('should return orders for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    } as any)

    mockPrisma.order.findMany.mockResolvedValue([])
    mockPrisma.order.count.mockResolvedValue(0)

    const req = createRequest('/api/orders')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.pagination).toBeDefined()
    expect(body.pagination.total).toBe(0)
  })

  it('should validate query parameters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    } as any)

    const req = createRequest('/api/orders?page=-1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('無效的查詢參數')
  })
})

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = createRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('未授權，請先登入')
  })

  it('should return 400 when cart is empty', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    } as any)

    mockPrisma.cartItem.findMany.mockResolvedValue([])

    const req = createRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        shippingInfo: {
          name: 'Test User',
          taxId: '',
          email: 'test@test.com',
          phone: '0912345678',
          billingAddress: 'Test Billing Address',
          shippingAddress: 'Test Shipping Address',
          paymentMethod: 'COD'
        }
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('購物車是空的')
  })
})
