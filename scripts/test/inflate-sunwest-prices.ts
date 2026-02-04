/**
 * Inflate Sunwest Genetics Prices - Test Script
 * 
 * Purpose: Temporarily increase prices by 30% for testing price alert system
 * 
 * What it does:
 * 1. Find first 12 products from Sunwest Genetics (page 1)
 * 2. Increase all pricing variants by 30%
 * 3. Store original prices for rollback
 * 
 * After running this script:
 * - Trigger scraper via UI (test mode, 2 pages)
 * - Scraper will fetch real prices (30% lower than inflated DB prices)
 * - Price detection will trigger
 * - Email should be sent to users with wishlist items
 * 
 * Usage:
 *   pnpx dotenv-cli -e .env.local -- pnpm exec tsx scripts/test/inflate-sunwest-prices.ts
 * 
 * Rollback:
 *   pnpx dotenv-cli -e .env.local -- pnpm exec tsx scripts/test/rollback-sunwest-prices.ts
 */

import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import * as fs from 'fs';
import * as path from 'path';

const SUNWEST_SELLER_ID = 'cmjoskrq40000rksbn4hm8ixt';
const INFLATION_RATE = 1.30; // 30% increase
const PRODUCTS_TO_INFLATE = 12; // First page products

interface BackupPricing {
  id: string;
  seedProductId: string;
  productName: string;
  packSize: number;
  originalTotalPrice: number;
  originalPricePerSeed: number;
  inflatedTotalPrice: number;
  inflatedPricePerSeed: number;
}

async function main() {
  console.log('\n🔧 ===== INFLATE SUNWEST PRICES TEST SCRIPT =====\n');

  try {
    // Step 1: Find Sunwest Genetics products (first 12)
    console.log('📋 Step 1: Finding Sunwest Genetics products...');
    const products = await prisma.seedProduct.findMany({
      where: {
        sellerId: SUNWEST_SELLER_ID
      },
      include: {
        pricings: true,
        wishlists: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      },
      take: PRODUCTS_TO_INFLATE,
      orderBy: {
        createdAt: 'asc' // Get oldest first (likely page 1)
      }
    });

    if (products.length === 0) {
      throw new Error('No Sunwest Genetics products found');
    }

    console.log(`✅ Found ${products.length} products`);
    
    // Step 2: Show products in wishlist
    const productsInWishlist = products.filter(p => p.wishlists.length > 0);
    console.log(`\n📌 Products in user wishlists: ${productsInWishlist.length}`);
    productsInWishlist.forEach(product => {
      const users = product.wishlists.map((w: any) => w.user.email).join(', ');
      console.log(`   - ${product.name}`);
      console.log(`     Users: ${users}`);
    });

    // Step 3: Prepare pricing updates
    console.log('\n💰 Step 2: Preparing price inflation...');
    const backupData: BackupPricing[] = [];
    const updates: Array<Promise<any>> = [];

    let totalPricings = 0;
    for (const product of products) {
      console.log(`\n   Product: ${product.name}`);
      console.log(`   Pricings: ${product.pricings.length} variants`);
      
      for (const pricing of product.pricings) {
        totalPricings++;
        
        const originalTotalPrice = pricing.totalPrice;
        const originalPricePerSeed = pricing.pricePerSeed;
        const inflatedTotalPrice = Math.round(originalTotalPrice * INFLATION_RATE * 100) / 100;
        const inflatedPricePerSeed = Math.round((inflatedTotalPrice / pricing.packSize) * 100) / 100;

        console.log(`      ${pricing.packSize} seeds: $${originalTotalPrice} → $${inflatedTotalPrice} (+30%)`);

        // Store backup
        backupData.push({
          id: pricing.id,
          seedProductId: product.id,
          productName: product.name,
          packSize: pricing.packSize,
          originalTotalPrice,
          originalPricePerSeed,
          inflatedTotalPrice,
          inflatedPricePerSeed,
        });

        // Prepare update
        updates.push(
          prisma.pricing.update({
            where: { id: pricing.id },
            data: {
              totalPrice: inflatedTotalPrice,
              pricePerSeed: inflatedPricePerSeed,
            }
          })
        );
      }
    }

    // Step 4: Save backup file
    console.log('\n💾 Step 3: Saving backup...');
    const backupPath = path.join(process.cwd(), 'temp', 'sunwest-prices-backup.json');
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(
      backupPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        sellerId: SUNWEST_SELLER_ID,
        inflationRate: INFLATION_RATE,
        productsCount: products.length,
        pricingsCount: totalPricings,
        pricings: backupData,
      }, null, 2)
    );
    
    console.log(`✅ Backup saved: ${backupPath}`);

    // Step 5: Execute updates
    console.log('\n🚀 Step 4: Inflating prices...');
    await Promise.all(updates);
    
    console.log(`✅ Successfully inflated ${totalPricings} pricing records (+30%)`);

    // Step 6: Summary
    console.log('\n📊 ===== SUMMARY =====');
    console.log(`Products updated: ${products.length}`);
    console.log(`Pricing variants updated: ${totalPricings}`);
    console.log(`Products in wishlists: ${productsInWishlist.length}`);
    console.log(`Inflation rate: +30%`);
    console.log(`Backup file: ${backupPath}`);

    console.log('\n📋 ===== NEXT STEPS =====');
    console.log('1. Go to Goodseed Admin UI');
    console.log('2. Trigger scraper: Sunwest Genetics (Test mode, 2 pages)');
    console.log('3. Wait for scraper to complete (~2-3 minutes)');
    console.log('4. Check worker logs for price detection:');
    console.log('   docker logs goodseed-worker --follow | grep -E "Price|Email"');
    console.log('5. Check email inbox for price drop alerts');
    console.log('');
    console.log('To rollback prices:');
    console.log('   pnpx dotenv-cli -e .env.local -- pnpm exec tsx scripts/test/rollback-sunwest-prices.ts');
    console.log('');

  } catch (error) {
    apiLogger.logError('[Inflate Prices] Error:', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Price inflation completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Price inflation failed:', error);
    process.exit(1);
  });
