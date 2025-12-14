/*
  Warnings:

  - You are about to drop the column `sampleJsonLd` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `sampleProductHtml` on the `Seller` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "sampleJsonLd",
DROP COLUMN "sampleProductHtml",
ADD COLUMN     "jsonLd" TEXT,
ADD COLUMN     "productCardHtml" TEXT;
