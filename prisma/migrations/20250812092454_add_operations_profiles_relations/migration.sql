-- CreateTable
CREATE TABLE "public"."Operation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_OperationMachines" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_OperationMachines_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ProfileOperations" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfileOperations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OperationMachines_B_index" ON "public"."_OperationMachines"("B");

-- CreateIndex
CREATE INDEX "_ProfileOperations_B_index" ON "public"."_ProfileOperations"("B");

-- AddForeignKey
ALTER TABLE "public"."_OperationMachines" ADD CONSTRAINT "_OperationMachines_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OperationMachines" ADD CONSTRAINT "_OperationMachines_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProfileOperations" ADD CONSTRAINT "_ProfileOperations_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProfileOperations" ADD CONSTRAINT "_ProfileOperations_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
