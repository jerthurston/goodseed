/*
  Warnings:

  - The values [RUDERALIS] on the enum `CannabisType` will be removed. If these variants are still used in the database, this will fail.

*/

-- DISABLED: cannabisType column is commented out in schema.prisma
-- This migration is kept for history but not executed

-- -- STEP 1: Convert any existing RUDERALIS to HYBRID before removing from enum
-- UPDATE "SeedProductCategory" 
-- SET "cannabisType" = 'HYBRID' 
-- WHERE "cannabisType" = 'RUDERALIS';

-- -- STEP 2: AlterEnum - Remove RUDERALIS
-- BEGIN;
-- CREATE TYPE "CannabisType_new" AS ENUM ('SATIVA', 'INDICA', 'HYBRID');
-- ALTER TABLE "SeedProductCategory" ALTER COLUMN "cannabisType" TYPE "CannabisType_new" USING ("cannabisType"::text::"CannabisType_new");
-- ALTER TYPE "CannabisType" RENAME TO "CannabisType_old";
-- ALTER TYPE "CannabisType_new" RENAME TO "CannabisType";
-- DROP TYPE "CannabisType_old";
-- COMMIT;
