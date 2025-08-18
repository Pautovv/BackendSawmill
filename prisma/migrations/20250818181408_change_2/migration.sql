-- DropForeignKey
ALTER TABLE "public"."ItemField" DROP CONSTRAINT "ItemField_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TechStep" DROP CONSTRAINT "TechStep_techCardId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TechStepField" DROP CONSTRAINT "TechStepField_stepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TechStepMaterial" DROP CONSTRAINT "TechStepMaterial_stepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Unit" DROP CONSTRAINT "Unit_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ItemField" ADD CONSTRAINT "ItemField_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStep" ADD CONSTRAINT "TechStep_techCardId_fkey" FOREIGN KEY ("techCardId") REFERENCES "public"."TechCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."TechStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepField" ADD CONSTRAINT "TechStepField_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."TechStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
