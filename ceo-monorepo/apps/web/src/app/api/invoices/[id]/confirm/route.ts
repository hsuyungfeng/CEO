import { NextRequest, NextResponse } from 'next/server'
import { getAuthData } from '@/lib/auth-helper'
import { confirmInvoice } from '@/lib/invoice-service'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using unified auth helper (supports Bearer Token and Session Cookies)
    const authData = await getAuthData(request)

    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if invoice exists and get userId for authorization check
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { userId: true, status: true }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Verify authorization: user owns invoice or is admin
    if (invoice.userId !== authData.userId && authData.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Confirm the invoice (marks as CONFIRMED and sets timestamp)
    const updated = await confirmInvoice(params.id)

    return NextResponse.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('PATCH /api/invoices/[id]/confirm error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
