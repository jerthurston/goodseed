/*
  Warnings:

  - A unique constraint covering the columns `[sellerId,scrapingSourceUrl]` on the table `ScrapingSource` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ScrapingSource_sellerId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ScrapingSource_sellerId_scrapingSourceUrl_key" ON "ScrapingSource"("sellerId", "scrapingSourceUrl");
