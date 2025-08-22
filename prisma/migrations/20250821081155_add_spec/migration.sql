/*
  Warnings:

  - You are about to drop the column `materialItemId` on the `TechStepMaterial` table. All the data in the column will be lost.
  - Added the required column `materialSpecId` to the `TechStepMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."TechStepMaterial" DROP CONSTRAINT "TechStepMaterial_materialItemId_fkey";

-- AlterTable
ALTER TABLE "public"."TechStepMaterial" DROP COLUMN "materialItemId",
ADD COLUMN     "itemId" INTEGER,
ADD COLUMN     "materialSpecId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."MaterialSpec" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSpec_name_key" ON "public"."MaterialSpec"("name");

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_materialSpecId_fkey" FOREIGN KEY ("materialSpecId") REFERENCES "public"."MaterialSpec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
