/*
  Warnings:

  - The values [PENDING,IN_PROGRESS] on the enum `ScrapeJobStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ScrapeJobStatus_new" AS ENUM ('CREATED', 'WAITING', 'DELAYED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "public"."ScrapeJob" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ScrapeJob" ALTER COLUMN "status" TYPE "ScrapeJobStatus_new" USING ("status"::text::"ScrapeJobStatus_new");
ALTER TYPE "ScrapeJobStatus" RENAME TO "ScrapeJobStatus_old";
ALTER TYPE "ScrapeJobStatus_new" RENAME TO "ScrapeJobStatus";
DROP TYPE "public"."ScrapeJobStatus_old";
ALTER TABLE "ScrapeJob" ALTER COLUMN "status" SET DEFAULT 'CREATED';
COMMIT;

-- AlterTable
ALTER TABLE "ScrapeJob" ALTER COLUMN "status" SET DEFAULT 'CREATED';
