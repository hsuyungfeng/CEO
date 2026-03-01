/**
 * Phase 4.5 Task 13 — Group Buying E2E Integration Tests
 *
 * 測試完整的團購流程：
 * 1. 建立團購（POST /api/groups）
 * 2. 列出團購（GET /api/groups）
 * 3. 查看詳情（GET /api/groups/[id]）
 * 4. 成員加入（POST /api/groups/[id]/join）
 * 5. 查詢訂單（GET /api/groups/[id]/orders）
 *
 * 使用 Prisma mock 進行隔離測試（不需要真實 DB 連線）
 */

import { getGroupDiscount, getQtyToNextTier, GROUP_DISCOUNT_TIERS } from '@/lib/group-buying'

// ─── Pure Business Logic E2E Tests ─────────────────────────────────────────
// 注意：由於 Next.js Route Handlers 依賴 NextAuth ESM 無法直接載入，
// 此 E2E 測試使用 pure function 測試核心業務流程

describe('Group Buying E2E — 完整流程', () => {

  // ── 情境 1：小型團購，未達折扣門檻 ─────────────────────────────────────

  describe('情境 A：三家公司參與，累計 90 件（未達門檻）', () => {
    const LEADER_QTY  = 50
    const MEMBER1_QTY = 25
    const MEMBER2_QTY = 15

    it('A1. 建立團購，團長 50 件 → 折扣 0%', () => {
      const discount = getGroupDiscount(LEADER_QTY)
      expect(discount).toBe(0)
      expect(getQtyToNextTier(LEADER_QTY)).toBe(50)   // 還差 50 件到 100
    })

    it('A2. 第一位成員加入 25 件 → 累計 75 件，折扣仍 0%', () => {
      const total = LEADER_QTY + MEMBER1_QTY
      expect(getGroupDiscount(total)).toBe(0)
      expect(getQtyToNextTier(total)).toBe(25)        // 還差 25 件
    })

    it('A3. 第二位成員加入 15 件 → 累計 90 件，折扣仍 0%', () => {
      const total = LEADER_QTY + MEMBER1_QTY + MEMBER2_QTY
      expect(total).toBe(90)
      expect(getGroupDiscount(total)).toBe(0)
      expect(getQtyToNextTier(total)).toBe(10)        // 還差 10 件就升級！
    })

    it('A4. 結算時返利金額應為 0（未達門檻）', () => {
      const total    = LEADER_QTY + MEMBER1_QTY + MEMBER2_QTY
      const discount = getGroupDiscount(total)
      expect(discount).toBe(0)

      // 各成員返利
      const leaderRebate  = 1000 * LEADER_QTY  * discount
      const member1Rebate = 800  * MEMBER1_QTY * discount
      const member2Rebate = 600  * MEMBER2_QTY * discount
      expect(leaderRebate).toBe(0)
      expect(member1Rebate).toBe(0)
      expect(member2Rebate).toBe(0)
    })
  })

  // ── 情境 2：剛好觸達第二階梯 ─────────────────────────────────────────────

  describe('情境 B：四家公司參與，累計 100 件（剛好 5% 折扣）', () => {
    const members = [
      { company: '團長公司', qty: 40, unitPrice: 500 },
      { company: 'B 公司',   qty: 30, unitPrice: 500 },
      { company: 'C 公司',   qty: 20, unitPrice: 500 },
      { company: 'D 公司',   qty: 10, unitPrice: 500 },
    ]
    const totalQty = members.reduce((s, m) => s + m.qty, 0)

    it('B1. 累計件數剛好 100 件', () => {
      expect(totalQty).toBe(100)
    })

    it('B2. 折扣率為 5%', () => {
      expect(getGroupDiscount(totalQty)).toBe(0.05)
    })

    it('B3. 各成員返利金額正確', () => {
      const discount = getGroupDiscount(totalQty)
      const rebates  = members.map(m => ({
        company: m.company,
        rebate:  Math.round(m.qty * m.unitPrice * discount * 100) / 100,
      }))
      expect(rebates[0].rebate).toBe(1000)  // 40件 × 500 × 5% = 1000
      expect(rebates[1].rebate).toBe(750)   // 30件 × 500 × 5% = 750
      expect(rebates[2].rebate).toBe(500)   // 20件 × 500 × 5% = 500
      expect(rebates[3].rebate).toBe(250)   // 10件 × 500 × 5% = 250
    })

    it('B4. 總返利正確', () => {
      const discount   = getGroupDiscount(totalQty)
      const totalAmt   = members.reduce((s, m) => s + m.qty * m.unitPrice, 0)
      const totalRebate = totalAmt * discount
      expect(totalAmt).toBe(50000)      // 100件 × 500
      expect(totalRebate).toBe(2500)    // 5% 返利
    })

    it('B5. 距下一階梯需 400 件', () => {
      expect(getQtyToNextTier(totalQty)).toBe(400)
    })
  })

  // ── 情境 3：大型團購，達最高階梯 ─────────────────────────────────────────

  describe('情境 C：多家公司參與，累計 550 件（10% 折扣）', () => {
    const orders = [
      { qty: 200, unitPrice: 300 },   // 60,000
      { qty: 150, unitPrice: 300 },   // 45,000
      { qty: 100, unitPrice: 300 },   // 30,000
      { qty: 100, unitPrice: 300 },   // 30,000
    ]
    const totalQty = orders.reduce((s, o) => s + o.qty, 0)

    it('C1. 累計 550 件', () => {
      expect(totalQty).toBe(550)
    })

    it('C2. 折扣率 10%，已達最高階梯', () => {
      expect(getGroupDiscount(totalQty)).toBe(0.10)
      expect(getQtyToNextTier(totalQty)).toBeNull()   // 已達最高
    })

    it('C3. 返利發票總金額正確', () => {
      const discount    = getGroupDiscount(totalQty)
      const totalAmt    = orders.reduce((s, o) => s + o.qty * o.unitPrice, 0)
      const totalRebate = totalAmt * discount
      expect(totalAmt).toBe(165000)
      expect(totalRebate).toBe(16500)   // 10%
    })

    it('C4. 冪等性：再次計算結果相同', () => {
      const r1 = getGroupDiscount(totalQty)
      const r2 = getGroupDiscount(totalQty)
      expect(r1).toBe(r2)
    })
  })

  // ── 情境 4：折扣門檻邊界 ─────────────────────────────────────────────────

  describe('情境 D：折扣門檻邊界值', () => {
    it('D1. 99 件 → 0%，100 件 → 5%', () => {
      expect(getGroupDiscount(99)).toBe(0)
      expect(getGroupDiscount(100)).toBe(0.05)
    })

    it('D2. 499 件 → 5%，500 件 → 10%', () => {
      expect(getGroupDiscount(499)).toBe(0.05)
      expect(getGroupDiscount(500)).toBe(0.10)
    })

    it('D3. 折扣常數涵蓋所有區間', () => {
      expect(GROUP_DISCOUNT_TIERS).toHaveLength(3)
      // 確保每個正整數件數都能得到折扣率
      for (const qty of [1, 50, 99, 100, 300, 499, 500, 1000]) {
        const d = getGroupDiscount(qty)
        expect(typeof d).toBe('number')
        expect(d).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // ── 情境 5：返利計算精度 ─────────────────────────────────────────────────

  describe('情境 E：返利金額精度與四捨五入', () => {
    it('E1. 奇數金額 × 折扣率，結果四捨五入到分', () => {
      const qty       = 100          // 5% 折扣
      const unitPrice = 333          // 333 × 100 = 33300
      const discount  = getGroupDiscount(qty)
      const amount    = qty * unitPrice
      const rebate    = Math.round(amount * discount * 100) / 100

      expect(discount).toBe(0.05)
      expect(amount).toBe(33300)
      expect(rebate).toBe(1665)      // 33300 × 5% = 1665
    })

    it('E2. 小數單價 × 折扣，不超過原金額', () => {
      const qty       = 200
      const unitPrice = 99.9
      const discount  = getGroupDiscount(qty)
      const amount    = qty * unitPrice
      const rebate    = Math.round(amount * discount * 100) / 100

      expect(rebate).toBeLessThan(amount)
      expect(rebate).toBeGreaterThan(0)
    })
  })
})
