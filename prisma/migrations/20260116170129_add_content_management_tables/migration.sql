/*
  Warnings:

  - You are about to drop the column `email_verified` on the `User` table. All the data in the column will be lost.
  - The primary key for the `VerificationToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `VerificationToken` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `VerificationToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[identifier,token]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `identifier` to the `VerificationToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum (Idempotent - only add if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'BANNED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'BANNED';
  END IF;
END $$;

-- DropIndex (Idempotent - only drop if exists)
DROP INDEX IF EXISTS "VerificationToken_email_token_key";

-- AlterTable (Idempotent User table changes)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'email_verified') THEN
    ALTER TABLE "User" DROP COLUMN "email_verified";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'emailVerified') THEN
    ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);
  END IF;
  ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
END $$;

-- AlterTable (Idempotent VerificationToken changes)
DO $$ BEGIN
  -- Drop primary key constraint if exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'VerificationToken_pkey') THEN
    ALTER TABLE "VerificationToken" DROP CONSTRAINT "VerificationToken_pkey";
  END IF;
  
  -- Drop columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'VerificationToken' AND column_name = 'email') THEN
    ALTER TABLE "VerificationToken" DROP COLUMN "email";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'VerificationToken' AND column_name = 'id') THEN
    ALTER TABLE "VerificationToken" DROP COLUMN "id";
  END IF;
  
  -- Add identifier column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'VerificationToken' AND column_name = 'identifier') THEN
    ALTER TABLE "VerificationToken" ADD COLUMN "identifier" TEXT NOT NULL DEFAULT '';
    -- Remove default after adding
    ALTER TABLE "VerificationToken" ALTER COLUMN "identifier" DROP DEFAULT;
  END IF;
END $$;

-- CreateTable (Idempotent)
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable (Idempotent)
CREATE TABLE IF NOT EXISTS "MagicLinkRateLimit" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagicLinkRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable (Idempotent)
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiveSpecialOffers" BOOLEAN NOT NULL DEFAULT false,
    "receivePriceAlerts" BOOLEAN NOT NULL DEFAULT false,
    "receiveBackInStock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seedId" TEXT NOT NULL,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WishlistFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "homepage_content" (
    "id" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL,
    "heroDescription" TEXT NOT NULL,
    "howItWorksTitle" TEXT NOT NULL,
    "howItWorksDescription" TEXT NOT NULL,
    "howItWorksSteps" JSONB NOT NULL,
    "featuresTitle" TEXT NOT NULL,
    "featuresDescription" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "ctaTitle" TEXT NOT NULL,
    "ctaDescription" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "homepage_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "faq_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "faq_page_settings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Frequently Asked Questions',
    "description" TEXT NOT NULL DEFAULT 'Find answers to the most common questions about our services.',
    "noAnswerMessage" TEXT NOT NULL DEFAULT 'Can''t find the answer you''re looking for?',
    "contactLabel" TEXT NOT NULL DEFAULT 'Contact Us',
    "contactHref" TEXT NOT NULL DEFAULT '/contact',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "faq_page_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_email_token_key" ON "PasswordResetToken"("email", "token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MagicLinkRateLimit_email_cooldownUntil_idx" ON "MagicLinkRateLimit"("email", "cooldownUntil");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MagicLinkRateLimit_createdAt_idx" ON "MagicLinkRateLimit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MagicLinkRateLimit_email_key" ON "MagicLinkRateLimit"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_seedId_key" ON "Wishlist"("userId", "seedId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WishlistFolder_userId_name_key" ON "WishlistFolder"("userId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "faqs_categoryId_order_idx" ON "faqs"("categoryId", "order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey (Idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_userId_fkey') THEN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (Idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_userId_fkey') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (Idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_seedId_fkey') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_seedId_fkey" FOREIGN KEY ("seedId") REFERENCES "SeedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (Idempotent) - SKIP: folderId column removed in later migration
-- DO $$ BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_folderId_fkey') THEN
--     ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WishlistFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
--   END IF;
-- END $$;

-- AddForeignKey (Idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WishlistFolder_userId_fkey') THEN
    ALTER TABLE "WishlistFolder" ADD CONSTRAINT "WishlistFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (Idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faqs_categoryId_fkey') THEN
    ALTER TABLE "faqs" ADD CONSTRAINT "faqs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
