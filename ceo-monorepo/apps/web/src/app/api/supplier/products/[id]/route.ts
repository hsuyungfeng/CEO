import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthData } from '@/lib/auth-helper'

const ALLOWED_FIELDS = [
  'name', 'SKU', 'description', 'category', 'unit', 'imageUrl',
  'price', 'moq', 'leadTime', 'length', 'width', 'height', 'weight', 'stock', 'isActive',
]

async function resolveProduct(id: string, userId: string) {
  const isTestMode = process.env.NODE_ENV === 'development'
  const product = await prisma.supplierProduct.findUnique({
    where: { id },
    include: {
      supplier: {
        include: {
          userSuppliers: { where: { userId } },
        },
      },
    },
  })
  if (!product) return { error: '產品不存在', status: 404 }
  // TEST_MODE 跳過供應商歸屬驗證
  if (!isTestMode && product.supplier.userSuppliers.length === 0) {
    return { error: '無權限', status: 403 }
  }
  return { product }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authData = await getAuthData(request)
  if (!authData) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { id } = await params
  const result = await resolveProduct(id, authData.userId)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ success: true, data: result.product })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authData = await getAuthData(request)
  if (!authData) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { id } = await params
  const result = await resolveProduct(id, authData.userId)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await request.json()
  const updateData: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updateData[key] = body[key]
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 })
  }

  const updated = await prisma.supplierProduct.update({ where: { id }, data: updateData })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authData = await getAuthData(request)
  if (!authData) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { id } = await params
  const result = await resolveProduct(id, authData.userId)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  await prisma.supplierProduct.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
