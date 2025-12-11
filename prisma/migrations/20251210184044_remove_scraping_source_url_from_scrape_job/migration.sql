/*
  Warnings:

  - You are about to drop the column `scrapingSourceUrl` on the `ScrapeJob` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScrapeJob" DROP COLUMN "scrapingSourceUrl";
