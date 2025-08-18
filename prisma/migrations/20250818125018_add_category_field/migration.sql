/*
  Warnings:

  - You are about to drop the column `key` on the `ItemField` table. All the data in the column will be lost.
  - Added the required column `categoryFieldId` to the `ItemField` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ItemField" DROP COLUMN "key",
ADD COLUMN     "categoryFieldId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."CategoryField" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CategoryField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."CategoryField" ADD CONSTRAINT "CategoryField_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemField" ADD CONSTRAINT "ItemField_categoryFieldId_fkey" FOREIGN KEY ("categoryFieldId") REFERENCES "public"."CategoryField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
