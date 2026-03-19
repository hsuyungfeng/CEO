/**
 * 供應商銷售報表 API
 * GET /api/supplier/reports/sales
 * 
 * 提供供應商的銷售數據報表，包括：
 * - 產品銷售統計
 * - 銷售趨勢（按時間）
 * - 熱門產品排名
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// 查詢參數 schema
const querySchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(),   // YYYY-MM-DD
  groupBy: z.enum(['day', 'week', 'month', 'product']).default('month'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  try {
    // 驗證用戶身份
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '請先登入帳號' },
        { status: 401 }
      )
    }

    // 檢查用戶是否為供應商主帳號或附屬帳號
    const userSupplier = await prisma.userSupplier.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['MAIN_ACCOUNT', 'SUB_ACCOUNT'] },
      },
      include: {
        supplier: true,
      },
    })

    if (!userSupplier || !userSupplier.supplier) {
      return NextResponse.json(
        { success: false, error: '您不是供應商帳號' },
        { status: 403 }
      )
    }

    const supplier = userSupplier.supplier

    // 解析查詢參數
    const { searchParams } = new URL(request.url)
    const query = querySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      groupBy: searchParams.get('groupBy'),
      limit: searchParams.get('limit'),
    })

    if (!query.success) {
      return NextResponse.json(
        { success: false, error: '查詢參數錯誤', details: query.error.issues },
        { status: 400 }
      )
    }

    const { startDate, endDate, groupBy, limit } = query.data

    // 構建日期過濾條件
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      dateFilter.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    // 獲取供應商產品列表
    const products = await prisma.supplierProduct.findMany({
      where: {
        supplierId: supplier.id,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // 由於當前系統沒有直接關聯供應商產品和訂單，
    // 我們先提供產品基本報表，未來可以擴展銷售數據
    
    // 計算產品統計
    const productStats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      outOfStock: products.filter(p => p.stock <= 0).length,
      totalStockValue: products.reduce((sum, p) => {
        if (p.price !== null) {
          return sum + (Number(p.stock) * Number(p.price))
        }
        return sum
      }, 0),
    }

    // 按類別分組
    const categoryGroups: Record<string, { count: number; products: unknown[] }> = {}
    products.forEach(p => {
      const categoryName = p.product?.category?.name || '未分類'
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = {
          count: 0,
          products: [],
        }
      }
      categoryGroups[categoryName].count++
      categoryGroups[categoryName].products.push({
        id: p.id,
        name: p.product?.name || p.name,
        price: p.price,
        stock: p.stock,
        moq: p.moq,
        isActive: p.isActive,
      })
    })

    // 價格範圍分析
    const prices = products
      .filter(p => p.price !== null)
      .map(p => Number(p.price))
    const priceStats = prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    } : null

    // 構建報表響應
    const report = {
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          companyName: supplier.companyName,
        },
        timeframe: {
          startDate: startDate || '全部',
          endDate: endDate || '現在',
          generatedAt: new Date().toISOString(),
        },
        summary: {
          ...productStats,
          averagePrice: priceStats?.avg || 0,
          priceRange: priceStats ? `${priceStats.min} - ${priceStats.max}` : '無價格數據',
        },
        categories: Object.entries(categoryGroups).map(([name, data]) => ({
          name,
          count: data.count,
          sampleProducts: data.products.slice(0, 3),
        })),
        products: products.map(p => ({
          id: p.id,
          name: p.product?.name || p.name,
          category: p.product?.category?.name || '未分類',
          price: p.price,
        stock: p.stock,
          moq: p.moq,
          leadTime: p.leadTime,
          isActive: p.isActive,
          dimensions: p.length && p.width && p.height && p.weight ? {
            length: p.length,
            width: p.width,
            height: p.height,
            weight: p.weight,
          } : null,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        // 銷售數據佔位符（未來擴展）
        salesData: {
          note: '銷售數據功能需要訂單與供應商產品的關聯，目前尚未實現。',
          futureEnhancements: [
            '關聯訂單項目與供應商產品',
            '按時間統計銷售趨勢',
            '熱門產品排名',
            '客戶購買分析',
          ],
        },
      },
    }

    return NextResponse.json(report)

  } catch (error) {
    console.error('供應商銷售報表錯誤:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}