/**
 * Universal Product List Scrapers Test
 * 
 * Script để test và so sánh performance của tất cả scrapers
 * 
 * Usage:
 *   pnpm tsx scripts/test/test-all-scrapers.ts [maxPages]
 * 
 * Example:
 *   pnpm tsx scripts/test/test-all-scrapers.ts 3
 */

import 'dotenv/config';
import { ProductListScraper as VancouverScraper } from '@/scrapers/vancouverseedbank/core/vancouver-product-list-scraper';
import { ProductListScraper as SunWestScraper } from '@/scrapers/sunwestgenetics/core/sunwestgenetics-scrape-product-list';
import { CATEGORY_URLS as SunWestUrls } from '@/scrapers/sunwestgenetics/core/selectors';
import { CategoryResultFromCrawling } from '@/types/crawl.type';

interface ScraperConfig {
    name: string;
    scraper: any;
    testUrl: string;
    description: string;
}

const scrapers: ScraperConfig[] = [
    {
        name: 'Vancouver Seed Bank',
        scraper: VancouverScraper,
        testUrl: 'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/',
        description: 'Canadian premium cannabis seed retailer'
    },
    {
        name: 'SunWest Genetics',
        scraper: SunWestScraper,
        testUrl: SunWestUrls.allProducts,
        description: 'US-based cannabis genetics company'
    }
];

interface TestResults {
    scraperName: string;
    success: boolean;
    duration: number;
    totalProducts: number;
    totalPages: number;
    dataQuality: {
        images: number;
        ratings: number;
        reviews: number;
        thcLevels: number;
        cbdLevels: number;
        strainTypes: number;
        badges: number;
        floweringTime: number;
        pricingData: number;
    };
    errorMessage?: string;
}

async function testScraper(config: ScraperConfig, maxPages: number): Promise<TestResults> {
    const startTime = Date.now();
    
    try {
        console.log(`🧪 Testing ${config.name}...`);
        console.log(`   URL: ${config.testUrl}`);
        console.log(`   Description: ${config.description}`);
        console.log('');

        const scraper = new config.scraper();
        const result: CategoryResultFromCrawling = await scraper.scrapeProductList(config.testUrl, maxPages);
        
        const duration = Date.now() - startTime;

        // Calculate data quality metrics
        const withImages = result.products.filter(p => p.imageUrl).length;
        const withRating = result.products.filter(p => p.rating).length;
        const withReviews = result.products.filter(p => p.reviewCount && p.reviewCount > 0).length;
        const withTHC = result.products.filter(p => p.thcMin !== undefined && p.thcMax !== undefined).length;
        const withCBD = result.products.filter(p => p.cbdMin !== undefined && p.cbdMax !== undefined).length;
        const withStrain = result.products.filter(p => p.cannabisType).length;
        const withBadge = result.products.filter(p => p.badge).length;
        const withFlowering = result.products.filter(p => p.floweringTime).length;
        const withPricing = result.products.filter(p => p.pricings && p.pricings.length > 0).length;

        return {
            scraperName: config.name,
            success: true,
            duration,
            totalProducts: result.totalProducts,
            totalPages: result.totalPages,
            dataQuality: {
                images: Math.round((withImages / result.totalProducts) * 100),
                ratings: Math.round((withRating / result.totalProducts) * 100),
                reviews: Math.round((withReviews / result.totalProducts) * 100),
                thcLevels: Math.round((withTHC / result.totalProducts) * 100),
                cbdLevels: Math.round((withCBD / result.totalProducts) * 100),
                strainTypes: Math.round((withStrain / result.totalProducts) * 100),
                badges: Math.round((withBadge / result.totalProducts) * 100),
                floweringTime: Math.round((withFlowering / result.totalProducts) * 100),
                pricingData: Math.round((withPricing / result.totalProducts) * 100),
            }
        };

    } catch (error) {
        return {
            scraperName: config.name,
            success: false,
            duration: Date.now() - startTime,
            totalProducts: 0,
            totalPages: 0,
            dataQuality: {
                images: 0, ratings: 0, reviews: 0, thcLevels: 0,
                cbdLevels: 0, strainTypes: 0, badges: 0, floweringTime: 0, pricingData: 0
            },
            errorMessage: error instanceof Error ? error.message : String(error)
        };
    }
}

