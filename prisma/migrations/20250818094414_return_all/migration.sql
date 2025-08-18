/*
  Warnings:

  - Added the required column `location` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shelf` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shelf" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT;
