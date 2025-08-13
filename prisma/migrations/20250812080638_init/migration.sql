-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('LOGS', 'LUMBER_NATURAL', 'LUMBER_DRY', 'PLANED_PRODUCTS', 'PAINTS_VARNISHES', 'FURNITURE', 'TOOLS', 'MACHINES');

-- CreateTable
CREATE TABLE "public"."Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "category" "public"."Category" NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);
