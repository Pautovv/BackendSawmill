-- AlterTable
ALTER TABLE "public"."TechStepMaterial" ADD COLUMN     "nomenclatureId" INTEGER,
ADD COLUMN     "unitId" INTEGER;

-- CreateIndex
CREATE INDEX "TechStepMaterial_nomenclatureId_idx" ON "public"."TechStepMaterial"("nomenclatureId");

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "public"."Nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
