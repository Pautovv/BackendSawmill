-- CreateTable
CREATE TABLE "public"."TechCard" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TechStep" (
    "id" SERIAL NOT NULL,
    "techCardId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "operationId" INTEGER,
    "machineItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TechStepMaterial" (
    "id" SERIAL NOT NULL,
    "stepId" INTEGER NOT NULL,
    "materialItemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitId" INTEGER,

    CONSTRAINT "TechStepMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TechStepField" (
    "id" SERIAL NOT NULL,
    "stepId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TechStepField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechStep_techCardId_order_key" ON "public"."TechStep"("techCardId", "order");

-- AddForeignKey
ALTER TABLE "public"."TechCard" ADD CONSTRAINT "TechCard_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStep" ADD CONSTRAINT "TechStep_techCardId_fkey" FOREIGN KEY ("techCardId") REFERENCES "public"."TechCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStep" ADD CONSTRAINT "TechStep_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStep" ADD CONSTRAINT "TechStep_machineItemId_fkey" FOREIGN KEY ("machineItemId") REFERENCES "public"."Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."TechStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepMaterial" ADD CONSTRAINT "TechStepMaterial_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechStepField" ADD CONSTRAINT "TechStepField_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."TechStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
