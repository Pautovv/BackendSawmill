-- CreateTable
CREATE TABLE "public"."Passport" (
    "id" SERIAL NOT NULL,
    "productName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PassportStep" (
    "id" SERIAL NOT NULL,
    "passportId" INTEGER NOT NULL,
    "machineId" INTEGER,
    "operationId" INTEGER,
    "profileId" INTEGER,
    "rawMaterialId" INTEGER,
    "repeats" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PassportStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Passport_productName_idx" ON "public"."Passport"("productName");

-- AddForeignKey
ALTER TABLE "public"."PassportStep" ADD CONSTRAINT "PassportStep_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "public"."Passport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PassportStep" ADD CONSTRAINT "PassportStep_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PassportStep" ADD CONSTRAINT "PassportStep_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PassportStep" ADD CONSTRAINT "PassportStep_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PassportStep" ADD CONSTRAINT "PassportStep_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
