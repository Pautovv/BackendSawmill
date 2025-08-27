-- AlterTable
ALTER TABLE "public"."TaskDocument" ADD COLUMN     "printable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "TaskDocument_printable_idx" ON "public"."TaskDocument"("printable");
