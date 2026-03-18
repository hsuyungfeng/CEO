// CEO 團購電商平台 - 共用型別定義

// ===== 認證相關 =====
export * from './auth';

// ===== 商品相關 =====

export interface ProductType {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  image?: string;
  unit?: string;
  spec?: string;
  firmId?: string;
  categoryId?: string;
  isActive: boolean;
  isFeatured: boolean;
  startDate?: Date;
  endDate?: Date;
  totalSold: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  priceTiers: PriceTierType[];
  firm?: FirmType;
  category?: CategoryType;
}

export interface PriceTierType {
  id: string;
  productId: string;
  minQty: number;
  price: number;
}

export type ProductWithTiers = ProductType & {
  priceTiers: PriceTierType[];
  firm: FirmType | null;
  category: CategoryType | null;
};

export type ProductListItem = Pick<
  ProductType,
  "id" | "name" | "subtitle" | "image" | "isFeatured" | "startDate" | "endDate" | "totalSold"
> & {
  priceTiers: Pick<PriceTierType, "minQty" | "price">[];
  firm: Pick<FirmType, "name"> | null;
};

// ===== 訂單相關 =====

export interface OrderType {
  id: string;
  orderNo: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  note?: string;
  pointsEarned: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemType[];
}

export interface OrderItemType {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: ProductType;
}

export type OrderWithItems = OrderType & {
  items: (OrderItemType & {
    product: Pick<ProductType, "id" | "name" | "image" | "unit">;
  })[];
  user: {
    id: string;
    name: string;
    email: string;
  };
};

// ===== 購物車相關 =====

export type CartItemWithProduct = {
  id: string;
  quantity: number;
  product: ProductWithTiers;
};

// ===== 用戶相關 =====

export interface UserType {
  id: string;
  email: string;
  name: string;
  taxId: string;
  phone?: string;
  fax?: string;
  address?: string;
  contactPerson?: string;
  points: number;
  role: 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 分類相關 =====

export interface CategoryType {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  children?: CategoryType[];
  products?: ProductType[];
}

export type CategoryTree = CategoryType & {
  children: CategoryTree[];
};

// ===== 廠商相關 =====

export interface FirmType {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  products?: ProductType[];
}

// ===== 分頁 =====

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ===== API 回應 =====

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};