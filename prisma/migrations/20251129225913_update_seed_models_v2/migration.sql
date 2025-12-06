/*
  Warnings:

  - You are about to drop the `SeedCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "CannabisType" ADD VALUE 'RUDERALIS';

-- AlterEnum
ALTER TYPE "SeedType" ADD VALUE 'PHOTOPERIOD';

-- DropForeignKey
ALTER TABLE "SeedCategory" DROP CONSTRAINT "SeedCategory_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "SeedProduct" DROP CONSTRAINT "SeedProduct_categoryId_fkey";

-- AlterTable
ALTER TABLE "SeedProduct" ADD COLUMN     "seedType" "SeedType";

-- DropTable
DROP TABLE "SeedCategory";

-- DropEnum
DROP TYPE "PhotoperiodType";

-- CreateTable
CREATE TABLE "SeedProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeedProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeedProductCategory_id_idx" ON "SeedProductCategory"("id");

-- AddForeignKey
ALTER TABLE "SeedProduct" ADD CONSTRAINT "SeedProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SeedProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
