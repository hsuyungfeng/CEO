import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// 廠商更新驗證
const updateFirmSchema = z.object({
  name: z.string().min(1, '廠商名稱不能為空').max(100, '廠商名稱不能超過100字').optional(),
  phone: z.string().max(20, '電話號碼不能超過20字').optional().nullable(),
  address: z.string().max(200, '地址不能超過200字').optional().nullable(),
  isActive: z.boolean().optional(),
})

// GET /api/admin/firms/[id] - 獲取單個廠商詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const { id } = await params

    // 查詢廠商
    const firm = await prisma.firm.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            image: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // 只顯示最近10個商品
        },
        _count: {
          select: { products: true }
        }
      }
    })

    if (!firm) {
      return NextResponse.json(
        { error: '廠商不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(firm)

  } catch (error) {
    logger.error({ err: error }, '獲取廠商詳情錯誤')
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/firms/[id] - 更新廠商
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const { id } = await params

    // 檢查廠商是否存在
    const existingFirm = await prisma.firm.findUnique({
      where: { id }
    })

    if (!existingFirm) {
      return NextResponse.json(
        { error: '廠商不存在' },
        { status: 404 }
      )
    }

    // 解析請求資料
    const body = await request.json()
    const validatedData = updateFirmSchema.parse(body)

    // 如果更新名稱，檢查名稱是否已被其他廠商使用
    if (validatedData.name && validatedData.name !== existingFirm.name) {
      const duplicateFirm = await prisma.firm.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id }
        }
      })

      if (duplicateFirm) {
        return NextResponse.json(
          { error: '廠商名稱已被其他廠商使用' },
          { status: 409 }
        )
      }
    }

    // 更新廠商
    const updatedFirm = await prisma.firm.update({
      where: { id },
      data: validatedData
    })

    return NextResponse.json(updatedFirm)

  } catch (error) {
    logger.error({ err: error }, '更新廠商錯誤')
    
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

// DELETE /api/admin/firms/[id] - 刪除廠商
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const { id } = await params

    // 檢查廠商是否存在
    const existingFirm = await prisma.firm.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    if (!existingFirm) {
      return NextResponse.json(
        { error: '廠商不存在' },
        { status: 404 }
      )
    }

    // 檢查廠商是否有關聯商品
    if (existingFirm._count.products > 0) {
      return NextResponse.json(
        { 
          error: '無法刪除廠商',
          message: `該廠商有 ${existingFirm._count.products} 個關聯商品，請先移除或轉移這些商品後再刪除廠商`
        },
        { status: 400 }
      )
    }

    // 刪除廠商
    await prisma.firm.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: '廠商刪除成功' },
      { status: 200 }
    )

  } catch (error) {
    logger.error({ err: error }, '刪除廠商錯誤')
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}