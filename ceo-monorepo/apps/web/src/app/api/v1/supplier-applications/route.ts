import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, ApplicationStatus } from '@prisma/client';
import { 
  withAuth, 
  withOptionalAuth,
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

const CreateApplicationSchema = z.object({
  supplierId: z.string().min(1, '供應商 ID 必填'),
  companyName: z.string().min(1, '公司名稱必填'),
  contactPerson: z.string().min(1, '聯絡人必填'),
  phone: z.string().min(1, '電話必填'),
  businessLicense: z.string().optional(),
  note: z.string().optional(),
});

/**
 * 供應商申請 API - v1 版本
 * 
 * 提供供應商申請相關功能，包括：
 * 1. 獲取申請列表
 * 2. 提交新申請
 * 
 * 此 API 使用新的中介層系統，提供標準化的響應格式和錯誤處理。
 * 
 * @version 1.0.0
 * @route GET /api/v1/supplier-applications
 * @route POST /api/v1/supplier-applications
 */
export const GET = withOptionalAuth(async (request: NextRequest, { authData }) => {
  try {
    if (!authData?.user?.id) {
      return createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '請先登入帳號'
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'my';
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    const where: Prisma.SupplierApplicationWhereInput = {};

    if (type === 'my') {
      where.applicantId = authData.user.id;
    } else if (type === 'pending') {
      where.supplier = {
        mainAccountId: authData.user.id,
      };
      where.status = 'PENDING';
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (status) {
      where.status = status as ApplicationStatus;
    }

    const applications = await prisma.supplierApplication.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            companyName: true,
            taxId: true,
            status: true,
          },
        },
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return createSuccessResponse(
      applications.map(a => ({
        id: a.id,
        supplierId: a.supplierId,
        companyName: a.companyName,
        contactPerson: a.contactPerson,
        phone: a.phone,
        businessLicense: a.businessLicense,
        note: a.note,
        status: a.status,
        reviewedBy: a.reviewedBy,
        reviewedAt: a.reviewedAt,
        rejectionReason: a.rejectionReason,
        createdAt: a.createdAt,
        supplier: a.supplier,
        applicant: a.applicant,
      }))
    );
  } catch (error) {
    console.error('取得申請列表錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤'
    );
  }
});

export const POST = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData?.user?.id) {
      return createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '請先登入帳號'
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

    const validationResult = CreateApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '數據驗證失敗',
        { errors }
      );
    }

    const data = validationResult.data;

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      return createErrorResponse(
        ErrorCode.NOT_FOUND,
        '供應商不存在'
      );
    }

    if (supplier.status !== 'ACTIVE') {
      return createErrorResponse(
        ErrorCode.OPERATION_NOT_ALLOWED,
        '供應商目前不接受申請'
      );
    }

    const existingApplication = await prisma.supplierApplication.findFirst({
      where: {
        supplierId: data.supplierId,
        applicantId: authData.user.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingApplication) {
      return createErrorResponse(
        ErrorCode.CONFLICT,
        '您已對此供應商提出申請，請勿重複申請'
      );
    }

    const application = await prisma.supplierApplication.create({
      data: {
        supplierId: data.supplierId,
        applicantId: authData.user.id,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        businessLicense: data.businessLicense || '',
        note: data.note || '',
        status: 'PENDING',
      },
      include: {
        supplier: {
          select: {
            id: true,
            companyName: true,
            mainAccountId: true,
          },
        },
      },
    });

    // 發送申請提交通知給申請者
    await NotificationIntegration.sendSupplierApplicationNotification(
      authData.user.id,
      data.supplierId,
      application.id,
      'submitted'
    ).catch(console.error);

    // 發送申請通知給供應商主帳號（如果存在）
    if (application.supplier.mainAccountId) {
      await NotificationIntegration.sendSupplierApplicationNotification(
        application.supplier.mainAccountId,
        data.supplierId,
        application.id,
        'submitted'
      ).catch(console.error);
    }

    return createSuccessResponse(
      {
        id: application.id,
        supplierId: application.supplierId,
        companyName: application.companyName,
        contactPerson: application.contactPerson,
        phone: application.phone,
        status: application.status,
        createdAt: application.createdAt,
        supplier: application.supplier,
      },
      undefined,
      201
    );
  } catch (error) {
    console.error('提交申請錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤'
    );
  }
});