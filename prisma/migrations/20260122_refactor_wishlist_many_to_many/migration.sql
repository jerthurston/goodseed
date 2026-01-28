-- CreateTable: WishlistFolderItem (Many-to-Many Junction Table)
CREATE TABLE "WishlistFolderItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "wishlistFolderId" TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistFolderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WishlistFolderItem_wishlistId_idx" ON "WishlistFolderItem"("wishlistId");

-- CreateIndex
CREATE INDEX "WishlistFolderItem_wishlistFolderId_idx" ON "WishlistFolderItem"("wishlistFolderId");

-- CreateIndex
CREATE INDEX "WishlistFolderItem_wishlistFolderId_order_idx" ON "WishlistFolderItem"("wishlistFolderId", "order");

-- CreateIndex: Unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX "WishlistFolderItem_wishlistId_wishlistFolderId_key" ON "WishlistFolderItem"("wishlistId", "wishlistFolderId");

-- AddForeignKey
ALTER TABLE "WishlistFolderItem" ADD CONSTRAINT "WishlistFolderItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistFolderItem" ADD CONSTRAINT "WishlistFolderItem_wishlistFolderId_fkey" FOREIGN KEY ("wishlistFolderId") REFERENCES "WishlistFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update WishlistFolder relation name
ALTER TABLE "WishlistFolder" DROP CONSTRAINT IF EXISTS "WishlistFolder_wishlistFolderItems_fkey";

-- Remove old folderId column from Wishlist (if exists)
-- This is commented out for safety - uncomment if needed after data migration
-- ALTER TABLE "Wishlist" DROP COLUMN IF EXISTS "folderId";
