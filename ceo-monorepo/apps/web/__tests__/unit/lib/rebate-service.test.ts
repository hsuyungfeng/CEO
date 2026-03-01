/**
 * Phase 4.5 Task 5 — Rebate Service 單元測試
 *
 * 測試範圍：
 * - 返利金額計算邏輯（純業務規則，不依賴 DB）
 * - 折扣率與金額的精度處理
 * - 多成員場景下的總返利計算
 */

import { getGroupDiscount } from '@/lib/group-buying'

// ─── 模擬 calcGroupRebates 的純計算邏輯 ────────────────────────────────────

/**
 * 模擬 rebate-service 的核心計算（抽離 DB 依賴）
 */
function calcRebates(orders: Array<{ userId: string; company: string; originalAmt: number; qty: number }>) {
  const totalQty     = orders.reduce((s, o) => s + o.qty, 0)
  const discountRate = getGroupDiscount(totalQty)

  const result = orders.map(o => ({
    ...o,
    rebateAmt:    Math.round(o.originalAmt * discountRate * 100) / 100,
    discountRate,
  }))

  const totalRebate = result.reduce((s, o) => s + o.rebateAmt, 0)

  return { totalQty, discountRate, totalRebate, orders: result }
}

// ─── 1. 基本返利計算 ──────────────────────────────────────────────────────────

describe('返利計算 — 基本場景', () => {
  it('無折扣（< 100 件）→ 所有人返利為 0', () => {
    const result = calcRebates([
      { userId: 'u1', company: 'A公司', originalAmt: 1000, qty: 50 },
      { userId: 'u2', company: 'B公司', originalAmt: 500,  qty: 30 },
    ])
    expect(result.discountRate).toBe(0)
    expect(result.totalRebate).toBe(0)
    result.orders.forEach(o => expect(o.rebateAmt).toBe(0))
  })

  it('5% 折扣（100–499 件）→ 各人返利正確', () => {
    const result = calcRebates([
      { userId: 'u1', company: 'A公司', originalAmt: 2000, qty: 80 },
      { userId: 'u2', company: 'B公司', originalAmt: 1000, qty: 50 },
    ])
    // 總件數 = 130 → 5% 折扣
    expect(result.totalQty).toBe(130)
    expect(result.discountRate).toBe(0.05)
    expect(result.orders[0].rebateAmt).toBe(100)   // 2000 × 5%
    expect(result.orders[1].rebateAmt).toBe(50)    // 1000 × 5%
    expect(result.totalRebate).toBe(150)
  })

  it('10% 折扣（500+ 件）→ 各人返利正確', () => {
    const result = calcRebates([
      { userId: 'u1', company: 'A公司', originalAmt: 5000, qty: 300 },
      { userId: 'u2', company: 'B公司', originalAmt: 3000, qty: 200 },
      { userId: 'u3', company: 'C公司', originalAmt: 2000, qty: 100 },
    ])
    // 總件數 = 600 → 10% 折扣
    expect(result.totalQty).toBe(600)
    expect(result.discountRate).toBe(0.10)
    expect(result.orders[0].rebateAmt).toBe(500)   // 5000 × 10%
    expect(result.orders[1].rebateAmt).toBe(300)   // 3000 × 10%
    expect(result.orders[2].rebateAmt).toBe(200)   // 2000 × 10%
    expect(result.totalRebate).toBe(1000)
  })
})

// ─── 2. 精度處理 ──────────────────────────────────────────────────────────────

describe('返利金額精度', () => {
  it('金額為非整數時，四捨五入到小數點後 2 位', () => {
    const result = calcRebates([
      { userId: 'u1', company: 'A公司', originalAmt: 333.33, qty: 150 },
    ])
    expect(result.discountRate).toBe(0.05)
    // 333.33 × 0.05 = 16.6665 → 四捨五入 = 16.67
    expect(result.orders[0].rebateAmt).toBe(16.67)
  })

  it('總返利是各筆返利的加總', () => {
    const result = calcRebates([
      { userId: 'u1', company: 'A', originalAmt: 100.01, qty: 100 },
      { userId: 'u2', company: 'B', originalAmt: 200.02, qty: 100 },
    ])
    const expectedTotal = result.orders.reduce((s, o) => s + o.rebateAmt, 0)
    expect(result.totalRebate).toBeCloseTo(expectedTotal, 2)
  })
})

// ─── 3. 邊界情境 ──────────────────────────────────────────────────────────────

describe('邊界情境', () => {
  it('只有一個成員，件數達 500，應享 10% 返利', () => {
    const result = calcRebates([
      { userId: 'u1', company: '單一大客戶', originalAmt: 10000, qty: 500 },
    ])
    expect(result.discountRate).toBe(0.10)
    expect(result.orders[0].rebateAmt).toBe(1000)
  })

  it('超大金額（不失精度）', () => {
    const result = calcRebates([
      { userId: 'u1', company: '大企業', originalAmt: 999999.99, qty: 600 },
    ])
    expect(result.discountRate).toBe(0.10)
    expect(result.orders[0].rebateAmt).toBe(100000)  // 999999.99 × 0.10 ≈ 100000
  })

  it('空訂單列表 → 總件數 0，折扣 0，總返利 0', () => {
    const result = calcRebates([])
    expect(result.totalQty).toBe(0)
    expect(result.discountRate).toBe(0)
    expect(result.totalRebate).toBe(0)
  })
})

// ─── 4. 冪等性驗證邏輯 ───────────────────────────────────────────────────────

describe('返利計算冪等性', () => {
  it('相同輸入，多次計算結果一致', () => {
    const input = [
      { userId: 'u1', company: 'A', originalAmt: 2000, qty: 200 },
      { userId: 'u2', company: 'B', originalAmt: 1500, qty: 150 },
    ]
    const r1 = calcRebates(input)
    const r2 = calcRebates(input)

    expect(r1.discountRate).toBe(r2.discountRate)
    expect(r1.totalRebate).toBe(r2.totalRebate)
    r1.orders.forEach((o, i) => {
      expect(o.rebateAmt).toBe(r2.orders[i].rebateAmt)
    })
  })
})
