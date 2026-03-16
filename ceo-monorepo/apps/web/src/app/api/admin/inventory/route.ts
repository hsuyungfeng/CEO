import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  lastUpdated: string;
  status: 'normal' | 'low' | 'critical' | 'overstock';
}

function getInventoryStatus(
  currentStock: number,
  minStock: number,
  maxStock: number
): 'normal' | 'low' | 'critical' | 'overstock' {
  if (currentStock === 0) return 'critical';
  if (currentStock < minStock) return 'low';
  if (currentStock > maxStock) return 'overstock';
  return 'normal';
}

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取所有產品並計算庫存狀態
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    const inventoryItems: InventoryItem[] = products.map((product) => ({
      id: product.id,
      productId: product.id,
      productName: product.name,
      sku: `SKU-${product.id.substring(0, 8)}`,
      currentStock: Math.floor(Math.random() * 100),
      minStock: 10,
      maxStock: 1000,
      lastUpdated: product.updatedAt.toISOString(),
      status: getInventoryStatus(
        Math.floor(Math.random() * 100),
        10,
        1000
      ),
    }));

    return NextResponse.json({
      success: true,
      data: inventoryItems,
    });
  } catch (error) {
    console.error('獲取庫存錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      },
      { status: 500 }
    );
  }
}
