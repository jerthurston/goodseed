-- CreateTable: WishlistFolderItem (Many-to-Many Junction Table)
CREATE TABLE IF NOT EXISTS "WishlistFolderItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "wishlistFolderId" TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistFolderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WishlistFolderItem_wishlistId_idx" ON "WishlistFolderItem"("wishlistId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WishlistFolderItem_wishlistFolderId_idx" ON "WishlistFolderItem"("wishlistFolderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WishlistFolderItem_wishlistFolderId_order_idx" ON "WishlistFolderItem"("wishlistFolderId", "order");

-- CreateIndex: Unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS "WishlistFolderItem_wishlistId_wishlistFolderId_key" ON "WishlistFolderItem"("wishlistId", "wishlistFolderId");

-- AddForeignKey
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WishlistFolderItem_wishlistId_fkey'
  ) THEN
    ALTER TABLE "WishlistFolderItem" ADD CONSTRAINT "WishlistFolderItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WishlistFolderItem_wishlistFolderId_fkey'
  ) THEN
    ALTER TABLE "WishlistFolderItem" ADD CONSTRAINT "WishlistFolderItem_wishlistFolderId_fkey" FOREIGN KEY ("wishlistFolderId") REFERENCES "WishlistFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Update WishlistFolder relation name
ALTER TABLE "WishlistFolder" DROP CONSTRAINT IF EXISTS "WishlistFolder_wishlistFolderItems_fkey";

-- Remove old folderId column from Wishlist (if exists)
-- This is commented out for safety - uncomment if needed after data migration
-- ALTER TABLE "Wishlist" DROP COLUMN IF EXISTS "folderId";
