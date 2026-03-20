import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthData } from '@/lib/auth-helper';
import { z } from 'zod';

const mergeSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).max(50),
});

/**
 * POST /api/cart/merge
 * 合併訪客購物車到登入使用者購物車
 * 策略：若商品已存在則累加數量
 */
export async function POST(request: NextRequest) {
  const authData = await getAuthData(request);
  if (!authData) {
    return NextResponse.json({ error: '未授權，請先登入' }, { status: 401 });
  }

  const { userId } = authData;
  const body = await request.json();
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '資料格式錯誤', errors: parsed.error.issues }, { status: 400 });
  }

  const { items } = parsed.data;
  if (items.length === 0) {
    return NextResponse.json({ merged: 0 });
  }

  // 取得合法商品列表（只合併目前仍上架的商品）
  const validProducts = await prisma.product.findMany({
    where: {
      id: { in: items.map(i => i.productId) },
      isActive: true,
    },
    select: { id: true },
  });
  const validIds = new Set(validProducts.map(p => p.id));

  let merged = 0;
  for (const item of items) {
    if (!validIds.has(item.productId)) continue;
    await prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId: item.productId } },
      update: { quantity: { increment: item.quantity } },
      create: { userId, productId: item.productId, quantity: item.quantity },
    });
    merged++;
  }

  return NextResponse.json({ merged });
}
