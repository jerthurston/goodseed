/*
  Warnings:

  - Added the required column `sellerId` to the `SeedProductCategory` table without a default value. This is not possible if the table is not empty.

*/

-- First, get the Seed Supreme seller ID (or create if not exists)
DO $$
DECLARE
    seed_supreme_id TEXT;
    royal_queen_id TEXT;
BEGIN
    -- Get Seed Supreme seller ID
    SELECT id INTO seed_supreme_id FROM "Seller" WHERE name = 'Seed Supreme' LIMIT 1;
    
    -- Get Royal Queen Seeds seller ID
    SELECT id INTO royal_queen_id FROM "Seller" WHERE name = 'Royal Queen Seeds' LIMIT 1;
    
    -- Add sellerId column with temporary nullable constraint
    ALTER TABLE "SeedProductCategory" ADD COLUMN "sellerId" TEXT;
    
    -- Update existing categories based on URL pattern
    UPDATE "SeedProductCategory" 
    SET "sellerId" = seed_supreme_id 
    WHERE url LIKE '%seedsupreme.com%';
    
    UPDATE "SeedProductCategory" 
    SET "sellerId" = royal_queen_id 
    WHERE url LIKE '%royalqueenseeds.com%';
    
    -- Make sellerId NOT NULL after setting values
    ALTER TABLE "SeedProductCategory" ALTER COLUMN "sellerId" SET NOT NULL;
END $$;

-- AddForeignKey
ALTER TABLE "SeedProductCategory" ADD CONSTRAINT "SeedProductCategory_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
