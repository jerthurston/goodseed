-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "DispensaryLicenseType" AS ENUM ('RETAIL_CANNABIS', 'MICRO_CULTIVATION', 'MEDICAL');

-- CreateEnum
CREATE TYPE "DispensaryStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MenuCategory" AS ENUM ('FLOWER', 'EDIBLES', 'VAPES', 'CONCENTRATES', 'TOPICALS', 'BEVERAGES', 'ACCESSORIES');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('FLOWER', 'PRE_ROLL', 'EDIBLE', 'BEVERAGE', 'VAPE', 'CONCENTRATE', 'TOPICAL', 'SEED', 'TINCTURE', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "EffectType" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "StrainType" AS ENUM ('INDICA', 'SATIVA', 'HYBRID');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'PENDING', 'HIDDEN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('BOGO', 'PERCENT_OFF', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "acquisitionDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "acquisitionSource" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "lifetimeValue" DOUBLE PRECISION DEFAULT 0,
    "totalSpent" DOUBLE PRECISION DEFAULT 0,
    "chatSettings" JSONB,
    "lastChatAt" TIMESTAMP(3),
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "totalChatSessions" INTEGER NOT NULL DEFAULT 0,
    "dispensaryId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorConfirmation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TwoFactorConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoId" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensaries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoId" TEXT,
    "bannerId" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "licenseType" "DispensaryLicenseType" NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "DispensaryStatus" NOT NULL DEFAULT 'ACTIVE',
    "rating" DOUBLE PRECISION DEFAULT 0,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'AB',
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'America/Edmonton',
    "hours" JSONB,
    "offersDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadiusKm" DOUBLE PRECISION DEFAULT 30,
    "deliveryFee" DOUBLE PRECISION DEFAULT 0,
    "minDeliveryOrder" DOUBLE PRECISION DEFAULT 0,
    "freeDeliveryOver" DOUBLE PRECISION,
    "offersPickup" BOOLEAN NOT NULL DEFAULT true,
    "pickupInstructions" TEXT,
    "ageVerifiedAt" TIMESTAMP(3),
    "lastComplianceCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complianceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensary_menus" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MenuCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensary_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensary_products" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "menuId" TEXT,
    "strainId" TEXT,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT,
    "type" "ProductType" NOT NULL,
    "thc" DOUBLE PRECISION,
    "cbd" TEXT,
    "weight" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDeal" BOOLEAN NOT NULL DEFAULT false,
    "labTested" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "effects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flavors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terpenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "labResults" JSONB,
    "lastRestockAt" TIMESTAMP(3),
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensary_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cannabis_strains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "thcRange" TEXT,
    "cbdRange" TEXT,
    "description" TEXT,
    "flavors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terpenes" JSONB,
    "genetics" TEXT,
    "growingInfo" JSONB,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "type" "StrainType" NOT NULL,
    "thc" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_strains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrainFavor" (
    "id" TEXT NOT NULL,
    "favorId" TEXT NOT NULL,
    "cannabisStrainId" TEXT NOT NULL,

    CONSTRAINT "StrainFavor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terpene" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Terpene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrainTerpene" (
    "id" TEXT NOT NULL,
    "terpeneId" TEXT NOT NULL,
    "cannabisStrainId" TEXT NOT NULL,

    CONSTRAINT "StrainTerpene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrainHelpWith" (
    "id" TEXT NOT NULL,
    "cannabisStrainId" TEXT NOT NULL,
    "helpWithId" TEXT NOT NULL,
    "isVotedFromUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrainHelpWith_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpWith" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpWith_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrainEffect" (
    "id" TEXT NOT NULL,
    "cannabisStrainId" TEXT NOT NULL,
    "effectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrainEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Effect" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "effectType" "EffectType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensary_reviews" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensary_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strain_reviews" (
    "id" TEXT NOT NULL,
    "strainId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strain_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "dispensaryId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "type" "OrderType" NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "deliveryAddress" JSONB,
    "deliveryNotes" TEXT,
    "estimatedTime" TIMESTAMP(3),
    "pickupTime" TIMESTAMP(3),
    "ageVerified" BOOLEAN NOT NULL DEFAULT false,
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "idImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "thc" TEXT,
    "cbd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "code" TEXT,
    "minPurchase" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensary_analytics" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensary_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DispensaryPhotos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DispensaryPhotos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductImages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductImages_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StrainImages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StrainImages_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OrderToPromotion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrderToPromotion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_email_token_key" ON "VerificationToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorConfirmation_userId_key" ON "TwoFactorConfirmation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorToken_token_key" ON "TwoFactorToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorToken_email_token_key" ON "TwoFactorToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_slug_idx" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "dispensaries_slug_key" ON "dispensaries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "dispensaries_licenseNumber_key" ON "dispensaries"("licenseNumber");

-- CreateIndex
CREATE INDEX "dispensaries_slug_idx" ON "dispensaries"("slug");

-- CreateIndex
CREATE INDEX "dispensaries_city_idx" ON "dispensaries"("city");

-- CreateIndex
CREATE INDEX "dispensaries_licenseNumber_idx" ON "dispensaries"("licenseNumber");

-- CreateIndex
CREATE INDEX "dispensaries_isVerified_idx" ON "dispensaries"("isVerified");

-- CreateIndex
CREATE INDEX "dispensaries_status_idx" ON "dispensaries"("status");

-- CreateIndex
CREATE INDEX "dispensaries_latitude_longitude_idx" ON "dispensaries"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "dispensary_menus_dispensaryId_idx" ON "dispensary_menus"("dispensaryId");

-- CreateIndex
CREATE INDEX "dispensary_menus_isActive_idx" ON "dispensary_menus"("isActive");

-- CreateIndex
CREATE INDEX "dispensary_menus_category_idx" ON "dispensary_menus"("category");

-- CreateIndex
CREATE INDEX "dispensary_products_dispensaryId_idx" ON "dispensary_products"("dispensaryId");

-- CreateIndex
CREATE INDEX "dispensary_products_type_idx" ON "dispensary_products"("type");

-- CreateIndex
CREATE INDEX "dispensary_products_isAvailable_idx" ON "dispensary_products"("isAvailable");

-- CreateIndex
CREATE INDEX "dispensary_products_isDeal_idx" ON "dispensary_products"("isDeal");

-- CreateIndex
CREATE INDEX "dispensary_products_price_idx" ON "dispensary_products"("price");

-- CreateIndex
CREATE UNIQUE INDEX "dispensary_products_dispensaryId_slug_key" ON "dispensary_products"("dispensaryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "cannabis_strains_slug_key" ON "cannabis_strains"("slug");

-- CreateIndex
CREATE INDEX "cannabis_strains_slug_idx" ON "cannabis_strains"("slug");

-- CreateIndex
CREATE INDEX "cannabis_strains_type_idx" ON "cannabis_strains"("type");

-- CreateIndex
CREATE INDEX "StrainFavor_cannabisStrainId_idx" ON "StrainFavor"("cannabisStrainId");

-- CreateIndex
CREATE INDEX "StrainFavor_favorId_idx" ON "StrainFavor"("favorId");

-- CreateIndex
CREATE UNIQUE INDEX "StrainFavor_favorId_cannabisStrainId_key" ON "StrainFavor"("favorId", "cannabisStrainId");

-- CreateIndex
CREATE UNIQUE INDEX "Favor_name_key" ON "Favor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Favor_slug_key" ON "Favor"("slug");

-- CreateIndex
CREATE INDEX "Favor_id_slug_idx" ON "Favor"("id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Favor_name_slug_key" ON "Favor"("name", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Terpene_name_key" ON "Terpene"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Terpene_slug_key" ON "Terpene"("slug");

-- CreateIndex
CREATE INDEX "StrainTerpene_cannabisStrainId_idx" ON "StrainTerpene"("cannabisStrainId");

-- CreateIndex
CREATE INDEX "StrainTerpene_terpeneId_idx" ON "StrainTerpene"("terpeneId");

-- CreateIndex
CREATE UNIQUE INDEX "StrainTerpene_terpeneId_cannabisStrainId_key" ON "StrainTerpene"("terpeneId", "cannabisStrainId");

-- CreateIndex
CREATE INDEX "StrainHelpWith_cannabisStrainId_idx" ON "StrainHelpWith"("cannabisStrainId");

-- CreateIndex
CREATE INDEX "StrainHelpWith_helpWithId_idx" ON "StrainHelpWith"("helpWithId");

-- CreateIndex
CREATE UNIQUE INDEX "StrainHelpWith_cannabisStrainId_helpWithId_key" ON "StrainHelpWith"("cannabisStrainId", "helpWithId");

-- CreateIndex
CREATE UNIQUE INDEX "HelpWith_name_key" ON "HelpWith"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HelpWith_slug_key" ON "HelpWith"("slug");

-- CreateIndex
CREATE INDEX "HelpWith_slug_idx" ON "HelpWith"("slug");

-- CreateIndex
CREATE INDEX "HelpWith_name_idx" ON "HelpWith"("name");

-- CreateIndex
CREATE INDEX "StrainEffect_cannabisStrainId_idx" ON "StrainEffect"("cannabisStrainId");

-- CreateIndex
CREATE INDEX "StrainEffect_effectId_idx" ON "StrainEffect"("effectId");

-- CreateIndex
CREATE UNIQUE INDEX "StrainEffect_cannabisStrainId_effectId_key" ON "StrainEffect"("cannabisStrainId", "effectId");

-- CreateIndex
CREATE UNIQUE INDEX "Effect_name_key" ON "Effect"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Effect_slug_key" ON "Effect"("slug");

-- CreateIndex
CREATE INDEX "Effect_slug_idx" ON "Effect"("slug");

-- CreateIndex
CREATE INDEX "Effect_name_idx" ON "Effect"("name");

-- CreateIndex
CREATE INDEX "dispensary_reviews_dispensaryId_idx" ON "dispensary_reviews"("dispensaryId");

-- CreateIndex
CREATE INDEX "dispensary_reviews_rating_idx" ON "dispensary_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "dispensary_reviews_dispensaryId_userId_key" ON "dispensary_reviews"("dispensaryId", "userId");

-- CreateIndex
CREATE INDEX "strain_reviews_strainId_idx" ON "strain_reviews"("strainId");

-- CreateIndex
CREATE INDEX "strain_reviews_rating_idx" ON "strain_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "strain_reviews_strainId_userId_key" ON "strain_reviews"("strainId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_dispensaryId_idx" ON "orders"("dispensaryId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_dispensaryId_idx" ON "promotions"("dispensaryId");

-- CreateIndex
CREATE INDEX "promotions_code_idx" ON "promotions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dispensary_analytics_dispensaryId_key" ON "dispensary_analytics"("dispensaryId");

-- CreateIndex
CREATE INDEX "dispensary_analytics_dispensaryId_idx" ON "dispensary_analytics"("dispensaryId");

-- CreateIndex
CREATE INDEX "_DispensaryPhotos_B_index" ON "_DispensaryPhotos"("B");

-- CreateIndex
CREATE INDEX "_ProductImages_B_index" ON "_ProductImages"("B");

-- CreateIndex
CREATE INDEX "_StrainImages_B_index" ON "_StrainImages"("B");

-- CreateIndex
CREATE INDEX "_OrderToPromotion_B_index" ON "_OrderToPromotion"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorConfirmation" ADD CONSTRAINT "TwoFactorConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensaries" ADD CONSTRAINT "dispensaries_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensaries" ADD CONSTRAINT "dispensaries_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_menus" ADD CONSTRAINT "dispensary_menus_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_products" ADD CONSTRAINT "dispensary_products_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "dispensary_menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_products" ADD CONSTRAINT "dispensary_products_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_products" ADD CONSTRAINT "dispensary_products_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "cannabis_strains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_products" ADD CONSTRAINT "dispensary_products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainFavor" ADD CONSTRAINT "StrainFavor_favorId_fkey" FOREIGN KEY ("favorId") REFERENCES "Favor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainFavor" ADD CONSTRAINT "StrainFavor_cannabisStrainId_fkey" FOREIGN KEY ("cannabisStrainId") REFERENCES "cannabis_strains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainTerpene" ADD CONSTRAINT "StrainTerpene_terpeneId_fkey" FOREIGN KEY ("terpeneId") REFERENCES "Terpene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainTerpene" ADD CONSTRAINT "StrainTerpene_cannabisStrainId_fkey" FOREIGN KEY ("cannabisStrainId") REFERENCES "cannabis_strains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainHelpWith" ADD CONSTRAINT "StrainHelpWith_cannabisStrainId_fkey" FOREIGN KEY ("cannabisStrainId") REFERENCES "cannabis_strains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainHelpWith" ADD CONSTRAINT "StrainHelpWith_helpWithId_fkey" FOREIGN KEY ("helpWithId") REFERENCES "HelpWith"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainEffect" ADD CONSTRAINT "StrainEffect_cannabisStrainId_fkey" FOREIGN KEY ("cannabisStrainId") REFERENCES "cannabis_strains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainEffect" ADD CONSTRAINT "StrainEffect_effectId_fkey" FOREIGN KEY ("effectId") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_reviews" ADD CONSTRAINT "dispensary_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_reviews" ADD CONSTRAINT "dispensary_reviews_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strain_reviews" ADD CONSTRAINT "strain_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strain_reviews" ADD CONSTRAINT "strain_reviews_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "cannabis_strains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dispensary_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_analytics" ADD CONSTRAINT "dispensary_analytics_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DispensaryPhotos" ADD CONSTRAINT "_DispensaryPhotos_A_fkey" FOREIGN KEY ("A") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DispensaryPhotos" ADD CONSTRAINT "_DispensaryPhotos_B_fkey" FOREIGN KEY ("B") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductImages" ADD CONSTRAINT "_ProductImages_A_fkey" FOREIGN KEY ("A") REFERENCES "dispensary_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductImages" ADD CONSTRAINT "_ProductImages_B_fkey" FOREIGN KEY ("B") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StrainImages" ADD CONSTRAINT "_StrainImages_A_fkey" FOREIGN KEY ("A") REFERENCES "cannabis_strains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StrainImages" ADD CONSTRAINT "_StrainImages_B_fkey" FOREIGN KEY ("B") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToPromotion" ADD CONSTRAINT "_OrderToPromotion_A_fkey" FOREIGN KEY ("A") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToPromotion" ADD CONSTRAINT "_OrderToPromotion_B_fkey" FOREIGN KEY ("B") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
