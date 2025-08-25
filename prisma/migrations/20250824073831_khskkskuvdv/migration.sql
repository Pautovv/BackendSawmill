-- AlterTable
ALTER TABLE "public"."Warehouse" ADD COLUMN     "responsibleId" INTEGER;

-- CreateIndex
CREATE INDEX "Warehouse_responsibleId_idx" ON "public"."Warehouse"("responsibleId");

-- AddForeignKey
ALTER TABLE "public"."Warehouse" ADD CONSTRAINT "Warehouse_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
