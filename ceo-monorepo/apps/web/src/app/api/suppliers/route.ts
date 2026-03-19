import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
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
  SYSTEM_ERRORS
} from '@/lib/constants';
import { auditLogger } from '@/lib/audit-logger';

// ==================== 查詢參數驗證 ====================

const GetSuppliersQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'ALL']).optional().default('ALL'),
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

// ==================== 響應類型定義 ====================

interface SupplierResponse {
  id: string;
  taxId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string | null;
  industry: string | null;
  description: string | null;
  status: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  mainAccount: {
    id: string;
    name: string;
    email: string;
  } | null;
  applicationsCount: number;
  productsCount: number;
  avgRating: number | null;
  totalRatings: number;
  onTimeDeliveryRate: number | null;
  totalDeliveries: number;
}

interface CreateSupplierResponse {
  id: string;
  taxId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  industry: string;
  description: string;
  status: string;
  mainAccount: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
}

// ==================== GET: 獲取供應商列表 ====================

export const GET = withOptionalAuth(async (request, { authData }) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // 驗證查詢參數
    const queryResult = GetSuppliersQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    if (!queryResult.success) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        '查詢參數驗證失敗',
        queryResult.error.issues
      );
    }

    const { status, page, limit, search } = queryResult.data;
    const skip = (page - 1) * limit;

    // 構建查詢條件
    const where: Record<string, any> = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 執行查詢
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          mainAccount: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              applications: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    // 轉換響應數據
    const data: SupplierResponse[] = suppliers.map(s => ({
      id: s.id,
      taxId: s.taxId,
      companyName: s.companyName,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      industry: s.industry,
      description: s.description,
      status: s.status,
      isVerified: s.isVerified,
      verifiedAt: s.verifiedAt,
      createdAt: s.createdAt,
      mainAccount: s.mainAccount ? {
        id: s.mainAccount.id,
        name: s.mainAccount.name || '',
        email: s.mainAccount.email,
      } : null,
      applicationsCount: s._count.applications,
      productsCount: s._count.products,
      avgRating: s.avgRating,
      totalRatings: s.totalRatings,
      onTimeDeliveryRate: s.onTimeDeliveryRate,
      totalDeliveries: s.totalDeliveries,
    }));

    // 計算分頁資訊
    const totalPages = Math.ceil(total / limit);

    return createSuccessResponse(data, {
      page,
      limit,
      total,
      totalPages,
    });

  } catch (error) {
    console.error('獲取供應商列表錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤'
    );
  }
});

// ==================== POST: 創建供應商 ====================

export const POST = withAuth()(async (request, { authData }) => {
  try {
    // 驗證請求體
    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        ErrorCode.INVALID_INPUT,
        '請求體格式錯誤'
      );
    }

    const validationResult = RegisterSupplierSchema.safeParse(body);
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

    // 檢查重複的統一編號或電子郵件
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        OR: [
          { taxId: data.taxId },
          { email: data.email },
        ],
      },
    });

    if (existingSupplier) {
      return createErrorResponse(
        ErrorCode.DUPLICATE,
        '統一編號或電子郵件已被使用'
      );
    }

    // 使用事務確保供應商和帳戶同時創建
    const [supplier] = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          taxId: data.taxId,
          companyName: data.companyName,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
          address: data.address || '',
          industry: data.industry || '',
          description: data.description || '',
          status: 'PENDING',
          mainAccountId: authData!.userId,
        },
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

      await tx.supplierAccount.create({
        data: {
          supplierId: supplier.id,
          balance: 0,
          totalSpent: 0,
          billingRate: SUPPLIER.DEFAULT_BILLING_RATE,
        },
      });

      await tx.userSupplier.create({
        data: {
          userId: authData!.userId,
          supplierId: supplier.id,
          role: 'MAIN_ACCOUNT',
        },
      });

      return [supplier];
    });

    // 記錄審計日誌
    auditLogger.supplierAction(
      'SUPPLIER_REGISTER',
      authData!.userId,
      supplier.id,
      {
        taxId: supplier.taxId,
        companyName: supplier.companyName,
      }
    );

    // 構建響應數據
    const responseData: CreateSupplierResponse = {
      id: supplier.id,
      taxId: supplier.taxId,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      industry: supplier.industry ?? '',
      description: supplier.description ?? '',
      status: supplier.status,
      mainAccount: supplier.mainAccount ? {
        id: supplier.mainAccount.id,
        name: supplier.mainAccount.name || '',
        email: supplier.mainAccount.email,
      } : null,
      createdAt: supplier.createdAt,
    };

    return createSuccessResponse(responseData, undefined, 201);
  } catch (error) {
    console.error('創建供應商錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤'
    );
  }
});