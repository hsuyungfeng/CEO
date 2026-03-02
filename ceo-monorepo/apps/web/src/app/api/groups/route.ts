/**
 * Phase 4.5 Task 3 — Group Buying API
 *
 * GET  /api/groups  → 列出所有進行中的團購 (公開，無需登入)
 * POST /api/groups  → 公司/團長建立新團購 (需登入)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthData } from '@/lib/auth-helper'
import { GROUP_DISCOUNT_TIERS, getGroupDiscount } from '@/lib/group-buying'

// re-export for backward compatibility with [id]/route.ts import
export { GROUP_DISCOUNT_TIERS, getGroupDiscount }

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const createGroupSchema = z.object({
  title: z.string().min(2, '團購標題至少 2 個字').max(100, '標題不超過 100 字'),
  productId: z.string().min(1, '請選擇商品'),
  quantity: z.number().int().positive('數量必須是正整數'),
  deadline: z.string().datetime({ message: '截止時間格式錯誤，請用 ISO 8601' }),
  note: z.string().max(500, '備註不超過 500 字').optional(),
})

const listQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── GET /api/groups — 列出進行中團購 ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = listQuerySchema.safeParse({
      page:  searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    if (!query.success) {
      return NextResponse.json(
        { error: '查詢參數錯誤', details: query.error.issues },
        { status: 400 }
      )
    }

    const { page, limit } = query.data
    const skip = (page - 1) * limit
    const now = new Date()

    // 取得所有有效團購（團長訂單，截止時間未到，狀態 PENDING）
    const [groups, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          isGroupLeader: true,
          groupStatus: 'GROUPED',
          groupDeadline: { gt: now },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: {
          id: true,
          groupId: true,
          groupDeadline: true,
          groupTotalItems: true,
          note: true,
          createdAt: true,
          user: {
            select: { id: true, name: true },
          },
          items: {
            select: {
              quantity: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  priceTiers: {
                    take: 1,
                    orderBy: { minQty: 'asc' },
                    select: { price: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { groupDeadline: 'asc' },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: {
          isGroupLeader: true,
          groupStatus: 'GROUPED',
          groupDeadline: { gt: now },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      }),
    ])

    // 對每個團購計算目前加入的總件數與折扣
    const groupsWithStats = await Promise.all(
      groups.map(async (g) => {
        try {
          const memberAgg = await prisma.order.aggregate({
            where: { groupId: g.groupId, isGroupLeader: false },
            _sum: { groupTotalItems: true },
            _count: { id: true },
          })

          const leaderQty   = g.items?.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0
          const memberQty   = memberAgg._sum?.groupTotalItems ?? 0
          const totalQty    = leaderQty + memberQty
          const currentDiscount = getGroupDiscount(totalQty)

          const rawProduct = g.items?.[0]?.product ?? null
          const product = rawProduct
            ? {
                id:    rawProduct.id,
                name:  rawProduct.name,
                unit:  rawProduct.unit,
                price: rawProduct.priceTiers?.[0]?.price ?? null,
              }
            : null

          return {
            groupId:         g.groupId,
            leaderOrderId:   g.id,
            title:           g.note ?? '團購活動',
            company:         g.user?.name ?? '',
            deadline:        g.groupDeadline,
            product,
            leaderQty,
            memberCount:     memberAgg._count?.id ?? 0,
            totalQty,
            currentDiscount,
            createdAt:       g.createdAt,
          }
        } catch (innerError) {
          console.error('Error processing group:', g.groupId, innerError)
          throw innerError
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: groupsWithStats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('GET /api/groups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/groups — 建立團購 ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. 認證
    const authData = await getAuthData(request)
    if (!authData) {
      return NextResponse.json({ error: '未授權，請先登入' }, { status: 401 })
    }
    const { userId } = authData

    // 2. 解析 body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }

    const parsed = createGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '輸入資料有誤', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { title, productId, quantity, deadline, note } = parsed.data

    // 3. 確認商品存在且有效
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    })
    if (!product) {
      return NextResponse.json({ error: '商品不存在或已下架' }, { status: 404 })
    }

    // 4. 確認截止時間在未來
    const deadlineDate = new Date(deadline)
    if (deadlineDate <= new Date()) {
      return NextResponse.json({ error: '截止時間必須在未來' }, { status: 400 })
    }

    // 5. 取得商品單價（使用最低起訂量的價格階梯）
    const priceTier = await prisma.priceTier.findFirst({
      where: { productId },
      orderBy: { minQty: 'asc' },
    })
    if (!priceTier) {
      return NextResponse.json({ error: '商品尚未設定價格，請聯繫管理員' }, { status: 422 })
    }
    const unitPrice = priceTier.price
    const subtotal  = unitPrice.mul(quantity)

    // 6. 建立團購（以團長訂單為代表）
    const groupId  = crypto.randomUUID()
    const orderNo  = `GRP-${Date.now()}-${groupId.slice(0, 6).toUpperCase()}`

    const order = await prisma.order.create({
      data: {
        orderNo,
        userId,
        status: 'PENDING',
        paymentMethod: 'MONTHLY_BILLING',
        totalAmount: subtotal,
        pointsEarned: 0,
        note: title + (note ? `\n${note}` : ''),
        // Group buying fields
        groupId,
        groupStatus: 'GROUPED',
        isGroupLeader: true,
        groupDeadline: deadlineDate,
        groupTotalItems: quantity,
        groupRefund: 0,
        items: {
          create: {
            productId,
            quantity,
            unitPrice,
            subtotal,
          },
        },
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, unit: true } } },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '團購建立成功',
        data: {
          groupId,
          leaderOrderId: order.id,
          orderNo: order.orderNo,
          title,
          deadline: deadlineDate,
          product: order.items[0]?.product ?? null,
          leaderQty: quantity,
          unitPrice: unitPrice.toNumber(),
          currentDiscount: getGroupDiscount(quantity),
          discountTiers: GROUP_DISCOUNT_TIERS,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/groups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
