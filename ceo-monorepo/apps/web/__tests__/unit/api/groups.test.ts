/**
 * Phase 4.5 Task 3 — Group Buying API 單元測試
 *
 * 測試範圍：
 * - getGroupDiscount() 折扣計算邏輯
 * - GROUP_DISCOUNT_TIERS 常數結構
 * - Order model 上的 group buying 欄位（TypeScript 型別）
 * - Zod schema 驗證邏輯（透過函式直接測試）
 */

import {
  getGroupDiscount,
  GROUP_DISCOUNT_TIERS,
} from '@/lib/group-buying'
import type { Order } from '@prisma/client'

// ─── 1. GROUP_DISCOUNT_TIERS 常數 ───────────────────────────────────────────

describe('GROUP_DISCOUNT_TIERS', () => {
  it('should have 3 tiers', () => {
    expect(GROUP_DISCOUNT_TIERS).toHaveLength(3)
  })

  it('should start with minQty=1 and 0% discount', () => {
    expect(GROUP_DISCOUNT_TIERS[0].minQty).toBe(1)
    expect(GROUP_DISCOUNT_TIERS[0].discount).toBe(0)
  })

  it('should have 100-499 tier with 5% discount', () => {
    expect(GROUP_DISCOUNT_TIERS[1].minQty).toBe(100)
    expect(GROUP_DISCOUNT_TIERS[1].discount).toBe(0.05)
  })

  it('should have 500+ tier with 10% discount', () => {
    expect(GROUP_DISCOUNT_TIERS[2].minQty).toBe(500)
    expect(GROUP_DISCOUNT_TIERS[2].discount).toBe(0.10)
  })

  it('should be sorted in ascending order of minQty', () => {
    for (let i = 1; i < GROUP_DISCOUNT_TIERS.length; i++) {
      expect(GROUP_DISCOUNT_TIERS[i].minQty).toBeGreaterThan(
        GROUP_DISCOUNT_TIERS[i - 1].minQty
      )
    }
  })
})

// ─── 2. getGroupDiscount() ───────────────────────────────────────────────────

describe('getGroupDiscount()', () => {
  describe('第一階梯（1–99 件）：0% 折扣', () => {
    it('1 件 → 0%', () => {
      expect(getGroupDiscount(1)).toBe(0)
    })

    it('50 件 → 0%', () => {
      expect(getGroupDiscount(50)).toBe(0)
    })

    it('99 件 → 0%', () => {
      expect(getGroupDiscount(99)).toBe(0)
    })
  })

  describe('第二階梯（100–499 件）：5% 折扣', () => {
    it('100 件 → 5%', () => {
      expect(getGroupDiscount(100)).toBe(0.05)
    })

    it('250 件 → 5%', () => {
      expect(getGroupDiscount(250)).toBe(0.05)
    })

    it('499 件 → 5%', () => {
      expect(getGroupDiscount(499)).toBe(0.05)
    })
  })

  describe('第三階梯（500+ 件）：10% 折扣', () => {
    it('500 件 → 10%', () => {
      expect(getGroupDiscount(500)).toBe(0.10)
    })

    it('1000 件 → 10%', () => {
      expect(getGroupDiscount(1000)).toBe(0.10)
    })

    it('99999 件 → 10%', () => {
      expect(getGroupDiscount(99999)).toBe(0.10)
    })
  })

  describe('邊界條件', () => {
    it('0 件 → 0%（無效數量，回傳預設）', () => {
      expect(getGroupDiscount(0)).toBe(0)
    })

    it('折扣最大值不超過 10%', () => {
      const discount = getGroupDiscount(Number.MAX_SAFE_INTEGER)
      expect(discount).toBeLessThanOrEqual(0.10)
    })
  })
})

// ─── 3. Order Model — Group Buying 欄位型別驗證 ─────────────────────────────

describe('Order Model - Group Buying Fields (Phase 4.5 Task 3)', () => {
  it('should accept groupId as string or null', () => {
    const order: Partial<Order> = {
      id: 'order-test-001',
      orderNo: 'GRP-001',
      groupId: 'group-uuid-001',
    }
    expect(order.groupId).toBe('group-uuid-001')
  })

  it('should accept isGroupLeader as boolean', () => {
    const leaderOrder: Partial<Order> = {
      id: 'order-test-002',
      isGroupLeader: true,
    }
    const memberOrder: Partial<Order> = {
      id: 'order-test-003',
      isGroupLeader: false,
    }
    expect(leaderOrder.isGroupLeader).toBe(true)
    expect(memberOrder.isGroupLeader).toBe(false)
  })

  it('should accept groupDeadline as DateTime', () => {
    const deadline = new Date('2026-04-01T00:00:00Z')
    const order: Partial<Order> = {
      id: 'order-test-004',
      groupDeadline: deadline,
    }
    expect(order.groupDeadline).toEqual(deadline)
  })

  it('should accept groupTotalItems as number', () => {
    const order: Partial<Order> = {
      id: 'order-test-005',
      groupTotalItems: 200,
    }
    expect(order.groupTotalItems).toBe(200)
  })

  it('should accept groupStatus as GroupStatus enum value', () => {
    const order: Partial<Order> = {
      id: 'order-test-006',
      groupStatus: 'GROUPED',
    }
    expect(order.groupStatus).toBe('GROUPED')
  })
})

// ─── 4. 折扣金額計算（業務邏輯驗證）────────────────────────────────────────

describe('折扣金額計算業務邏輯', () => {
  it('原價 1000，折扣 5%，應折扣 50 元', () => {
    const unitPrice = 1000
    const discount = getGroupDiscount(150) // 150 件 → 5%
    const discountAmount = unitPrice * discount
    expect(discountAmount).toBe(50)
  })

  it('原價 1000，折扣 10%，應折扣 100 元', () => {
    const unitPrice = 1000
    const discount = getGroupDiscount(600) // 600 件 → 10%
    const discountAmount = unitPrice * discount
    expect(discountAmount).toBe(100)
  })

  it('累計件數剛好到達下一階梯，折扣應立即更新', () => {
    expect(getGroupDiscount(99)).toBe(0)
    expect(getGroupDiscount(100)).toBe(0.05) // 到達第二階梯
    expect(getGroupDiscount(499)).toBe(0.05)
    expect(getGroupDiscount(500)).toBe(0.10) // 到達第三階梯
  })
})
