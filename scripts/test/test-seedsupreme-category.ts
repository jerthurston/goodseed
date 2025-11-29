/**
 * Test Seed Supreme Category Scraper (Crawlee Version)
 * 
 * Usage:
 *   pnpm tsx scripts/test/test-seedsupreme-category-crawlee.ts feminized-seeds 1
 */

import { SeedSupremeCategoryScraper } from '@/scrapers/seedsupreme/category-scraper';

async function main() {
    const category = process.argv[2] || 'feminized-seeds';
    const maxPages = parseInt(process.argv[3] || '1');

    console.log('='.repeat(60));
    console.log('Seed Supreme Category Scraper Test (Crawlee)');
    console.log('='.repeat(60));
    console.log(`Category: ${category}`);
    console.log(`Max Pages: ${maxPages}`);
    console.log('');

    const scraper = new SeedSupremeCategoryScraper();
    const result = await scraper.scrapeCategory(category, maxPages);

    console.log('\n' + '='.repeat(60));
    console.log('=== Results ===');
    console.log('='.repeat(60));
    console.log(`Total Products: ${result.totalProducts}`);
    console.log(`Pages Scraped: ${result.totalPages}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);

    // Price distribution
    const priceRanges = {
        'Under $50': 0,
        '$50-$100': 0,
        'Over $100': 0,
        'N/A': 0,
    };

    result.products.forEach((p) => {
        if (!p.basePriceNum) {
            priceRanges['N/A']++;
        } else if (p.basePriceNum < 50) {
            priceRanges['Under $50']++;
        } else if (p.basePriceNum < 100) {
            priceRanges['$50-$100']++;
        } else {
            priceRanges['Over $100']++;
        }
    });

    console.log('\n=== Price Distribution ===');
    Object.entries(priceRanges).forEach(([range, count]) => {
        if (count > 0) {
            console.log(`${range}: ${count}`);
        }
    });

    // Variety distribution
    const varieties = new Map<string, number>();
    result.products.forEach((p) => {
        if (p.variety) {
            varieties.set(p.variety, (varieties.get(p.variety) || 0) + 1);
        }
    });

    if (varieties.size > 0) {
        console.log('\n=== Varieties ===');
        Array.from(varieties.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([variety, count]) => {
                console.log(`${variety}: ${count}`);
            });
    }

    // THC levels distribution
    const thcLevels = new Map<string, number>();
    result.products.forEach((p) => {
        if (p.thcLevel) {
            thcLevels.set(p.thcLevel, (thcLevels.get(p.thcLevel) || 0) + 1);
        }
    });

    if (thcLevels.size > 0) {
        console.log('\n=== THC Levels ===');
        Array.from(thcLevels.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([level, count]) => {
                console.log(`${level}: ${count}`);
            });
    }

    // Badges summary
    const badgesCount = result.products.filter((p) => p.badges && p.badges.length > 0).length;
    if (badgesCount > 0) {
        console.log(`\n=== Badges ===`);
        console.log(`Products with badges: ${badgesCount}`);

        const allBadges = new Map<string, number>();
        result.products.forEach((p) => {
            p.badges?.forEach((badge) => {
                allBadges.set(badge, (allBadges.get(badge) || 0) + 1);
            });
        });

        Array.from(allBadges.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([badge, count]) => {
                console.log(`  ${badge}: ${count}`);
            });
    }

    // Sample products
    console.log('\n=== Sample Products (first 5) ===');
    result.products.slice(0, 5).forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.name}`);
        if (p.variety) console.log(`   Variety: ${p.variety}`);
        if (p.thcLevel) console.log(`   THC: ${p.thcLevel}`);
        if (p.basePrice) console.log(`   Price: ${p.basePrice}`);
        if (p.badges && p.badges.length > 0) {
            console.log(`   Badges: ${p.badges.join(', ')}`);
        }
    });

    console.log('\n✅ Test Complete!');
    console.log(`\n💾 Crawlee storage: ./storage/datasets/default/`);
}

main().catch(console.error);
