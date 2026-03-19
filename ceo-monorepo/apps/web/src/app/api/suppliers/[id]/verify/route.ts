import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { z } from 'zod';
import { auditLogger } from '@/lib/audit-logger';

const VerifySchema = z.object({
  action: z.enum(['verify', 'suspend', 'reject']),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const adminUser = adminCheck.user;

    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: '供應商不存在' },
        { status: 404 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '請求體格式錯誤' },
        { status: 400 }
      );
    }

    const validationResult = VerifySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: '無效的操作類型' },
        { status: 400 }
      );
    }

    const { action, reason } = validationResult.data;

    let updateData: {
      status?: string;
      isVerified?: boolean;
      verifiedAt?: Date;
      verifiedBy?: string;
    } = {};
    let message = '';

    switch (action) {
      case 'verify':
        updateData = {
          status: 'ACTIVE',
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: adminUser.id,
        };
        message = '供應商驗證成功';
        break;

      case 'suspend':
        updateData = {
          status: 'SUSPENDED',
          isVerified: false,
        };
        message = reason ? `供應商已停用：${reason}` : '供應商已停用';
        break;

      case 'reject':
        updateData = {
          status: 'REJECTED',
          isVerified: false,
        };
        message = reason ? `供應商申請已拒絕：${reason}` : '供應商申請已拒絕';
        break;

      default:
        return NextResponse.json(
          { success: false, error: '無效的操作' },
          { status: 400 }
        );
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: {
        mainAccount: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const auditAction = action === 'verify' ? 'SUPPLIER_VERIFY' : 'SUPPLIER_SUSPEND';
    auditLogger.adminAction(
      auditAction,
      adminUser.id,
      id,
      { action, reason, previousStatus: supplier.status },
      request.headers.get('x-forwarded-for')
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        isVerified: updated.isVerified,
        verifiedAt: updated.verifiedAt,
      },
      message,
    });

  } catch (error) {
    console.error('驗證供應商錯誤:', error);
    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
