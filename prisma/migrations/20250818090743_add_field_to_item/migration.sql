/*
  Warnings:

  - You are about to drop the column `location` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `shelf` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Item` table. All the data in the column will be lost.
  - Added the required column `fields` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Item" DROP COLUMN "location",
DROP COLUMN "quantity",
DROP COLUMN "shelf",
DROP COLUMN "unit",
ADD COLUMN     "fields" JSONB NOT NULL;
