/**
 * Phase 4.5 — Group Buying 核心邏輯
 *
 * 抽離至此模組，方便單元測試（避免 NextAuth ESM 污染測試環境）
 */

// ─── 階梯折扣常數 ────────────────────────────────────────────────────────────
export const GROUP_DISCOUNT_TIERS = [
  { minQty: 1,   discount: 0    }, // 1-99 件：無折扣
  { minQty: 100, discount: 0.05 }, // 100-499 件：5% 折扣
  { minQty: 500, discount: 0.10 }, // 500+ 件：10% 折扣
] as const

export type DiscountTier = typeof GROUP_DISCOUNT_TIERS[number]

/** 根據總件數計算當前折扣率 */
export function getGroupDiscount(totalQty: number): number {
  const tier = [...GROUP_DISCOUNT_TIERS]
    .reverse()
    .find(t => totalQty >= t.minQty)
  return tier?.discount ?? 0
}

/** 計算下一個折扣階梯的所需件數（null 表示已達最高階梯） */
export function getQtyToNextTier(totalQty: number): number | null {
  const nextTier = GROUP_DISCOUNT_TIERS.find(t => t.minQty > totalQty)
  return nextTier ? nextTier.minQty - totalQty : null
}
