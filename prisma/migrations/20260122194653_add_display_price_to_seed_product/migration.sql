-- AlterTable
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'SeedProduct' AND column_name = 'displayPrice'
  ) THEN
    ALTER TABLE "SeedProduct" ADD COLUMN "displayPrice" DOUBLE PRECISION;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SeedProduct_displayPrice_idx" ON "SeedProduct"("displayPrice");
