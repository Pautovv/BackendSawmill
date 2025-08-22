/*
  Warnings:

  - You are about to drop the `MaterialSpec` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TechStepMaterial" DROP CONSTRAINT "TechStepMaterial_materialSpecId_fkey";

-- DropTable
DROP TABLE "public"."MaterialSpec";
