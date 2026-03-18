/**
 * 階梯定價計算引擎
 *
 * 業務規則（沿用舊系統）：
 * - 每個商品可設定多個價格區間 (PriceTier)
 * - 每個區間有最低數量 (minQty) 和單價 (price)
 * - 購買數量匹配 >= minQty 的最高區間
 * - 量多價優，鼓勵批量採購
 *
 * 範例：
 *   minQty=1   price=100  → 買 1-4 個，每個 100 元
 *   minQty=5   price=90   → 買 5-9 個，每個 90 元
 *   minQty=10  price=80   → 買 10+ 個，每個 80 元
 */

export interface PriceTier {
  minQty: number;
  price: number;
}

/**
 * 根據購買數量計算適用的單價
 */
export function calculateUnitPrice(
  quantity: number,
  tiers: PriceTier[]
): number {
  if (tiers.length === 0) return 0;

  // 按 minQty 升序排列
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  // 找到 quantity >= minQty 的最高區間
  let applicableTier = sorted[0];
  for (const tier of sorted) {
    if (quantity >= tier.minQty) {
      applicableTier = tier;
    } else {
      break;
    }
  }

  return applicableTier.price;
}

/**
 * 計算小計金額
 */
export function calculateSubtotal(
  quantity: number,
  tiers: PriceTier[]
): number {
  const unitPrice = calculateUnitPrice(quantity, tiers);
  return quantity * unitPrice;
}

/**
 * 取得所有價格區間的展示資訊
 */
export function formatPriceTiers(
  tiers: PriceTier[]
): { range: string; price: number }[] {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  return sorted.map((tier, index) => {
    const nextTier = sorted[index + 1];
    const range = nextTier
      ? `${tier.minQty} - ${nextTier.minQty - 1}`
      : `${tier.minQty}+`;

    return { range, price: tier.price };
  });
}
