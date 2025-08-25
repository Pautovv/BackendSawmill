-- CreateEnum
CREATE TYPE "public"."NomenclatureType" AS ENUM ('TECH_CARD_NAME', 'TECH_STEP_NAME', 'MACHINE', 'MATERIAL');

-- AlterTable
ALTER TABLE "public"."TechCard" ADD COLUMN     "nomenclatureId" INTEGER;

-- AlterTable
ALTER TABLE "public"."TechStep" ADD COLUMN     "machineNomenclatureId" INTEGER,
ADD COLUMN     "nomenclatureId" INTEGER;

-- AlterTable
ALTER TABLE "public"."TechStepMaterial" ADD COLUMN     "nomenclatureId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Nomenclature" (
    "id" SERIAL NOT NULL,
    "type" "public"."NomenclatureType" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomenclature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nomenclature_type_idx" ON "public"."Nomenclature"("type");

-- CreateIndex
CREATE INDEX "Nomenclature_isActive_idx" ON "public"."Nomenclature"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Nomenclature_type_name_key" ON "public"."Nomenclature"("type", "name");

-- CreateIndex
CREATE INDEX "TechStep_nomenclatureId_idx" ON "public"."TechStep"("nomenclatureId");

-- CreateIndex
CREATE INDEX "TechStep_machineNomenclatureId_idx" ON "public"."TechStep"("machineNomenclatureId");

-- CreateIndex
CREATE INDEX "TechStepMaterial_nomenclatureId_idx" ON "public"."TechStepMaterial"("nomenclatureId");

-- CreateIndex
CREATE INDEX "TechStepMaterial_itemId_idx" ON "public"."TechStepMaterial"("itemId");

-- AddForeignKey
ALTER TABLE "public"."TechCard" ADD CONSTRAINT "TechCard_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "public"."Nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStep" ADD CONSTRAINT "TechStep_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "public"."Nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStep" ADD CONSTRAINT "TechStep_machineNomenclatureId_fkey" FOREIGN KEY ("machineNomenclatureId") REFERENCES "public"."Nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_nomenclatureId_fkey" FOREIGN KEY ("nomenclatureId") REFERENCES "public"."Nomenclature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
