-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MONTHLY_BILLING');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';
