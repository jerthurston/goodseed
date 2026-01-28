-- Remove old folderId column from Wishlist table
-- This column is no longer needed after migrating to many-to-many relationship
ALTER TABLE "Wishlist" DROP COLUMN IF EXISTS "folderId";
