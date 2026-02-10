/**
 * Check ScrapingSource records for failed sellers
 * Run: pnpm tsx scripts/check-scraping-sources.ts
 */

import { prisma } from '@/lib/prisma';

async function main() {
  console.log('🔍 Checking ScrapingSource records for failed sellers...\n');

  const failedSellers = ['Beaver Seed', 'Cropking Seeds', 'Mary Janes Garden'];
  const cancelledSellers = ['Truenorth Seed Bank', 'Rocket Seeds', 'MJ Seeds Canada', 'Canuk Seeds'];
  const successfulSellers = ['BC Bud Depot', 'Sonoma Seeds', 'Vancouver Seed Bank', 'Sunwest Genetics'];

  // Check FAILED sellers
  console.log('❌ FAILED SELLERS:');
  console.log('='.repeat(80));
  for (const sellerName of failedSellers) {
    const seller = await prisma.seller.findFirst({
      where: { name: { contains: sellerName, mode: 'insensitive' } },
      include: {
        scrapingSources: true,
        _count: {
          select: { scrapingSources: true }
        }
      }
    });

    if (!seller) {
      console.log(`⚠️  "${sellerName}" - NOT FOUND IN DATABASE`);
      continue;
    }

    console.log(`\n📦 ${seller.name}`);
    console.log(`   ID: ${seller.id}`);
    console.log(`   Active: ${seller.isActive}`);
    console.log(`   Auto-scrape interval: ${seller.autoScrapeInterval}h`);
    console.log(`   ScrapingSources count: ${seller._count.scrapingSources}`);
    
    if (seller.scrapingSources.length === 0) {
      console.log(`   🚨 NO SCRAPING SOURCES! - This is the problem!`);
    } else {
      console.log(`   ScrapingSources:`);
      seller.scrapingSources.forEach((source, idx) => {
        console.log(`      ${idx + 1}. URL: ${source.scrapingSourceUrl}`);
        console.log(`         Name: ${source.scrapingSourceName}`);
        console.log(`         Max Pages: ${source.maxPage}`);
      });
    }
  }

  // Check CANCELLED sellers
  console.log('\n\n⚠️  CANCELLED SELLERS:');
  console.log('='.repeat(80));
  for (const sellerName of cancelledSellers) {
    const seller = await prisma.seller.findFirst({
      where: { name: { contains: sellerName, mode: 'insensitive' } },
      include: {
        scrapingSources: true,
        _count: {
          select: { scrapingSources: true }
        }
      }
    });

    if (!seller) {
      console.log(`⚠️  "${sellerName}" - NOT FOUND IN DATABASE`);
      continue;
    }

    console.log(`\n📦 ${seller.name}`);
    console.log(`   ID: ${seller.id}`);
    console.log(`   Active: ${seller.isActive}`);
    console.log(`   Auto-scrape interval: ${seller.autoScrapeInterval}h`);
    console.log(`   ScrapingSources count: ${seller._count.scrapingSources}`);
    
    if (seller.scrapingSources.length === 0) {
      console.log(`   🚨 NO SCRAPING SOURCES!`);
    } else {
      console.log(`   ✅ Has ${seller.scrapingSources.length} scraping source(s)`);
    }
  }

  // Check SUCCESSFUL sellers (for comparison)
  console.log('\n\n✅ SUCCESSFUL SELLERS (for comparison):');
  console.log('='.repeat(80));
  for (const sellerName of successfulSellers) {
    const seller = await prisma.seller.findFirst({
      where: { name: { contains: sellerName, mode: 'insensitive' } },
      include: {
        _count: {
          select: { scrapingSources: true }
        }
      }
    });

    if (!seller) {
      console.log(`⚠️  "${sellerName}" - NOT FOUND IN DATABASE`);
      continue;
    }

    console.log(`\n📦 ${seller.name}`);
    console.log(`   ScrapingSources count: ${seller._count.scrapingSources}`);
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log('If FAILED sellers have 0 scrapingSources → That\'s the root cause!');
  console.log('Expected: Each seller should have at least 1 ScrapingSource record.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
