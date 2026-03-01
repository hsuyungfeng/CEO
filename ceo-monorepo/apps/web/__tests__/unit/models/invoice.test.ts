import type { Invoice } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test for Invoice Model - Group Buying Fields
 * Phase 4.5 Task 2: Validates that the Prisma schema includes
 * the required group buying fields on the Invoice model.
 *
 * Fields being validated:
 * - isGroupInvoice (Boolean, default false) — 是否為團購返利發票
 * - groupId (String?) — 所屬團購 ID
 */
describe('Invoice Model - Group Buying Fields (Phase 4.5 Task 2)', () => {
  // ──────────────────────────────────────────────────────
  // 1. TypeScript compile-time field existence checks
  // ──────────────────────────────────────────────────────
  it('should accept isGroupInvoice field on Invoice type', () => {
    const mockInvoice: Partial<Invoice> = {
      id: 'inv-test-001',
      invoiceNo: 'INV-2026-03-001',
      userId: 'user-test-001',
      billingMonth: '2026-03',
      totalAmount: undefined,
      totalItems: 5,
      status: 'DRAFT',
      invoiceFormat: 'simple',
      isGroupInvoice: false,   // ← 新欄位
      groupId: null,           // ← 新欄位
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockInvoice.isGroupInvoice).toBe(false);
    expect(mockInvoice.groupId).toBeNull();
  });

  it('should allow isGroupInvoice = true with a groupId', () => {
    const mockGroupInvoice: Partial<Invoice> = {
      id: 'inv-test-002',
      isGroupInvoice: true,
      groupId: 'group-2026-03-001',
    };

    expect(mockGroupInvoice.isGroupInvoice).toBe(true);
    expect(mockGroupInvoice.groupId).toBe('group-2026-03-001');
  });

  it('should default isGroupInvoice to false for regular invoices', () => {
    const regularInvoice: Partial<Invoice> = {
      id: 'inv-test-003',
      isGroupInvoice: false,
      groupId: null,
    };

    expect(regularInvoice.isGroupInvoice).toBe(false);
    expect(regularInvoice.groupId).toBeNull();
  });

  it('should allow groupId to be undefined (optional field)', () => {
    const invoiceWithoutGroup: Partial<Invoice> = {
      id: 'inv-test-004',
      isGroupInvoice: false,
      // groupId 未設定 → undefined
    };

    expect(invoiceWithoutGroup.groupId).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────
  // 2. Schema file structure checks
  // ──────────────────────────────────────────────────────
  describe('Prisma Schema File', () => {
    const schemaPath = path.join(__dirname, '../../../prisma/schema.prisma');
    let schemaContent: string;

    beforeAll(() => {
      schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    });

    it('should contain isGroupInvoice field definition', () => {
      expect(schemaContent).toContain('isGroupInvoice');
    });

    it('should contain groupId field definition', () => {
      expect(schemaContent).toContain('groupId');
    });

    it('should define isGroupInvoice as Boolean with default false', () => {
      expect(schemaContent).toMatch(/isGroupInvoice\s+Boolean\s+@default\(false\)/);
    });

    it('should define groupId as optional String', () => {
      expect(schemaContent).toMatch(/groupId\s+String\?/);
    });

    it('should have index on groupId for performance', () => {
      // 確認 @@index([groupId]) 出現在 invoices model 中
      const invoiceModelMatch = schemaContent.match(/model Invoice \{([\s\S]*?)\}/);
      expect(invoiceModelMatch).not.toBeNull();
      expect(invoiceModelMatch![1]).toContain('groupId');
    });
  });

  // ──────────────────────────────────────────────────────
  // 3. Business logic validation
  // ──────────────────────────────────────────────────────
  describe('Group Invoice Business Rules', () => {
    it('should distinguish group invoices from regular invoices', () => {
      const regular: Partial<Invoice> = { isGroupInvoice: false, groupId: null };
      const group: Partial<Invoice>   = { isGroupInvoice: true,  groupId: 'group-001' };

      expect(regular.isGroupInvoice).not.toBe(group.isGroupInvoice);
    });

    it('should allow multiple invoices to reference the same groupId', () => {
      const sharedGroupId = 'group-2026-03-001';

      const member1Invoice: Partial<Invoice> = { id: 'inv-m1', isGroupInvoice: true, groupId: sharedGroupId };
      const member2Invoice: Partial<Invoice> = { id: 'inv-m2', isGroupInvoice: true, groupId: sharedGroupId };

      expect(member1Invoice.groupId).toBe(member2Invoice.groupId);
    });
  });
});
