import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AuthData } from '@/lib/auth-helper';
import { 
  withAuth, 
  createSuccessResponse, 
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { 
  SYSTEM_ERRORS,
  USER_ROLES
} from '@/lib/constants';
import { z } from 'zod';
import { NotificationIntegration } from '@/lib/notification-integration';
import { auditLogger } from '@/lib/audit-logger';

const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

/**
 * 供應商申請審批 API - v1 版本
 * 
 * 提供供應商申請審批功能，包括：
 * 1. 審批申請（批准/拒絕）
 * 
 * 此 API 使用新的中介層系統，提供標準化的響應格式和錯誤處理。
 * 
 * @version 1.0.0
 * @route PATCH /api/v1/supplier-applications/[id]
 */
export const PATCH = withAuth()(async (request: NextRequest, { authData, params }: { authData: AuthData | null, params?: Record<string, string> }) => {
  try {
    if (!authData?.user?.id) {
      return createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '請先登入帳號'
      );
    }

    const { id } = params || {};

    if (!id) {
      return createErrorResponse(
        ErrorCode.INVALID_INPUT,
        '申請 ID 必填'
      );
    }

    const application = await prisma.supplierApplication.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!application) {
      return createErrorResponse(
        ErrorCode.NOT_FOUND,
        '申請不存在'
      );
    }

    if (application.supplier.mainAccountId !== authData.user.id) {
      return createErrorResponse(
        ErrorCode.FORBIDDEN,
        '您無權審批此申請'
      );
    }

    if (application.status !== 'PENDING') {
      return createErrorResponse(
        ErrorCode.OPERATION_NOT_ALLOWED,
        '此申請已經被處理過了'
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        ErrorCode.INVALID_INPUT,
        '請求體格式錯誤'
      );
    }

    const validationResult = ReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '無效的操作類型'
      );
    }

    const { action, reason } = validationResult.data;

    let updateData: {
      reviewedBy: string;
      reviewedAt: Date;
      status?: 'APPROVED' | 'REJECTED';
      rejectionReason?: string;
    } = {
      reviewedBy: authData.user.id,
      reviewedAt: new Date(),
    };

    let message = '';

    if (action === 'approve') {
      updateData.status = 'APPROVED';
      message = '申請已批准';
    } else {
      updateData.status = 'REJECTED';
      updateData.rejectionReason = reason || '不符合供應商要求';
      message = '申請已拒絕';
    }

    // 使用事務確保原子性（批准時同時建立 UserSupplier）
    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        await tx.userSupplier.create({
          data: {
            userId: application.applicantId,
            supplierId: application.supplierId,
            role: 'SUB_ACCOUNT',
            isActive: true,
          },
        });
      }

      return tx.supplierApplication.update({
        where: { id },
        data: updateData,
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    auditLogger.supplierAction(
      action === 'approve' ? 'SUPPLIER_APPLICATION_APPROVE' : 'SUPPLIER_APPLICATION_REJECT',
      application.supplierId,
      application.id,
      { applicantId: application.applicantId, reviewedBy: authData.user.id }
    );

    // 發送審核結果通知給申請者
    await NotificationIntegration.sendSupplierApplicationNotification(
      application.applicantId,
      application.supplierId,
      application.id,
      action === 'approve' ? 'approved' : 'rejected'
    ).catch(console.error);

    return createSuccessResponse(
      {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
        rejectionReason: updated.rejectionReason,
        applicant: updated.applicant,
      },
      undefined,
      200
    );
  } catch (error) {
    console.error('審批申請錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤'
    );
  }
});