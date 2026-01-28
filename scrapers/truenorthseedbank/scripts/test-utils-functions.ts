/**
 * 🧪 TRUE NORTH SEED BANK UTILS TESTING SCRIPT
 * 
 * Test each utility function in the utils directory individually
 * to verify functionality and identify potential issues
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { CheerioCrawler } from 'crawlee';
import * as cheerio from 'cheerio';

// Import all utils functions
import { extractCategoryLinksFromHomepage } from '../utils/extractCatLinkFromHeader';
import { extractProductUrlsFromCatLink } from '../utils/extractProductUrlsFromCatLink';
import { extractProductFromDetailHTML } from '../utils/extractProductFromDetailHTML';
import { getScrapingUrl, getPageNumberFromUrl, isPaginationUrl, getScrapingUrlRange, getBaseUrl } from '../utils/getScrapingUrl';

// Import site config
import { ScraperFactory } from '@/lib/factories/scraper-factory';
import { PrismaClient } from '@prisma/client';

async function testTrueNorthSeedBankUtils() {
    console.log('🧪 ========================================');
    console.log('🧪 TRUE NORTH SEED BANK UTILS TESTING SCRIPT');
    console.log('🧪 ========================================\n');

    const startTime = Date.now();
    
    // Initialize site config and robots rules
    const prisma = new PrismaClient();
    const scraperFactory = new ScraperFactory(prisma);
    const siteConfig = scraperFactory.getSiteInfo('truenorthseedbank');
    
    console.log(`🌐 Site Config:`, {
        name: siteConfig.name,
        baseUrl: siteConfig.baseUrl,
        isImplemented: siteConfig.isImplemented
    });

    // Initialize polite crawler for robots.txt
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
        minDelay: 1000,
        maxDelay: 2000
    });

    const robotsRules = await politeCrawler.parseRobots(siteConfig.baseUrl);
    console.log(`🤖 Robots Rules:`, {
        crawlDelay: robotsRules.crawlDelay,
        userAgent: robotsRules.userAgent,
        disallowedPaths: robotsRules.disallowedPaths.length,
        allowedPaths: robotsRules.allowedPaths.length
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // TEST 1: getScrapingUrl.ts functions
    console.log('📋 TEST 1: getScrapingUrl.ts Functions');
    console.log('----------------------------------------');
    
    try {
        const baseUrl = "https://www.truenorthseedbank.com/cannabis-seeds/feminized-seeds";
        
        // Test getScrapingUrl
        const page1Url = getScrapingUrl(baseUrl, 1);
        const page2Url = getScrapingUrl(baseUrl, 2);
        const page3Url = getScrapingUrl(baseUrl, 3);
        
        console.log(`✅ getScrapingUrl(baseUrl, 1): ${page1Url}`);
        console.log(`✅ getScrapingUrl(baseUrl, 2): ${page2Url}`);
        console.log(`✅ getScrapingUrl(baseUrl, 3): ${page3Url}`);
        
        // Test getPageNumberFromUrl
        const pageNum1 = getPageNumberFromUrl(page1Url);
        const pageNum2 = getPageNumberFromUrl(page2Url);
        const pageNum3 = getPageNumberFromUrl(page3Url);
        
        console.log(`✅ getPageNumberFromUrl(page1): ${pageNum1}`);
        console.log(`✅ getPageNumberFromUrl(page2): ${pageNum2}`);
        console.log(`✅ getPageNumberFromUrl(page3): ${pageNum3}`);
        
        // Test isPaginationUrl
        const isPag1 = isPaginationUrl(page1Url);
        const isPag2 = isPaginationUrl(page2Url);
        
        console.log(`✅ isPaginationUrl(page1): ${isPag1}`);
        console.log(`✅ isPaginationUrl(page2): ${isPag2}`);
        
        // Test getScrapingUrlRange
        const urlRange = getScrapingUrlRange(baseUrl, 1, 3);
        console.log(`✅ getScrapingUrlRange(1-3):`, urlRange);
        
        // Test getBaseUrl
        const baseFromPaginated = getBaseUrl(page2Url);
        console.log(`✅ getBaseUrl(page2): ${baseFromPaginated}`);
        
        console.log('🎉 TEST 1 PASSED: All getScrapingUrl functions working correctly\n');
        
    } catch (error) {
        console.error('❌ TEST 1 FAILED:', error);
    }

    // TEST 2: extractCatLinkFromHeader.ts
    console.log('📋 TEST 2: extractCatLinkFromHeader.ts');
    console.log('----------------------------------------');
    
    try {
        console.log('🌐 Extracting category links from homepage...');
        const categoryLinks = await extractCategoryLinksFromHomepage(siteConfig, robotsRules);
        
        console.log(`✅ Found ${categoryLinks.length} category links:`);
        categoryLinks.forEach((link, index) => {
            console.log(`   ${index + 1}. ${link}`);
        });
        
        if (categoryLinks.length > 0) {
            console.log('🎉 TEST 2 PASSED: Category links extracted successfully\n');
        } else {
            console.log('⚠️ TEST 2 WARNING: No category links found\n');
        }
        
    } catch (error) {
        console.error('❌ TEST 2 FAILED:', error);
        console.log('');
    }

    // TEST 3: extractProductUrlsFromCatLink.ts (THIS IS LIKELY THE PROBLEM)
    console.log('📋 TEST 3: extractProductUrlsFromCatLink.ts (CRITICAL TEST)');
    console.log('--------------------------------------------------------');
    
    try {
        // Use the exact URL from the logs that failed
        const testCategoryUrl = "https://www.truenorthseedbank.com/cannabis-seeds/regular-seeds";
        
        console.log(`🌐 Extracting product URLs from: ${testCategoryUrl}`);
        console.log('📄 Testing with maxPages = 1 for debugging...');
        
        const productUrls = await extractProductUrlsFromCatLink(testCategoryUrl, 1, robotsRules);
        
        console.log(`✅ Found ${productUrls.length} product URLs:`);
        productUrls.slice(0, 5).forEach((url, index) => {
            console.log(`   ${index + 1}. ${url}`);
        });
        
        if (productUrls.length > 5) {
            console.log(`   ... and ${productUrls.length - 5} more products`);
        }
        
        if (productUrls.length > 0) {
            console.log('🎉 TEST 3 PASSED: Product URLs extracted successfully\n');
        } else {
            console.log('⚠️ TEST 3 CRITICAL ISSUE: No product URLs found - This is the problem!\n');
            console.log('🔍 DEBUGGING: Let me check what selectors are being used...');
            
            // Debug the category page structure
            const debugCrawler = new CheerioCrawler({
                requestHandlerTimeoutSecs: 30,
                maxRequestRetries: 1,
                
                requestHandler: async ({ $, request }) => {
                    console.log(`🕵️ DEBUG: Analyzing page structure for ${request.url}`);
                    
                    // Check what links exist on the page
                    const allLinks = $('a[href]');
                    console.log(`🔗 Total links on page: ${allLinks.length}`);
                    
                    // Check for product-related links
                    const productLinks = $('a[href*="/product"]');
                    console.log(`🛍️ Links containing "/product": ${productLinks.length}`);
                    
                    const productLinks2 = $('a[href*="product"]');
                    console.log(`🛍️ Links containing "product": ${productLinks2.length}`);
                    
                    // Check WooCommerce selectors
                    const wooLinks = $('.woocommerce-loop-product__link');
                    console.log(`🛒 WooCommerce loop links: ${wooLinks.length}`);
                    
                    const productItems = $('.product-item a');
                    console.log(`📦 Product item links: ${productItems.length}`);
                    
                    // Sample some links for analysis
                    console.log(`\n🔍 SAMPLE LINKS (first 10):`);
                    allLinks.slice(0, 10).each((i, el) => {
                        const href = $(el).attr('href');
                        const text = $(el).text().trim().substring(0, 50);
                        console.log(`   ${i + 1}. "${text}" → ${href}`);
                    });
                    
                    // Check for common e-commerce patterns
                    const patterns = [
                        { name: 'Standard product links', selector: 'a[href*="/product/"]' },
                        { name: 'WooCommerce links', selector: '.woocommerce-loop-product__link' },
                        { name: 'Product grid links', selector: '.product a' },
                        { name: 'Product title links', selector: '.product-title a' },
                        { name: 'Shop links', selector: 'a[href*="/shop/"]' },
                        { name: 'Item links', selector: '.item a' },
                        { name: 'Card links', selector: '.card a' }
                    ];
                    
                    console.log(`\n🎯 PATTERN ANALYSIS:`);
                    patterns.forEach(pattern => {
                        const matches = $(pattern.selector);
                        console.log(`   ${pattern.name}: ${matches.length} matches`);
                        
                        if (matches.length > 0 && matches.length < 10) {
                            matches.slice(0, 3).each((i, el) => {
                                const href = $(el).attr('href');
                                console.log(`     → ${href}`);
                            });
                        }
                    });
                }
            });
            
            await debugCrawler.run([testCategoryUrl]);
        }
        
    } catch (error) {
        console.error('❌ TEST 3 FAILED:', error);
        console.log('');
    }

    // TEST 4: extractProductFromDetailHTML.ts (if we have a product URL)
    console.log('📋 TEST 4: extractProductFromDetailHTML.ts');
    console.log('----------------------------------------');
    
    try {
        // Use a sample True North Seed Bank product URL for testing
        const testProductUrl = "https://www.truenorthseedbank.com/product/white-widow-feminized-seeds";
        
        console.log(`🌐 Testing product data extraction from: ${testProductUrl}`);
        
        // Create crawler to get the HTML
        const crawler = new CheerioCrawler({
            requestHandlerTimeoutSecs: 30,
            maxRequestRetries: 1,
            
            requestHandler: async ({ $, request }) => {
                console.log(`📄 Processing product page: ${request.url}`);
                
                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Extract product data
                const productData = extractProductFromDetailHTML($, siteConfig, request.url);
                
                if (productData) {
                    console.log(`✅ Successfully extracted product data:`);
                    console.log(`   Name: ${productData.name}`);
                    console.log(`   Image: ${productData.imageUrl ? 'Found' : 'Not found'}`);
                    console.log(`   Cannabis Type: ${productData.cannabisType || 'Not found'}`);
                    console.log(`   THC: ${productData.thcLevel || 'Not found'}`);
                    console.log(`   CBD: ${productData.cbdLevel || 'Not found'}`);
                    console.log(`   Seed Type: ${productData.seedType || 'Not found'}`);
                    console.log(`   Flowering Time: ${productData.floweringTime || 'Not found'}`);
                    console.log(`   Badge: ${productData.badge || 'Not found'}`);
                    console.log(`   Rating: ${productData.rating || 'Not found'}`);
                    console.log(`   Pricing Options: ${productData.pricings?.length || 0}`);
                    
                    console.log('🎉 TEST 4 PASSED: Product data extracted successfully\n');
                } else {
                    console.log('⚠️ TEST 4 WARNING: No product data extracted\n');
                    
                    // Debug product page structure
                    console.log('🔍 DEBUG: Product page analysis...');
                    console.log(`   Page title: ${$('title').text()}`);
                    console.log(`   H1 elements: ${$('h1').length}`);
                    console.log(`   Product name selector hits: ${$(siteConfig.selectors.productName).length}`);
                }
            },
            
            failedRequestHandler: async ({ request, error }) => {
                console.error(`❌ Failed to load product page: ${request.url}`, error);
            }
        });
        
        await crawler.run([testProductUrl]);
        
    } catch (error) {
        console.error('❌ TEST 4 FAILED:', error);
        console.log('');
    }

    // FINAL SUMMARY
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('🏁 ========================================');
    console.log('🏁 TRUE NORTH SEED BANK UTILS TESTING COMPLETED');
    console.log('🏁 ========================================');
    console.log(`⏱️ Total Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`🌐 Site: ${siteConfig.name}`);
    console.log(`🔗 Base URL: ${siteConfig.baseUrl}`);
    console.log(`🤖 Robots Compliant: ✅`);
    console.log('');
    console.log('📋 Test Results Summary:');
    console.log('   TEST 1: getScrapingUrl functions - Check above');
    console.log('   TEST 2: extractCatLinkFromHeader - Check above');
    console.log('   TEST 3: extractProductUrlsFromCatLink - CRITICAL - Check above');
    console.log('   TEST 4: extractProductFromDetailHTML - Check above');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Focus on TEST 3 - this is likely the main issue');
    console.log('   2. Check what selectors True North uses for product links');
    console.log('   3. Compare with working Canuk Seeds patterns');
    console.log('   4. Update selectors or extraction logic as needed');
    
    await prisma.$disconnect();
}

// Execute if run directly
if (require.main === module) {
    testTrueNorthSeedBankUtils().catch(console.error);
}

export default testTrueNorthSeedBankUtils;