function displayResults(results: TestResults[], maxPages: number) {
    console.log('\n' + '='.repeat(100));
    console.log('🏆 SCRAPER COMPARISON RESULTS');
    console.log('='.repeat(100));
    console.log(`Test Configuration: ${maxPages} page${maxPages > 1 ? 's' : ''} per scraper\n`);

    // Performance comparison
    console.log('⚡ PERFORMANCE:');
    console.log('-'.repeat(80));
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length > 0) {
        successfulResults
            .sort((a, b) => a.duration - b.duration)
            .forEach((result, index) => {
                const durationSec = (result.duration / 1000).toFixed(2);
                const avgPerPage = (result.duration / result.totalPages / 1000).toFixed(2);
                const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                
                console.log(`${badge} ${result.scraperName.padEnd(20)} | ${durationSec}s total | ${avgPerPage}s/page | ${result.totalProducts} products`);
            });
    }

    // Data quality comparison  
    console.log('\n📊 DATA QUALITY COMPARISON:');
    console.log('-'.repeat(80));
    console.log('Field'.padEnd(15) + ' | ' + results.map(r => r.scraperName.slice(0, 12).padEnd(12)).join(' | '));
    console.log('-'.repeat(15) + '-+-' + results.map(() => '-'.repeat(12)).join('-+-'));

    const fields = [
        'images', 'ratings', 'reviews', 'thcLevels', 'cbdLevels', 
        'strainTypes', 'badges', 'floweringTime', 'pricingData'
    ] as const;

    const fieldLabels: Record<string, string> = {
        images: 'Images',
        ratings: 'Ratings', 
        reviews: 'Reviews',
        thcLevels: 'THC Levels',
        cbdLevels: 'CBD Levels',
        strainTypes: 'Strain Types',
        badges: 'Badges',
        floweringTime: 'Flowering',
        pricingData: 'Pricing'
    };

    fields.forEach(field => {
        const fieldLabel = fieldLabels[field].padEnd(15);
        const percentages = results.map(r => {
            if (!r.success) return '   ❌   ';
            const pct = r.dataQuality[field];
            return `   ${pct}%   `.slice(0, 12);
        });
        console.log(fieldLabel + '| ' + percentages.join(' | '));
    });

    // Error summary
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
        console.log('\n❌ FAILED SCRAPERS:');
        console.log('-'.repeat(80));
        failedResults.forEach(result => {
            console.log(`${result.scraperName}: ${result.errorMessage}`);
        });
    }

    console.log('\n' + '='.repeat(100));
    console.log('✨ Comparison completed!');
    console.log('='.repeat(100));
}

async function main() {
    const maxPages = parseInt(process.argv[2] || '1');

    console.log('🌱 Universal Scrapers Performance Test');
    console.log('='.repeat(70));
    console.log(`Testing ${scrapers.length} scrapers with max ${maxPages} page${maxPages > 1 ? 's' : ''} each`);
    console.log('='.repeat(70));
    console.log('');

    const results: TestResults[] = [];

    // Test each scraper sequentially to avoid overwhelming servers
    for (const config of scrapers) {
        try {
            const result = await testScraper(config, maxPages);
            results.push(result);
            
            if (result.success) {
                console.log(`✅ ${config.name}: ${result.totalProducts} products in ${(result.duration / 1000).toFixed(2)}s`);
            } else {
                console.log(`❌ ${config.name}: Failed - ${result.errorMessage}`);
            }
            console.log('');
            
            // Small delay between scrapers to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`💥 Critical error testing ${config.name}:`, error);
            results.push({
                scraperName: config.name,
                success: false,
                duration: 0,
                totalProducts: 0,
                totalPages: 0,
                dataQuality: {
                    images: 0, ratings: 0, reviews: 0, thcLevels: 0,
                    cbdLevels: 0, strainTypes: 0, badges: 0, floweringTime: 0, pricingData: 0
                },
                errorMessage: error instanceof Error ? error.message : String(error)
            });
        }
    }

    displayResults(results, maxPages);
}

main().catch(console.error);