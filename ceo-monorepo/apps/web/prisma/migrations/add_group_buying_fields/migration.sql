-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('INDIVIDUAL', 'GROUPED');

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "groupId" TEXT,
  ADD COLUMN "groupStatus" "GroupStatus",
  ADD COLUMN "isGroupLeader" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "groupDeadline" TIMESTAMP(3),
  ADD COLUMN "groupTotalItems" INTEGER,
  ADD COLUMN "groupRefund" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "orders_groupId_idx" ON "orders"("groupId");
