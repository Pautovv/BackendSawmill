/*
  Warnings:

  - You are about to drop the column `telegramId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Passport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PassportStep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskSecondaryWorker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskStep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProfileOperations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PassportStep" DROP CONSTRAINT "PassportStep_operationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PassportStep" DROP CONSTRAINT "PassportStep_passportId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PassportStep" DROP CONSTRAINT "PassportStep_profileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_passportId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TaskSecondaryWorker" DROP CONSTRAINT "TaskSecondaryWorker_stepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TaskSecondaryWorker" DROP CONSTRAINT "TaskSecondaryWorker_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TaskStep" DROP CONSTRAINT "TaskStep_mainWorkerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TaskStep" DROP CONSTRAINT "TaskStep_taskId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ProfileOperations" DROP CONSTRAINT "_ProfileOperations_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ProfileOperations" DROP CONSTRAINT "_ProfileOperations_B_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "telegramId";

-- DropTable
DROP TABLE "public"."Passport";

-- DropTable
DROP TABLE "public"."PassportStep";

-- DropTable
DROP TABLE "public"."Profile";

-- DropTable
DROP TABLE "public"."Task";

-- DropTable
DROP TABLE "public"."TaskSecondaryWorker";

-- DropTable
DROP TABLE "public"."TaskStep";

-- DropTable
DROP TABLE "public"."_ProfileOperations";

-- CreateTable
CREATE TABLE "public"."_ItemToOperation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ItemToOperation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ItemToOperation_B_index" ON "public"."_ItemToOperation"("B");

-- AddForeignKey
ALTER TABLE "public"."_ItemToOperation" ADD CONSTRAINT "_ItemToOperation_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ItemToOperation" ADD CONSTRAINT "_ItemToOperation_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
