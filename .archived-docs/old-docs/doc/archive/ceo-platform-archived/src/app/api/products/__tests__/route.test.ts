import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return products list with pagination', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])
    mockPrisma.product.count.mockResolvedValue(0)

    const req = createRequest('/api/products')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.pagination).toBeDefined()
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.total).toBe(0)
  })

  it('should accept valid query parameters', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])
    mockPrisma.product.count.mockResolvedValue(0)

    const req = createRequest('/api/products?page=2&limit=10&sortBy=name&order=asc')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
  })

  it('should reject invalid page parameter', async () => {
    const req = createRequest('/api/products?page=-1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('無效的查詢參數')
  })

  it('should reject invalid sortBy parameter', async () => {
    const req = createRequest('/api/products?sortBy=invalid')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('無效的查詢參數')
  })

  it('should return 500 when database error occurs', async () => {
    mockPrisma.product.findMany.mockRejectedValue(new Error('DB error'))
    mockPrisma.product.count.mockRejectedValue(new Error('DB error'))

    const req = createRequest('/api/products')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('伺服器錯誤，請稍後再試')
  })
})
