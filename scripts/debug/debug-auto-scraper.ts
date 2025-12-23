#!/usr/bin/env tsx

/**
 * Debug Auto Scraper Start All Issue
 * Usage: npx tsx scripts/debug/debug-auto-scraper.ts
 */

import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

async function debugAutoScraper() {
  try {
    console.log('🔍 Debugging Auto Scraper Configuration...\n');

    // 1. Check all sellers
    console.log('1️⃣ Checking all sellers...');
    const allSellers = await prisma.seller.findMany({
      include: {
        scrapingSources: true,
      }
    });

    console.log(`Total sellers: ${allSellers.length}\n`);

    // 2. Check active sellers
    console.log('2️⃣ Active sellers analysis:');
    const activeSellers = allSellers.filter(s => s.isActive);
    console.log(`Active sellers: ${activeSellers.length}/${allSellers.length}`);

    for (const seller of activeSellers) {
      console.log(`  - ${seller.name}:`);
      console.log(`    ID: ${seller.id}`);
      console.log(`    isActive: ${seller.isActive}`);
      console.log(`    autoScrapeInterval: ${seller.autoScrapeInterval}`);
      console.log(`    scrapingSources: ${seller.scrapingSources.length}`);
      console.log(`    scrapingSourceUrls: ${seller.scrapingSources.map(s => s.scrapingSourceUrl).join(', ')}`);
      console.log('');
    }

    // 3. Check eligible sellers (same logic as initializeAllAutoJobs)
    console.log('3️⃣ Eligible sellers for auto scraping:');
    const eligibleSellers = activeSellers
      .filter(seller => seller.scrapingSources.length > 0)
      .map(seller => ({
        ...seller,
        autoScrapeInterval: seller.autoScrapeInterval || 24
      }));

    console.log(`Eligible sellers: ${eligibleSellers.length}/${activeSellers.length}`);

    for (const seller of eligibleSellers) {
      console.log(`  ✅ ${seller.name}:`);
      console.log(`    autoScrapeInterval: ${seller.autoScrapeInterval}`);
      console.log(`    scrapingSources count: ${seller.scrapingSources.length}`);
    }

    // 4. Check current job counts
    console.log('\n4️⃣ Current job statistics:');
    const jobCounts = await Promise.all([
      prisma.scrapeJob.count({ where: { status: 'CREATED' } }),
      prisma.scrapeJob.count({ where: { status: 'WAITING' } }),
      prisma.scrapeJob.count({ where: { status: 'DELAYED' } }),
      prisma.scrapeJob.count({ where: { status: 'ACTIVE' } }),
      prisma.scrapeJob.count({ where: { status: 'COMPLETED' } }),
      prisma.scrapeJob.count({ where: { status: 'FAILED' } }),
      prisma.scrapeJob.count({ where: { status: 'CANCELLED' } }),
    ]);

    console.log(`  CREATED: ${jobCounts[0]}`);
    console.log(`  WAITING: ${jobCounts[1]}`);
    console.log(`  DELAYED: ${jobCounts[2]}`);
    console.log(`  ACTIVE: ${jobCounts[3]}`);
    console.log(`  COMPLETED: ${jobCounts[4]}`);
    console.log(`  FAILED: ${jobCounts[5]}`);
    console.log(`  CANCELLED: ${jobCounts[6]}`);

    // 5. Check recent auto mode jobs
    console.log('\n5️⃣ Recent auto mode jobs (last 10):');
    const recentAutoJobs = await prisma.scrapeJob.findMany({
      where: { mode: 'auto' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        jobId: true,
        sellerId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: { name: true }
        }
      }
    });

    if (recentAutoJobs.length === 0) {
      console.log('  No auto mode jobs found');
    } else {
      for (const job of recentAutoJobs) {
        console.log(`  - ${job.seller.name}: ${job.status} (${job.createdAt.toISOString()})`);
      }
    }

    // 6. Summary
    console.log('\n📋 Summary:');
    console.log(`  Total sellers: ${allSellers.length}`);
    console.log(`  Active sellers: ${activeSellers.length}`);
    console.log(`  Eligible for auto scraping: ${eligibleSellers.length}`);
    console.log(`  Current WAITING jobs: ${jobCounts[1]}`);
    console.log(`  Current CANCELLED jobs: ${jobCounts[6]}`);

    if (eligibleSellers.length === 0) {
      console.log('\n❌ Issue: No sellers are eligible for auto scraping!');
      console.log('   Reasons:');
      console.log('   - No active sellers, OR');
      console.log('   - Active sellers have no scraping sources');
    } else {
      console.log('\n✅ Auto scraper should work with these eligible sellers');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  debugAutoScraper();
}

export { debugAutoScraper };