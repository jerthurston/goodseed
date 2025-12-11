/*
  Warnings:

  - The values [RUDERALIS] on the enum `CannabisType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `variety` on the `SeedProduct` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `SeedProductCategory` table. All the data in the column will be lost.
  - Added the required column `scrapingSourceUrl` to the `Seller` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScrapeJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "CannabisType_new" AS ENUM ('SATIVA', 'INDICA', 'HYBRID');
ALTER TABLE "SeedProduct" ALTER COLUMN "cannabisType" TYPE "CannabisType_new" USING ("cannabisType"::text::"CannabisType_new");
ALTER TYPE "CannabisType" RENAME TO "CannabisType_old";
ALTER TYPE "CannabisType_new" RENAME TO "CannabisType";
DROP TYPE "public"."CannabisType_old";
COMMIT;

-- AlterTable
ALTER TABLE "SeedProduct" DROP COLUMN "variety";

-- AlterTable
ALTER TABLE "SeedProductCategory" DROP COLUMN "url";

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "scrapingSourceUrl" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "ScrapeJobStatus" NOT NULL DEFAULT 'PENDING',
    "mode" TEXT NOT NULL,
    "scrapingSourceUrl" TEXT NOT NULL,
    "targetCategoryId" TEXT,
    "startPage" INTEGER,
    "endPage" INTEGER,
    "maxPages" INTEGER,
    "currentPage" INTEGER,
    "totalPages" INTEGER,
    "productsScraped" INTEGER NOT NULL DEFAULT 0,
    "productsSaved" INTEGER NOT NULL DEFAULT 0,
    "productsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapeJob_jobId_key" ON "ScrapeJob"("jobId");

-- CreateIndex
CREATE INDEX "ScrapeJob_sellerId_idx" ON "ScrapeJob"("sellerId");

-- CreateIndex
CREATE INDEX "ScrapeJob_status_idx" ON "ScrapeJob"("status");

-- CreateIndex
CREATE INDEX "ScrapeJob_jobId_idx" ON "ScrapeJob"("jobId");

-- CreateIndex
CREATE INDEX "ScrapeJob_createdAt_idx" ON "ScrapeJob"("createdAt");

-- CreateIndex
CREATE INDEX "ScrapeJob_targetCategoryId_idx" ON "ScrapeJob"("targetCategoryId");

-- CreateIndex
CREATE INDEX "SeedProduct_seedType_idx" ON "SeedProduct"("seedType");

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_targetCategoryId_fkey" FOREIGN KEY ("targetCategoryId") REFERENCES "SeedProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
