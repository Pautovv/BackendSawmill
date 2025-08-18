-- DropForeignKey
ALTER TABLE "public"."TechCard" DROP CONSTRAINT "TechCard_itemId_fkey";

-- AlterTable
ALTER TABLE "public"."TechCard" ALTER COLUMN "itemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."TechCard" ADD CONSTRAINT "TechCard_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
