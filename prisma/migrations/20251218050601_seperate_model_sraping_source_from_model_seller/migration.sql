/*
  Warnings:

  - You are about to drop the column `scrapingSourceUrl` on the `Seller` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "scrapingSourceUrl";

-- CreateTable
CREATE TABLE "ScrapingSource" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "scrapingSourceUrl" TEXT NOT NULL,
    "scrapingSourceName" TEXT NOT NULL,
    "maxPage" INTEGER NOT NULL,

    CONSTRAINT "ScrapingSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapingSource_sellerId_key" ON "ScrapingSource"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapingSource_scrapingSourceUrl_key" ON "ScrapingSource"("scrapingSourceUrl");

-- CreateIndex
CREATE INDEX "ScrapingSource_id_sellerId_idx" ON "ScrapingSource"("id", "sellerId");

-- AddForeignKey
ALTER TABLE "ScrapingSource" ADD CONSTRAINT "ScrapingSource_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
