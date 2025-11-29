/*
  Warnings:

  - You are about to drop the column `dispensaryId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Effect` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Favor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HelpWith` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StrainEffect` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StrainFavor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StrainHelpWith` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StrainTerpene` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Terpene` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DispensaryPhotos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrderToPromotion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StrainImages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `brands` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cannabis_strains` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispensaries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispensary_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispensary_menus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispensary_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispensary_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promotions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `strain_reviews` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SeedType" AS ENUM ('REGULAR', 'FEMINIZED', 'AUTOFLOWER');

-- CreateEnum
CREATE TYPE "CannabisType" AS ENUM ('SATIVA', 'INDICA', 'HYBRID');

-- CreateEnum
CREATE TYPE "PhotoperiodType" AS ENUM ('AUTOFLOWER', 'PHOTOPERIOD');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'LIMITED');

-- DropForeignKey
ALTER TABLE "StrainEffect" DROP CONSTRAINT "StrainEffect_cannabisStrainId_fkey";

-- DropForeignKey
ALTER TABLE "StrainEffect" DROP CONSTRAINT "StrainEffect_effectId_fkey";

-- DropForeignKey
ALTER TABLE "StrainFavor" DROP CONSTRAINT "StrainFavor_cannabisStrainId_fkey";

-- DropForeignKey
ALTER TABLE "StrainFavor" DROP CONSTRAINT "StrainFavor_favorId_fkey";

-- DropForeignKey
ALTER TABLE "StrainHelpWith" DROP CONSTRAINT "StrainHelpWith_cannabisStrainId_fkey";

-- DropForeignKey
ALTER TABLE "StrainHelpWith" DROP CONSTRAINT "StrainHelpWith_helpWithId_fkey";

-- DropForeignKey
ALTER TABLE "StrainTerpene" DROP CONSTRAINT "StrainTerpene_cannabisStrainId_fkey";

-- DropForeignKey
ALTER TABLE "StrainTerpene" DROP CONSTRAINT "StrainTerpene_terpeneId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "_DispensaryPhotos" DROP CONSTRAINT "_DispensaryPhotos_A_fkey";

-- DropForeignKey
ALTER TABLE "_DispensaryPhotos" DROP CONSTRAINT "_DispensaryPhotos_B_fkey";

-- DropForeignKey
ALTER TABLE "_OrderToPromotion" DROP CONSTRAINT "_OrderToPromotion_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrderToPromotion" DROP CONSTRAINT "_OrderToPromotion_B_fkey";

-- DropForeignKey
ALTER TABLE "_StrainImages" DROP CONSTRAINT "_StrainImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_StrainImages" DROP CONSTRAINT "_StrainImages_B_fkey";

-- DropForeignKey
ALTER TABLE "brands" DROP CONSTRAINT "brands_logoId_fkey";

-- DropForeignKey
ALTER TABLE "dispensaries" DROP CONSTRAINT "dispensaries_bannerId_fkey";

-- DropForeignKey
ALTER TABLE "dispensaries" DROP CONSTRAINT "dispensaries_logoId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_analytics" DROP CONSTRAINT "dispensary_analytics_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_menus" DROP CONSTRAINT "dispensary_menus_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_products" DROP CONSTRAINT "dispensary_products_brandId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_products" DROP CONSTRAINT "dispensary_products_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_products" DROP CONSTRAINT "dispensary_products_menuId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_products" DROP CONSTRAINT "dispensary_products_strainId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_reviews" DROP CONSTRAINT "dispensary_reviews_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "dispensary_reviews" DROP CONSTRAINT "dispensary_reviews_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_imageId_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_productId_fkey";

-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_dispensaryId_fkey";

-- DropForeignKey
ALTER TABLE "strain_reviews" DROP CONSTRAINT "strain_reviews_strainId_fkey";

-- DropForeignKey
ALTER TABLE "strain_reviews" DROP CONSTRAINT "strain_reviews_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dispensaryId";

-- DropTable
DROP TABLE "Effect";

-- DropTable
DROP TABLE "Favor";

-- DropTable
DROP TABLE "HelpWith";

-- DropTable
DROP TABLE "StrainEffect";

-- DropTable
DROP TABLE "StrainFavor";

-- DropTable
DROP TABLE "StrainHelpWith";

-- DropTable
DROP TABLE "StrainTerpene";

-- DropTable
DROP TABLE "Terpene";

-- DropTable
DROP TABLE "_DispensaryPhotos";

-- DropTable
DROP TABLE "_OrderToPromotion";

-- DropTable
DROP TABLE "_StrainImages";

-- DropTable
DROP TABLE "brands";

-- DropTable
DROP TABLE "cannabis_strains";

-- DropTable
DROP TABLE "dispensaries";

-- DropTable
DROP TABLE "dispensary_analytics";

-- DropTable
DROP TABLE "dispensary_menus";

-- DropTable
DROP TABLE "dispensary_products";

-- DropTable
DROP TABLE "dispensary_reviews";

-- DropTable
DROP TABLE "images";

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "product_images";

-- DropTable
DROP TABLE "promotions";

-- DropTable
DROP TABLE "strain_reviews";

-- DropEnum
DROP TYPE "DispensaryLicenseType";

-- DropEnum
DROP TYPE "DispensaryStatus";

-- DropEnum
DROP TYPE "EffectType";

-- DropEnum
DROP TYPE "MenuCategory";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "OrderType";

-- DropEnum
DROP TYPE "ProductType";

-- DropEnum
DROP TYPE "PromotionType";

-- DropEnum
DROP TYPE "ReviewStatus";

-- DropEnum
DROP TYPE "StrainType";

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "affiliateTag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScraped" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "packSize" INTEGER NOT NULL,
    "pricePerSeed" DOUBLE PRECISION NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "seedType" "SeedType",
    "cannabisType" "CannabisType",
    "photoperiodType" "PhotoperiodType",
    "thcMin" DOUBLE PRECISION,
    "thcMax" DOUBLE PRECISION,
    "cbdMin" DOUBLE PRECISION,
    "cbdMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "productId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("productId","imageId")
);

-- CreateTable
CREATE TABLE "ScrapeLog" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "duration" INTEGER,

    CONSTRAINT "ScrapeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_name_key" ON "Seller"("name");

-- CreateIndex
CREATE INDEX "Seller_isActive_idx" ON "Seller"("isActive");

-- CreateIndex
CREATE INDEX "Seller_lastScraped_idx" ON "Seller"("lastScraped");

-- CreateIndex
CREATE UNIQUE INDEX "Product_url_key" ON "Product"("url");

-- CreateIndex
CREATE INDEX "Product_pricePerSeed_idx" ON "Product"("pricePerSeed");

-- CreateIndex
CREATE INDEX "Product_seedType_idx" ON "Product"("seedType");

-- CreateIndex
CREATE INDEX "Product_cannabisType_idx" ON "Product"("cannabisType");

-- CreateIndex
CREATE INDEX "Product_thcMin_thcMax_idx" ON "Product"("thcMin", "thcMax");

-- CreateIndex
CREATE INDEX "Product_cbdMin_cbdMax_idx" ON "Product"("cbdMin", "cbdMax");

-- CreateIndex
CREATE INDEX "Product_stockStatus_idx" ON "Product"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sellerId_slug_key" ON "Product"("sellerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Image_url_key" ON "Image"("url");

-- CreateIndex
CREATE INDEX "Image_url_idx" ON "Image"("url");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_imageId_idx" ON "ProductImage"("imageId");

-- CreateIndex
CREATE INDEX "ProductImage_isPrimary_idx" ON "ProductImage"("isPrimary");

-- CreateIndex
CREATE INDEX "ScrapeLog_sellerId_idx" ON "ScrapeLog"("sellerId");

-- CreateIndex
CREATE INDEX "ScrapeLog_timestamp_idx" ON "ScrapeLog"("timestamp");

-- CreateIndex
CREATE INDEX "ScrapeLog_status_idx" ON "ScrapeLog"("status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeLog" ADD CONSTRAINT "ScrapeLog_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
