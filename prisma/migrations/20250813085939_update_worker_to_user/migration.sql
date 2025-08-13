/*
  Warnings:

  - You are about to drop the column `workerId` on the `TaskSecondaryWorker` table. All the data in the column will be lost.
  - You are about to drop the `Worker` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `TaskSecondaryWorker` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."TaskSecondaryWorker" DROP CONSTRAINT "TaskSecondaryWorker_workerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TaskStep" DROP CONSTRAINT "TaskStep_mainWorkerId_fkey";

-- AlterTable
ALTER TABLE "public"."TaskSecondaryWorker" DROP COLUMN "workerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."Worker";

-- AddForeignKey
ALTER TABLE "public"."TaskStep" ADD CONSTRAINT "TaskStep_mainWorkerId_fkey" FOREIGN KEY ("mainWorkerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskSecondaryWorker" ADD CONSTRAINT "TaskSecondaryWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
