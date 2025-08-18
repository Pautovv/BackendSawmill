/*
  Warnings:

  - You are about to drop the column `location` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `shelf` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the `_OperationMachines` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PassportStep" DROP CONSTRAINT "PassportStep_machineId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PassportStep" DROP CONSTRAINT "PassportStep_rawMaterialId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_OperationMachines" DROP CONSTRAINT "_OperationMachines_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_OperationMachines" DROP CONSTRAINT "_OperationMachines_B_fkey";

-- AlterTable
ALTER TABLE "public"."Item" DROP COLUMN "location",
DROP COLUMN "quantity",
DROP COLUMN "shelf",
DROP COLUMN "unit",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "public"."_OperationMachines";

-- CreateTable
CREATE TABLE "public"."ItemField" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ItemField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ItemField" ADD CONSTRAINT "ItemField_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
