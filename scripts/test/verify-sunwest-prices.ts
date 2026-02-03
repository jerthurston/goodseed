/**
 * Verify Sunwest Prices - Check if inflation was successful
 * 
 * Usage:
 *   pnpx dotenv-cli -e .env.local -- pnpm exec tsx scripts/test/verify-sunwest-prices.ts
 */

import { prisma } from '@/lib/prisma';

const SUNWEST_SELLER_ID = 'cmjoskrq40000rksbn4hm8ixt';
const EXPECTED_INFLATED_PRICES = {
  '5 seeds': 109.85,
  '10 seeds': 202.8,
  '25 seeds': 405.6
};

async function main() {
  console.log('\n🔍 ===== VERIFY SUNWEST PRICES =====\n');

  try {
    // Get first 4 products (the ones in wishlist)
    const products = await prisma.seedProduct.findMany({
      where: {
        sellerId: SUNWEST_SELLER_ID
      },
      include: {
        pricings: {
          orderBy: {
            packSize: 'asc'
          }
        },
        wishlists: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      },
      take: 4,
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${products.length} products to verify:\n`);

    let allCorrect = true;

    for (const product of products) {
      console.log(`📦 ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   URL: ${product.url}`);
      
      if (product.wishlists.length > 0) {
        console.log(`   👥 In wishlist of:`);
        product.wishlists.forEach((w: any) => {
          console.log(`      - ${w.user.email} (${w.user.name || 'No name'})`);
        });
      } else {
        console.log(`   👥 Not in any wishlist`);
      }

      console.log(`   💰 Current prices:`);
      for (const pricing of product.pricings) {
        const expectedPrice = EXPECTED_INFLATED_PRICES[`${pricing.packSize} seeds` as keyof typeof EXPECTED_INFLATED_PRICES];
        const isCorrect = Math.abs(pricing.totalPrice - expectedPrice) < 0.01;
        
        const status = isCorrect ? '✅' : '❌';
        console.log(`      ${status} ${pricing.packSize} seeds: $${pricing.totalPrice} (expected: $${expectedPrice})`);
        
        if (!isCorrect) {
          allCorrect = false;
        }
      }
      console.log('');
    }

    if (allCorrect) {
      console.log('✅ ===== ALL PRICES INFLATED CORRECTLY =====\n');
      console.log('You can now trigger the scraper from the admin UI.\n');
    } else {
      console.log('❌ ===== PRICE MISMATCH DETECTED =====\n');
      console.log('Some prices do not match expected values.');
      console.log('You may need to run the inflation script again.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
