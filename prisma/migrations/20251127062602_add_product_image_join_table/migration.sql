/*
  Warnings:

  - You are about to drop the `_ProductImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProductImages" DROP CONSTRAINT "_ProductImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProductImages" DROP CONSTRAINT "_ProductImages_B_fkey";

-- DropTable
DROP TABLE "_ProductImages";

-- CreateTable
CREATE TABLE "product_images" (
    "productId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("productId","imageId")
);

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "product_images_isPrimary_idx" ON "product_images"("isPrimary");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dispensary_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
