/*
  Warnings:

  - You are about to drop the `ScraperConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SelectorTest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ScraperConfig" DROP CONSTRAINT "ScraperConfig_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "SelectorTest" DROP CONSTRAINT "SelectorTest_configId_fkey";

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "computedSelectors" JSONB,
ADD COLUMN     "maxPages" INTEGER DEFAULT 10,
ADD COLUMN     "paginationPattern" TEXT,
ADD COLUMN     "sampleJsonLd" TEXT,
ADD COLUMN     "sampleProductHtml" TEXT;

-- DropTable
DROP TABLE "ScraperConfig";

-- DropTable
DROP TABLE "SelectorTest";
