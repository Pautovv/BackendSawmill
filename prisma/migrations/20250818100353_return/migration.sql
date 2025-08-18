/*
  Warnings:

  - You are about to drop the column `fields` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `fields` on the `Item` table. All the data in the column will be lost.
  - Made the column `unit` on table `Item` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Category" DROP COLUMN "fields";

-- AlterTable
ALTER TABLE "public"."Item" DROP COLUMN "fields",
ALTER COLUMN "unit" SET NOT NULL;
