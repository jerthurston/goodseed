/*
  Warnings:

  - You are about to drop the column `computedSelectors` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `jsonLd` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `maxPages` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `paginationPattern` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `productCardHtml` on the `Seller` table. All the data in the column will be lost.
  - The `scrapingSourceUrl` column on the `Seller` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "computedSelectors",
DROP COLUMN "jsonLd",
DROP COLUMN "maxPages",
DROP COLUMN "paginationPattern",
DROP COLUMN "productCardHtml",
DROP COLUMN "scrapingSourceUrl",
ADD COLUMN     "scrapingSourceUrl" TEXT[];
