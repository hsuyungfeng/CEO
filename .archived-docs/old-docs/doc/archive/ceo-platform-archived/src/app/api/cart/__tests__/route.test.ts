/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cartItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
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

describe('GET /api/cart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = createRequest('/api/cart')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('未授權，請先登入')
  })

  it('should return empty cart for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    } as any)

    mockPrisma.cartItem.findMany.mockResolvedValue([])

    const req = createRequest('/api/cart')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.summary.totalItems).toBe(0)
    expect(body.summary.totalAmount).toBe(0)
  })
})

describe('POST /api/cart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const req = createRequest('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-1', quantity: 1 }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('未授權，請先登入')
  })

  it('should return 400 for invalid request body', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    } as any)

    const req = createRequest('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: '', quantity: -1 }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('驗證失敗')
  })

  it('should return 404 when product not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    } as any)

    mockPrisma.product.findUnique.mockResolvedValue(null)

    const req = createRequest('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: 'nonexistent', quantity: 1 }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('商品不存在或已下架')
  })
})
