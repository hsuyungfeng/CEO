import { z } from 'zod';

// 階梯定價 Schema
export const PriceTierSchema = z.object({
  minQty: z.number().int().positive().min(1, '最小數量必須大於0'),
  price: z.number().positive('價格必須大於0'),
});

// 商品創建 Schema
export const CreateProductSchema = z.object({
  name: z.string().min(1, '商品名稱不能為空').max(200, '商品名稱不能超過200字'),
  subtitle: z.string().max(200, '副標題不能超過200字').optional(),
  description: z.string().optional(),
  image: z.string().url('圖片URL格式不正確').optional().or(z.literal('')),
  unit: z.string().min(1, '單位不能為空').max(20, '單位不能超過20字'),
  spec: z.string().optional(),
  firmId: z.string().cuid('廠商ID格式不正確').optional().nullable(),
  categoryId: z.string().cuid('分類ID格式不正確').optional().nullable(),
  isFeatured: z.boolean().default(false),
  startDate: z.string().datetime('開始時間格式不正確').optional().nullable(),
  endDate: z.string().datetime('結束時間格式不正確').optional().nullable(),
  priceTiers: z.array(PriceTierSchema)
    .min(1, '至少需要一個價格階梯')
    .refine((tiers) => {
      // 檢查階梯數量是否遞增
      const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
      for (let i = 0; i < sortedTiers.length; i++) {
        if (sortedTiers[i].minQty !== tiers[i].minQty) {
          return false;
        }
      }
      return true;
    }, '價格階梯必須按最小數量排序')
    .refine((tiers) => {
      // 檢查階梯數量是否唯一
      const minQtys = tiers.map(tier => tier.minQty);
      return new Set(minQtys).size === minQtys.length;
    }, '價格階梯的最小數量不能重複'),
});

// 商品更新 Schema
export const UpdateProductSchema = CreateProductSchema.partial().extend({
  priceTiers: z.array(PriceTierSchema)
    .min(1, '至少需要一個價格階梯')
    .optional()
    .refine((tiers) => {
      if (!tiers) return true;
      // 檢查階梯數量是否遞增
      const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
      for (let i = 0; i < sortedTiers.length; i++) {
        if (sortedTiers[i].minQty !== tiers[i].minQty) {
          return false;
        }
      }
      return true;
    }, '價格階梯必須按最小數量排序')
    .refine((tiers) => {
      if (!tiers) return true;
      // 檢查階梯數量是否唯一
      const minQtys = tiers.map(tier => tier.minQty);
      return new Set(minQtys).size === minQtys.length;
    }, '價格階梯的最小數量不能重複'),
});

// API 響應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// 商品數據類型
export interface ProductWithRelations {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  unit: string;
  spec: string | null;
  firmId: string | null;
  categoryId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  startDate: Date | null;
  endDate: Date | null;
  totalSold: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  priceTiers: Array<{
    id: string;
    minQty: number;
    price: number;
  }>;
  firm?: {
    id: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
}

// 訂單狀態更新 Schema
export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
  note: z.string().max(500, '備註不能超過500字').optional(),
});

// 訂單查詢參數 Schema
export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
  userId: z.string().cuid('用戶ID格式不正確').optional(),
  startDate: z.string().datetime('開始時間格式不正確').optional(),
  endDate: z.string().datetime('結束時間格式不正確').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'totalAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// 分類創建 Schema
export const CreateCategorySchema = z.object({
  name: z.string().min(1, '分類名稱不能為空').max(100, '分類名稱不能超過100字'),
  parentId: z.string().cuid('父分類ID格式不正確').optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// 分類更新 Schema
export const UpdateCategorySchema = CreateCategorySchema.partial();

// 分類重新排序 Schema
export const ReorderCategorySchema = z.object({
  newSortOrder: z.number().int(),
});

// FAQ 重新排序 Schema
export const ReorderFaqSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().cuid('FAQ ID 格式不正確'),
      sortOrder: z.number().int().positive('排序值必須是正整數'),
    })
  ).min(1, '至少需要一個 FAQ 項目'),
});

// 分類移動層級 Schema
export const MoveCategorySchema = z.object({
  newParentId: z.string().cuid('父分類ID格式不正確').optional().nullable(),
});

// 批量操作 Schema
export const BatchCategoryOperationSchema = z.object({
  ids: z.array(z.string().cuid('分類ID格式不正確')).min(1, '至少選擇一個分類'),
  operation: z.enum(['activate', 'deactivate', 'delete']),
});

// 分類數據類型（包含子分類）
export interface CategoryWithChildren {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  children: CategoryWithChildren[];
  productCount?: number;
}

// 分類詳情數據類型
export interface CategoryDetail {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Array<{
    id: string;
    name: string;
  }>;
  productCount?: number;
}

// 會員查詢參數 Schema
export const UserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  role: z.enum(['MEMBER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'points']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// 會員狀態更新 Schema
export const UpdateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']),
  reason: z.string().max(500, '原因不能超過500字').optional(),
});

// 點數調整 Schema
export const AdjustPointsSchema = z.object({
  amount: z.number().int('點數必須是整數').refine(val => val !== 0, '點數調整不能為0'),
  reason: z.string().min(1, '原因不能為空').max(500, '原因不能超過500字'),
  type: z.enum(['ADD', 'SUBTRACT', 'SET']),
});

// 會員資訊更新 Schema
export const UpdateUserInfoSchema = z.object({
  name: z.string().min(1, '公司名稱不能為空').max(200, '公司名稱不能超過200字').optional(),
  contactPerson: z.string().max(100, '聯絡人不能超過100字').optional(),
  phone: z.string().max(20, '電話不能超過20字').optional(),
  address: z.string().max(500, '地址不能超過500字').optional(),
});

// 會員數據類型
export interface UserWithRelations {
  id: string;
  email: string;
  name: string;
  taxId: string;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  points: number;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  orders?: Array<{
    id: string;
    orderNo: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

// 操作日誌數據類型
export interface UserLogData {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  metadata: any;
  createdAt: Date;
  admin: {
    id: string;
    name: string;
    email: string;
  };
}

// 點數交易數據類型
export interface PointTransactionData {
  id: string;
  amount: number;
  balance: number;
  type: string;
  reason: string | null;
  referenceId: string | null;
  createdAt: Date;
}