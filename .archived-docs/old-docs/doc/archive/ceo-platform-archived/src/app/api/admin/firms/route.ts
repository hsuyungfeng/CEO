import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// 廠商列表查詢參數驗證
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

// 廠商創建/更新驗證
const firmSchema = z.object({
  name: z.string().min(1, '廠商名稱不能為空').max(100, '廠商名稱不能超過100字'),
  phone: z.string().max(20, '電話號碼不能超過20字').optional().nullable(),
  address: z.string().max(200, '地址不能超過200字').optional().nullable(),
  isActive: z.boolean().default(true),
})

// GET /api/admin/firms - 獲取廠商列表
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const params = listQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      isActive: searchParams.get('isActive'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order'),
    })

    // 建立查詢條件
    const where: any = {}
    
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
      ]
    }
    
    if (params.isActive !== undefined) {
      where.isActive = params.isActive
    }

    // 計算分頁
    const skip = (params.page - 1) * params.limit
    
    // 執行查詢
    const [firms, total] = await Promise.all([
      prisma.firm.findMany({
        where,
        orderBy: { [params.sortBy]: params.order },
        skip,
        take: params.limit,
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.firm.count({ where })
    ])

    return NextResponse.json({
      firms,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    })

  } catch (error) {
    logger.error({ err: error }, '獲取廠商列表錯誤')
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '參數驗證錯誤', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

// POST /api/admin/firms - 創建新廠商
export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    // 解析請求資料
    const body = await request.json()
    const validatedData = firmSchema.parse(body)

    // 檢查廠商名稱是否已存在
    const existingFirm = await prisma.firm.findFirst({
      where: { name: validatedData.name }
    })

    if (existingFirm) {
      return NextResponse.json(
        { error: '廠商名稱已存在' },
        { status: 409 }
      )
    }

    // 創建廠商
    const firm = await prisma.firm.create({
      data: validatedData
    })

    return NextResponse.json(firm, { status: 201 })

  } catch (error) {
    logger.error({ err: error }, '創建廠商錯誤')
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證錯誤', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}