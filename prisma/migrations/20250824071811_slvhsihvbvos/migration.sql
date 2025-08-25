-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "shelfId" INTEGER,
ADD COLUMN     "warehouseId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shelf" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_name_key" ON "public"."Warehouse"("name");

-- CreateIndex
CREATE INDEX "Shelf_warehouseId_idx" ON "public"."Shelf"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_warehouseId_name_key" ON "public"."Shelf"("warehouseId", "name");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "public"."Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_warehouseId_idx" ON "public"."Item"("warehouseId");

-- CreateIndex
CREATE INDEX "Item_shelfId_idx" ON "public"."Item"("shelfId");

-- CreateIndex
CREATE INDEX "ItemField_itemId_idx" ON "public"."ItemField"("itemId");

-- CreateIndex
CREATE INDEX "ItemField_key_idx" ON "public"."ItemField"("key");

-- AddForeignKey
ALTER TABLE "public"."Shelf" ADD CONSTRAINT "Shelf_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "public"."Shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;
