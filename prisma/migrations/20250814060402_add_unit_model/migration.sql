-- AlterTable
ALTER TABLE "public"."Item" ALTER COLUMN "unit" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" SERIAL NOT NULL,
    "unit" TEXT NOT NULL,
    "factor" DOUBLE PRECISION NOT NULL,
    "category" "public"."Category" NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);
