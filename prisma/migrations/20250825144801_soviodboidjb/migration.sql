-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."TaskStepAssignment" ADD COLUMN     "plannedQuantity" DOUBLE PRECISION;
