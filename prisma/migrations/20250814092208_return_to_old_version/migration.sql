/*
  Warnings:

  - You are about to drop the column `locationId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `shelfId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Shelf` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `location` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shelf` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Item" DROP CONSTRAINT "Item_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Item" DROP CONSTRAINT "Item_shelfId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Shelf" DROP CONSTRAINT "Shelf_locationId_fkey";

-- AlterTable
ALTER TABLE "public"."Item" DROP COLUMN "locationId",
DROP COLUMN "shelfId",
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "shelf" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Location";

-- DropTable
DROP TABLE "public"."Shelf";
