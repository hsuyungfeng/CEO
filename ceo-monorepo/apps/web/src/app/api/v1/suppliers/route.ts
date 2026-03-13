/**
 * API v1 供應商端點
 * 
 * 版本: v1
 * 路徑: /api/v1/suppliers
 * 描述: 獲取供應商列表和註冊新供應商
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  withOptionalAuth, 
  withAuth,
  createSuccessResponse, 
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { 
  PAGINATION, 
  SUPPLIER,
  BUSINESS_ERRORS,
  VALIDATION_ERRORS,
  SYSTEM_ERRORS
} from '@/lib/constants';
import { z } from 'zod';

// ==================== 查詢參數驗證 ====================

const GetSuppliersQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ALL']).optional().default('ACTIVE'),
  page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().optional().default(''),
});

// ==================== 請求體驗證 ====================

const RegisterSupplierSchema = z.object({
  taxId: z.string().min(SUPPLIER.MIN_TAX_ID_LENGTH, `統一編號至少${SUPPLIER.MIN_TAX_ID_LENGTH}碼`),
  companyName: z.string().min(1, '公司名稱必填'),
  contactPerson: z.string().min(1, '聯絡人必填'),
  phone: z.string().min(1, '電話必填'),
  email: z.string().email('請輸入有效的電子郵件'),
  address: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
});

// ==================== 輔助函數 ====================

// 創建帶有版本標頭的錯誤響應
function createV1ErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: any
) {
  const response = createErrorResponse(code, message, details, status);
  response.headers.set('X-API-Version', 'v1');
  return response;
}

// 創建帶有版本標頭的成功響應
function createV1SuccessResponse<T = any>(
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

// ==================== API 端點 ====================

// GET /api/v1/suppliers - 獲取供應商列表
export const GET = withOptionalAuth(async (request: NextRequest, { authData }) => {
  try {
    // 解析查詢參數
    const url = new URL(request.url);
    const queryParams = {
      status: url.searchParams.get('status') || 'ACTIVE',
      page: url.searchParams.get('page') || PAGINATION.DEFAULT_PAGE.toString(),
      limit: url.searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString(),
      search: url.searchParams.get('search') || '',
    };

    // 驗證查詢參數
    const validationResult = GetSuppliersQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '查詢參數驗證失敗',
        400,
        errors
      );
    }

    const { status, page, limit, search } = validationResult.data;
    const skip = (page - 1) * limit;

    // 構建查詢條件
    const where: {
      status?: string;
      OR?: Array<{
        companyName?: { contains: string; mode: 'insensitive' };
        taxId?: { contains: string; mode: 'insensitive' };
        contactPerson?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};
    
    if (status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查詢供應商
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        select: {
          id: true,
          taxId: true,
          companyName: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          industry: true,
          description: true,
          status: true,
          isVerified: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
          // 統計資訊 - 使用正確的關聯名稱
          products: {
            select: {
              id: true
            }
          },
          applications: {
            select: {
              id: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    // 格式化響應數據
    const formattedSuppliers = suppliers.map(supplier => ({
      id: supplier.id,
      taxId: supplier.taxId,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      industry: supplier.industry,
      description: supplier.description,
      status: supplier.status,
      isVerified: supplier.isVerified,
      verifiedAt: supplier.verifiedAt,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      productsCount: supplier.products.length,
      applicationsCount: supplier.applications.length,
    }));

    // 計算分頁資訊
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
    };

    const response = createV1SuccessResponse(formattedSuppliers, pagination, 200);
    response.headers.set('Cache-Control', 'public, max-age=60');
    return response;

  } catch (error) {
    console.error('v1 供應商列表獲取錯誤:', error);
    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      500
    );
  }
});

// POST /api/v1/suppliers - 註冊新供應商
export const POST = withAuth()(async (request: NextRequest, { authData }) => {
  try {
    if (!authData) {
      return createV1ErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '需要登入才能註冊供應商',
        401
      );
    }

    const { userId } = authData.user;

    // 解析請求體
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        VALIDATION_ERRORS.INVALID_JSON,
        400
      );
    }

    // 驗證請求數據
    const validationResult = RegisterSupplierSchema.safeParse(requestData);
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

    const supplierData = validationResult.data;

    // 檢查統一編號是否已存在
    const existingSupplier = await prisma.supplier.findUnique({
      where: { taxId: supplierData.taxId },
    });

    if (existingSupplier) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '該統一編號已被使用',
        400
      );
    }

    // 檢查用戶是否已經是供應商
    const userIsSupplier = await prisma.supplier.findFirst({
      where: { mainAccountId: userId },
    });

    if (userIsSupplier) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '您已經是供應商',
        400
      );
    }

    // 創建供應商
    const supplier = await prisma.supplier.create({
      data: {
        taxId: supplierData.taxId,
        companyName: supplierData.companyName,
        contactPerson: supplierData.contactPerson,
        phone: supplierData.phone,
        email: supplierData.email,
        address: supplierData.address,
        industry: supplierData.industry,
        description: supplierData.description,
        status: 'PENDING', // 新供應商需要審核
        isVerified: false,
        mainAccountId: userId,
      },
      select: {
        id: true,
        taxId: true,
        companyName: true,
        contactPerson: true,
        phone: true,
        email: true,
        address: true,
        industry: true,
        description: true,
        status: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const response = createV1SuccessResponse(
      {
        message: '供應商註冊成功，請等待審核',
        supplier
      },
      undefined,
      201
    );
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;

  } catch (error) {
    console.error('v1 供應商註冊錯誤:', error);
    
    // 處理 Prisma 錯誤
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return createV1ErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '資料已存在，請檢查輸入資料',
        400
      );
    }

    return createV1ErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      '供應商註冊時發生錯誤',
      500
    );
  }
});