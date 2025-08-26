/*
  Warnings:

  - You are about to drop the column `nomenclatureId` on the `TechStepMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `TechStepMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `TechStepMaterial` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TechStepMaterial" DROP CONSTRAINT "TechStepMaterial_nomenclatureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TechStepMaterial" DROP CONSTRAINT "TechStepMaterial_unitId_fkey";

-- DropIndex
DROP INDEX "public"."TechStepMaterial_nomenclatureId_idx";

-- AlterTable
ALTER TABLE "public"."TechStepMaterial" DROP COLUMN "nomenclatureId",
DROP COLUMN "quantity",
DROP COLUMN "unitId";
