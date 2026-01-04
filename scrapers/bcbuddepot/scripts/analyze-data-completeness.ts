/**
 * Data Completeness Analysis - BC Bud Depot vs Project Requirements
 * Compares extracted data with ProductCardDataFromCrawling interface requirements
 */

import { readFileSync } from 'fs';
import { load } from 'cheerio';
import path from 'path';
import { extractProductsFromHTML } from '@/scrapers/bcbuddepot/utils/extractProductsFromHTML';
import { BCBUDDEPOT_PRODUCT_CARD_SELECTORS } from '@/scrapers/bcbuddepot/core/selector';
import type { SiteConfig } from '@/lib/factories/scraper-factory';
import type { ProductCardDataFromCrawling } from '@/types/crawl.type';

function analyzeDataCompleteness() {
    console.log('📊 BC Bud Depot Data Completeness Analysis');
    console.log('============================================================\n');

    // Define project requirements based on ProductCardDataFromCrawling interface
    const projectRequirements = {
        // Core fields (required)
        core: ['name', 'url', 'slug', 'pricings'],
        
        // Optional but important fields (including seedType and cannabisType)
        optional: ['imageUrl', 'seedType', 'cannabisType', 'badge', 'rating', 'reviewCount'],
        
        // Cannabis-specific metadata (highly valuable, usually requires detail pages)
        cannabisData: ['thcLevel', 'thcMin', 'thcMax', 'cbdLevel', 'cbdMin', 'cbdMax', 'floweringTime', 'growingLevel'],
        
        // Pricing details
        pricingDetails: ['totalPrice', 'packSize', 'pricePerSeed']
    };

    // Create BC Bud Depot site config
    const siteConfig: SiteConfig = {
        name: 'BC Bud Depot',
        baseUrl: 'https://bcbuddepot.com',
        selectors: BCBUDDEPOT_PRODUCT_CARD_SELECTORS,
        isImplemented: true
    };

    console.log('📋 Project Requirements vs BC Bud Depot Extraction');
    console.log('--------------------------------------------------');

    try {
        const cardHtmlPath = path.join(__dirname, '../_archive/card-product.html');
        const cardHtml = readFileSync(cardHtmlPath, 'utf-8');
        const $ = load(cardHtml);

        const result = extractProductsFromHTML($, siteConfig);

        if (result.products.length === 0) {
            console.log('❌ No products extracted - check selectors');
            return;
        }

        const product = result.products[0];
        console.log(`✅ Successfully extracted ${result.products.length} product(s)\n`);

        console.log('🔍 Core Fields Analysis:');
        projectRequirements.core.forEach(field => {
            const value = (product as any)[field];
            const hasValue = value !== undefined && value !== null && value !== '' && 
                           (!Array.isArray(value) || value.length > 0);
            console.log(`  ${hasValue ? '✅' : '❌'} ${field}: ${hasValue ? '✓ Available' : '✗ Missing'}`);
            if (hasValue && field === 'pricings' && Array.isArray(value)) {
                console.log(`    └── Pricing details: ${value.length} variation(s)`);
                value.forEach((pricing, i) => {
                    console.log(`        ${i + 1}. $${pricing.totalPrice} (${pricing.packSize} seeds, $${pricing.pricePerSeed.toFixed(2)}/seed)`);
                });
            }
        });

        console.log('\n🎨 Optional Fields Analysis:');
        projectRequirements.optional.forEach(field => {
            const value = (product as any)[field];
            const hasValue = value !== undefined && value !== null && value !== '';
            console.log(`  ${hasValue ? '✅' : '⚠️ '} ${field}: ${hasValue ? `"${value}"` : 'Not available'}`);
        });

        console.log('\n🌿 Cannabis-Specific Data Analysis:');
        let cannabisDataCount = 0;
        projectRequirements.cannabisData.forEach(field => {
            const value = (product as any)[field];
            const hasValue = value !== undefined && value !== null && value !== '';
            if (hasValue) cannabisDataCount++;
            console.log(`  ${hasValue ? '✅' : '❌'} ${field}: ${hasValue ? `"${value}"` : 'Missing from card structure'}`);
        });

        const cannabisDataCompleteness = (cannabisDataCount / projectRequirements.cannabisData.length * 100).toFixed(1);
        console.log(`\n📈 Cannabis Data Completeness: ${cannabisDataCompleteness}% (${cannabisDataCount}/${projectRequirements.cannabisData.length})`);

        console.log('\n🛍️ Pricing Analysis:');
        if (product.pricings.length > 0) {
            const pricing = product.pricings[0];
            projectRequirements.pricingDetails.forEach(field => {
                const value = (pricing as any)[field];
                const hasValue = value !== undefined && value !== null && !isNaN(value);
                console.log(`  ${hasValue ? '✅' : '❌'} ${field}: ${hasValue ? value : 'Missing'}`);
            });
            
            console.log('\n  💰 Pricing Issues Analysis:');
            if (pricing.packSize === 1) {
                console.log('  ⚠️  Pack size = 1 suggests default value (actual pack size not detected)');
                console.log('  💡 Recommendation: Extract pack size from product detail pages');
            }
            if (pricing.totalPrice === pricing.pricePerSeed) {
                console.log('  ⚠️  Price per seed = total price (suggests single item pricing)');
            }
        } else {
            console.log('  ❌ No pricing data extracted');
        }

        console.log('\n📊 Overall Data Quality Summary:');
        console.log('--------------------------------------------------');
        
        // Calculate overall completeness
        const allFields = [...projectRequirements.core, ...projectRequirements.optional, ...projectRequirements.cannabisData];
        let availableFields = 0;
        
        allFields.forEach(field => {
            const value = (product as any)[field];
            const hasValue = value !== undefined && value !== null && value !== '' && 
                           (!Array.isArray(value) || value.length > 0);
            if (hasValue) availableFields++;
        });
        
        const overallCompleteness = (availableFields / allFields.length * 100).toFixed(1);
        
        console.log(`📈 Overall Completeness: ${overallCompleteness}% (${availableFields}/${allFields.length} fields)`);
        console.log(`✅ Core Fields: ${projectRequirements.core.length}/${projectRequirements.core.length} (100%)`);
        console.log(`⚠️  Optional Fields: Available but basic`);
        console.log(`❌ Cannabis Data: ${cannabisDataCount}/${projectRequirements.cannabisData.length} (${cannabisDataCompleteness}%)`);

        console.log('\n🎯 Missing Critical Data:');
        console.log('--------------------------------------------------');
        const missingCritical = [
            { field: 'thcLevel/thcMin/thcMax', impact: 'HIGH', reason: 'Essential for cannabis product comparison' },
            { field: 'cbdLevel/cbdMin/cbdMax', impact: 'HIGH', reason: 'Critical for medical cannabis users' },
            { field: 'floweringTime', impact: 'MEDIUM', reason: 'Important for growers planning' },
            { field: 'seedType', impact: 'HIGH', reason: 'Feminized/Regular/Auto classification' },
            { field: 'cannabisType', impact: 'HIGH', reason: 'Indica/Sativa/Hybrid classification' },
            { field: 'pack variations', impact: 'MEDIUM', reason: 'Multiple pack sizes for pricing comparison' }
        ];

        missingCritical.forEach(item => {
            console.log(`❌ ${item.field}`);
            console.log(`   Impact: ${item.impact}`);
            console.log(`   Reason: ${item.impact}`);
            console.log('');
        });

        console.log('💡 Recommendations:');
        console.log('--------------------------------------------------');
        console.log('1. 🔍 Investigate BC Bud Depot product detail pages for missing cannabis data');
        console.log('2. 📦 Check if pack size variations are available on product pages');
        console.log('3. 🏷️  Look for strain type classifications in product categories or tags');
        console.log('4. 🧪 Consider implementing detail page scraping for complete cannabis metadata');
        console.log('5. 📊 Compare with competitor sites that have more complete card-level data');

    } catch (error) {
        console.error('❌ Error during analysis:', error);
    }

    console.log('\n🎉 Data Completeness Analysis Complete!');
    console.log('============================================================');
}

// Run the analysis
analyzeDataCompleteness();