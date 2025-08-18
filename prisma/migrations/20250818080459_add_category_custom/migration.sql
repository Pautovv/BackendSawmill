/*
  Warnings:

  - You are about to drop the column `category` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Unit` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Item" DROP COLUMN "category",
ADD COLUMN     "categoryId" INTEGER NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Unit" DROP COLUMN "category",
ADD COLUMN     "categoryId" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "public"."Category";

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_path_key" ON "public"."Category"("path");

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
