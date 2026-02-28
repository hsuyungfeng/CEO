import { NextRequest, NextResponse } from 'next/server'
import { getAuthData } from '@/lib/auth-helper'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using unified auth helper (supports Bearer Token and Session Cookies)
    const authData = await getAuthData(request)

    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's invoices
    const invoices = await prisma.invoice.findMany({
      where: { userId: authData.userId },
      include: { lineItems: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length
    })
  } catch (error) {
    console.error('GET /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
