/**
 * Check all seeds statistics in database
 * 
 * Shows comprehensive statistics across all sellers and seeds
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('\n' + '═'.repeat(100));
    console.log('🌱 GOODSEED DATABASE STATISTICS');
    console.log('═'.repeat(100));

    // Get all sellers
    const sellers = await prisma.seller.findMany({
        include: {
            _count: {
                select: {
                    seeds: true,
                    scrapeLogs: true
                }
            }
        }
    });

    console.log('\n📊 SELLERS:');
    console.log('─'.repeat(100));
    sellers.forEach(seller => {
        console.log(`\n${seller.name}`);
        console.log(`  ID: ${seller.id}`);
        console.log(`  URL: ${seller.url}`);
        console.log(`  Active: ${seller.isActive ? '✓' : '✗'}`);
        console.log(`  Seeds: ${seller._count.seeds}`);
        console.log(`  Scrape Logs: ${seller._count.scrapeLogs}`);
        console.log(`  Last Scraped: ${seller.lastScraped ? new Date(seller.lastScraped).toLocaleString() : 'Never'}`);
        console.log(`  Status: ${seller.status || 'N/A'}`);
    });

    // Get all seeds with statistics
    const seeds = await prisma.seed.findMany({
        include: {
            seller: true,
            seedImages: {
                include: {
                    image: true
                }
            }
        },
        orderBy: {
            pricePerSeed: 'asc'
        }
    });

    console.log('\n\n📦 SEEDS OVERVIEW:');
    console.log('─'.repeat(100));
    console.log(`Total Seeds: ${seeds.length}`);

    // Group by seller
    const bySeller = seeds.reduce((acc, seed) => {
        const sellerName = seed.seller.name;
        if (!acc[sellerName]) {
            acc[sellerName] = [];
        }
        acc[sellerName].push(seed);
        return acc;
    }, {} as Record<string, typeof seeds>);

    Object.entries(bySeller).forEach(([sellerName, sellerSeeds]) => {
        console.log(`\n  ${sellerName}: ${sellerSeeds.length} seeds`);
    });

    // Statistics by seed type
    console.log('\n\n🌿 BY SEED TYPE:');
    console.log('─'.repeat(100));
    const bySeedType = seeds.reduce((acc, seed) => {
        const type = seed.seedType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(bySeedType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            const percentage = ((count / seeds.length) * 100).toFixed(1);
            console.log(`  ${type.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
        });

    // Statistics by cannabis type
    console.log('\n\n🍃 BY CANNABIS TYPE:');
    console.log('─'.repeat(100));
    const byCannabisType = seeds.reduce((acc, seed) => {
        const type = seed.cannabisType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(byCannabisType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            const percentage = ((count / seeds.length) * 100).toFixed(1);
            console.log(`  ${type.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
        });

    // Price statistics
    console.log('\n\n💰 PRICE STATISTICS (per seed):');
    console.log('─'.repeat(100));
    const prices = seeds.map(s => s.pricePerSeed);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

    console.log(`  Minimum:    $${minPrice.toFixed(2)}`);
    console.log(`  Maximum:    $${maxPrice.toFixed(2)}`);
    console.log(`  Average:    $${avgPrice.toFixed(2)}`);
    console.log(`  Median:     $${medianPrice.toFixed(2)}`);

    // Price ranges
    const priceRanges = [
        { label: '$0-$5', min: 0, max: 5 },
        { label: '$5-$10', min: 5, max: 10 },
        { label: '$10-$15', min: 10, max: 15 },
        { label: '$15+', min: 15, max: Infinity },
    ];

    console.log('\n  Price Distribution:');
    priceRanges.forEach(range => {
        const count = seeds.filter(s => s.pricePerSeed >= range.min && s.pricePerSeed < range.max).length;
        const percentage = ((count / seeds.length) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(count / seeds.length * 50));
        console.log(`    ${range.label.padEnd(10)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
    });

    // THC statistics
    console.log('\n\n🔥 THC CONTENT:');
    console.log('─'.repeat(100));
    const seedsWithThc = seeds.filter(s => s.thcMin !== null && s.thcMax !== null);
    if (seedsWithThc.length > 0) {
        const avgThcMin = seedsWithThc.reduce((sum, s) => sum + (s.thcMin || 0), 0) / seedsWithThc.length;
        const avgThcMax = seedsWithThc.reduce((sum, s) => sum + (s.thcMax || 0), 0) / seedsWithThc.length;

        console.log(`  Seeds with THC data: ${seedsWithThc.length}/${seeds.length} (${((seedsWithThc.length / seeds.length) * 100).toFixed(1)}%)`);
        console.log(`  Average Range: ${avgThcMin.toFixed(1)}% - ${avgThcMax.toFixed(1)}%`);

        // THC categories
        const thcCategories = [
            { label: 'Low (0-10%)', filter: (s: typeof seeds[0]) => (s.thcMax || 0) <= 10 },
            { label: 'Medium (10-15%)', filter: (s: typeof seeds[0]) => (s.thcMin || 0) > 10 && (s.thcMax || 0) <= 15 },
            { label: 'High (15-20%)', filter: (s: typeof seeds[0]) => (s.thcMin || 0) > 15 && (s.thcMax || 0) <= 20 },
            { label: 'Very High (20%+)', filter: (s: typeof seeds[0]) => (s.thcMin || 0) > 20 },
        ];

        console.log('\n  THC Distribution:');
        thcCategories.forEach(cat => {
            const count = seedsWithThc.filter(cat.filter).length;
            const percentage = ((count / seedsWithThc.length) * 100).toFixed(1);
            console.log(`    ${cat.label.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
        });
    } else {
        console.log('  No THC data available');
    }

    // Pack size statistics
    console.log('\n\n📦 PACK SIZES:');
    console.log('─'.repeat(100));
    const byPackSize = seeds.reduce((acc, seed) => {
        const size = seed.packSize;
        acc[size] = (acc[size] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    Object.entries(byPackSize)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([size, count]) => {
            const percentage = ((count / seeds.length) * 100).toFixed(1);
            console.log(`  ${size.padStart(3)}x seeds: ${count.toString().padStart(4)} (${percentage}%)`);
        });

    // Top 10 cheapest seeds per seed
    console.log('\n\n💎 TOP 10 BEST VALUE (Lowest Price per Seed):');
    console.log('─'.repeat(100));
    seeds
        .sort((a, b) => a.pricePerSeed - b.pricePerSeed)
        .slice(0, 10)
        .forEach((seed, i) => {
            console.log(`  ${(i + 1).toString().padStart(2)}. ${seed.name.substring(0, 50).padEnd(50)} $${seed.pricePerSeed.toFixed(2)}/seed (${seed.packSize}x pack)`);
        });

    // Recent scrape logs
    console.log('\n\n📜 RECENT SCRAPE LOGS:');
    console.log('─'.repeat(100));
    const logs = await prisma.scrapeLog.findMany({
        include: {
            seller: true
        },
        orderBy: {
            timestamp: 'desc'
        },
        take: 10
    });

    logs.forEach(log => {
        console.log(`\n  ${new Date(log.timestamp).toLocaleString()}`);
        console.log(`    Seller: ${log.seller.name}`);
        console.log(`    Status: ${log.status}`);
        console.log(`    Products Found: ${log.productsFound}`);
        console.log(`    Duration: ${((log.duration || 0) / 1000).toFixed(2)}s`);
        if (log.errors) {
            console.log(`    Errors: ${JSON.stringify(log.errors)}`);
        }
    });

    console.log('\n' + '═'.repeat(100));
    console.log('✅ Statistics Complete\n');

    await prisma.$disconnect();
}

main().catch(console.error);
