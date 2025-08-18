/*
  Warnings:

  - You are about to drop the column `categoryFieldId` on the `ItemField` table. All the data in the column will be lost.
  - You are about to drop the `CategoryField` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `key` to the `ItemField` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."CategoryField" DROP CONSTRAINT "CategoryField_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ItemField" DROP CONSTRAINT "ItemField_categoryFieldId_fkey";

-- AlterTable
ALTER TABLE "public"."ItemField" DROP COLUMN "categoryFieldId",
ADD COLUMN     "key" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."CategoryField";
