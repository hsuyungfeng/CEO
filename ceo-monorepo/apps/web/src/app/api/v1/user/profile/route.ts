/**
 * API v1 用戶個人資料端點
 * 
 * 版本: v1
 * 路徑: /api/v1/user/profile
 * 描述: 獲取和更新用戶個人資料
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  withAuth,
  createSuccessResponse, 
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { 
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  BUSINESS_ERRORS
} from '@/lib/constants';
import { z } from 'zod';

// 輔助函數：創建帶有版本標頭的錯誤響應
function createV1ErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
) {
  const response = createErrorResponse(code, message, details, status);
  response.headers.set('X-API-Version', 'v1');
  return response;
}

// 輔助函數：創建帶有版本標頭的成功響應
function createV1SuccessResponse<T>(
  data: T,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  status: number = 200
) {
  const response = createSuccessResponse(data, pagination, status);
  response.headers.set('X-API-Version', 'v1');
  return response;
}

// 用戶個人資料更新驗證模式
const updateProfileSchema = z.object({
  name: z.string().min(1, '姓名不能為空').max(100, '姓名不能超過100個字元').optional(),
  phone: z.string().regex(/^09\d{8}$/, '手機號碼格式不正確').optional(),
  address: z.string().max(500, '地址不能超過500個字元').optional(),
  taxId: z.string().regex(/^\d{8}$/, '統一編號必須是8位數字').optional(),
});

// GET /api/v1/user/profile - 獲取用戶個人資料
export const GET = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData) {
      return createV1ErrorResponse(
        ErrorCode.UNAUTHORIZED,
        AUTH_ERRORS.UNAUTHORIZED,
        401
      );
    }
    
    const userId = authData.userId;

    // 查詢用戶資料（包含 member 資料）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxId: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        member: {
          select: {
            points: true,
            totalSpent: true,
            lastPurchaseAt: true,
          }
        },
        // 供應商相關資料
        supplierAsMain: {
          select: {
            id: true,
            companyName: true,
            status: true,
            verifiedAt: true,
          }
        },
        mainAccount: {
          select: {
            id: true,
            name: true,
            email: true,
            supplierAsMain: {
              select: {
                id: true,
                companyName: true,
                status: true,
                verifiedAt: true,
              }
            }
          }
        },
        userSuppliers: {
          select: {
            role: true,
            supplier: {
              select: {
                id: true,
                companyName: true,
                status: true,
              }
            }
          }
        }
      },
    });

    if (!user) {
      return createV1ErrorResponse(
        ErrorCode.NOT_FOUND,
        BUSINESS_ERRORS.USER_NOT_FOUND,
        404
      );
    }

    // 格式化響應數據
    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      taxId: user.taxId,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      member: user.member ? {
        points: user.member.points,
        totalSpent: user.member.totalSpent,
        lastPurchaseAt: user.member.lastPurchaseAt,
      } : null,
      supplier: user.supplierAsMain ? {
        id: user.supplierAsMain.id,
        companyName: user.supplierAsMain.companyName,
        status: user.supplierAsMain.status,
        verifiedAt: user.supplierAsMain.verifiedAt,
        isMainAccount: true,
      } : user.mainAccount?.supplierAsMain ? {
        id: user.mainAccount.supplierAsMain.id,
        companyName: user.mainAccount.supplierAsMain.companyName,
        status: user.mainAccount.supplierAsMain.status,
        verifiedAt: user.mainAccount.supplierAsMain.verifiedAt,
        isMainAccount: false,
        mainAccount: {
          id: user.mainAccount.id,
          name: user.mainAccount.name,
          email: user.mainAccount.email,
        }
      } : null,
      supplierRoles: user.userSuppliers.map(us => ({
        supplierId: us.supplier.id,
        companyName: us.supplier.companyName,
        status: us.supplier.status,
        role: us.role,
      }))
    };

    const response = createV1SuccessResponse(profileData, undefined, 200);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;

  } catch (error) {
    console.error('v1 用戶個人資料獲取錯誤:', error);
    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      '獲取用戶個人資料時發生錯誤',
      500
    );
  }
});

// PATCH /api/v1/user/profile - 更新用戶個人資料
export const PATCH = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData) {
      const patchErrRes = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        AUTH_ERRORS.UNAUTHORIZED,
        undefined,
        401
      );
      patchErrRes.headers.set('X-API-Version', 'v1');
      return patchErrRes;
    }

    const userId = authData.userId;
    
    // 解析請求體
    let updateData;
    try {
      updateData = await request.json();
    } catch (error) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        VALIDATION_ERRORS.INVALID_JSON,
        400
      );
    }

    // 驗證更新數據
    const validationResult = updateProfileSchema.safeParse(updateData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '資料驗證失敗',
        400,
        errors
      );
    }

    // 檢查用戶是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return createV1ErrorResponse(
        ErrorCode.NOT_FOUND,
        BUSINESS_ERRORS.USER_NOT_FOUND,
        404
      );
    }

    // 更新用戶資料
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validationResult.data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxId: true,
        role: true,
        status: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    const response = createV1SuccessResponse(
      {
        message: '個人資料更新成功',
        user: updatedUser
      },
      undefined,
      200
    );
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;

  } catch (error) {
    console.error('v1 用戶個人資料更新錯誤:', error);
    
    // 處理 Prisma 錯誤
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '該手機號碼或統一編號已被其他用戶使用',
        400
      );
    }

    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      '更新用戶個人資料時發生錯誤',
      500
    );
  }
});

// DELETE /api/v1/user/profile - 刪除用戶帳號（軟刪除）
export const DELETE = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData) {
      const deleteErrRes = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        AUTH_ERRORS.UNAUTHORIZED,
        undefined,
        401
      );
      deleteErrRes.headers.set('X-API-Version', 'v1');
      return deleteErrRes;
    }

    const userId = authData.userId;

    // 檢查用戶是否有未完成的訂單
    const activeOrders = await prisma.order.count({
      where: {
        userId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'SHIPPED']
        }
      }
    });

    if (activeOrders > 0) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `您還有 ${activeOrders} 筆未完成的訂單，請先完成或取消這些訂單`,
        400
      );
    }

    // 檢查用戶是否是供應商主帳號
    const isSupplierMain = await prisma.supplier.findFirst({
      where: {
        mainAccountId: userId,
        status: 'ACTIVE'
      }
    });

    if (isSupplierMain) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '您是一個供應商的主帳號，請先轉移或停用供應商帳號',
        400
      );
    }

    // 軟刪除用戶帳號
    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        email: `deleted_${Date.now()}_${userId}@deleted.com`,
        name: '已刪除用戶',
        phone: null,
        address: null,
        taxId: null,
      },
      select: {
        id: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });

    const response = createV1SuccessResponse(
      {
        message: '帳號刪除成功',
        user: deletedUser
      },
      undefined,
      200
    );
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;

  } catch (error) {
    console.error('v1 用戶帳號刪除錯誤:', error);
    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      '刪除用戶帳號時發生錯誤',
      500
    );
  }
});