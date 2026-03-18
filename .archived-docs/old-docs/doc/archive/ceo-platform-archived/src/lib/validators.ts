import { z } from "zod/v4";

// ===== 認證相關 =====

export const loginSchema = z.object({
  email: z.email("請輸入有效的 Email"),
  password: z.string().min(8, "密碼至少 8 個字元"),
});

export const registerSchema = z
  .object({
    email: z.email("請輸入有效的 Email"),
    password: z.string().min(8, "密碼至少 8 個字元"),
    confirmPassword: z.string(),
    name: z.string().min(1, "請輸入公司名稱"),
    taxId: z
      .string()
      .length(8, "統一編號必須為 8 碼")
      .regex(/^\d{8}$/, "統一編號必須為 8 位數字"),
    phone: z.string().optional(),
    fax: z.string().optional(),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "密碼不一致",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("請輸入有效的 Email"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "密碼至少 8 個字元"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "密碼不一致",
    path: ["confirmPassword"],
  });

// ===== 商品相關 =====

export const productSchema = z.object({
  name: z.string().min(1, "請輸入商品名稱"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  spec: z.string().optional(),
  firmId: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priceTiers: z
    .array(
      z.object({
        minQty: z.number().int().positive("數量必須大於 0"),
        price: z.number().positive("價格必須大於 0"),
      })
    )
    .min(1, "至少需要一個價格區間"),
});

// ===== 購物車相關 =====

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("數量必須大於 0"),
});

export const updateCartSchema = z.object({
  quantity: z.number().int().positive("數量必須大於 0"),
});

// ===== 訂單相關 =====

export const createOrderSchema = z.object({
  note: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "COMPLETED", "CANCELLED"]),
  note: z.string().optional(),
});

// ===== 分類相關 =====

export const categorySchema = z.object({
  name: z.string().min(1, "請輸入分類名稱"),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// ===== 廠商相關 =====

export const firmSchema = z.object({
  name: z.string().min(1, "請輸入廠商名稱"),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ===== 聯絡表單 =====

export const contactSchema = z.object({
  name: z.string().min(1, "請輸入姓名"),
  email: z.email("請輸入有效的 Email"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, "請輸入訊息內容"),
});

// 型別導出
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type FirmInput = z.infer<typeof firmSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
