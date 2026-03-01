-- Phase 4.5 Task 2: Extend Invoice Model for Group Buying
-- Add isGroupInvoice and groupId fields to invoices table

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "isGroupInvoice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- Add index for groupId lookups
CREATE INDEX IF NOT EXISTS "invoices_groupId_idx" ON "invoices"("groupId");

COMMENT ON COLUMN "invoices"."isGroupInvoice" IS '是否為團購返利發票 (Phase 4.5)';
COMMENT ON COLUMN "invoices"."groupId" IS '所屬團購 ID (Phase 4.5)';
