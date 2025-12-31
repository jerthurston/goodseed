/**
 * 🧪 BC BUD DEPOT PRODUCT DETAIL EXTRACTION TEST
 * 
 * Tests extraction from product detail pages using the archived HTML
 */

import { load } from 'cheerio';
import { readFileSync } from 'fs';
import { join } from 'path';
import { extractProductFromDetailHTML } from '../utils/extractProductFromDetailHTML';

function testBCBudDepotDetailExtraction() {
    console.log('🧪 BC Bud Depot Product Detail Extraction Test');
    console.log('============================================================\n');

    try {
        // Read the archived HTML
        const htmlPath = join(__dirname, '..', '_archive', 'detail-product-section.html');
        const html = readFileSync(htmlPath, 'utf-8');
        
        console.log(`📄 Loading HTML from: ${htmlPath}`);
        
        // Load HTML into Cheerio
        const $ = load(html);
        
        // Mock product URL
        const productUrl = 'https://bcbuddepot.com/marijuana-seeds/bc-bud-depot/bc-kush/';
        
        console.log('📋 Test: Product Detail Extraction');
        console.log('--------------------------------------------------');
        
        // Extract product data
        const product = extractProductFromDetailHTML($, productUrl);
        
        if (!product) {
            console.log('❌ No product extracted');
            return;
        }

        console.log('✅ Product Successfully Extracted!\n');
        
        // Display extracted data
        console.log('📦 Product Details:');
        console.log(`  Name: "${product.name}"`);
        console.log(`  URL: ${product.url}`);
        console.log(`  Slug: ${product.slug}`);
        console.log(`  Image: ${product.imageUrl || 'Not available'}`);
        
        console.log('\n🌿 Cannabis Data:');
        console.log(`  Seed Type: ${product.seedType || 'Not detected'}`);
        console.log(`  Cannabis Type: ${product.cannabisType || 'Not detected'}`);
        console.log(`  Badge: ${product.badge || 'Not available'}`);
        console.log(`  Flowering Time: ${product.floweringTime || 'Not available'}`);
        console.log(`  Growing Level: ${product.growingLevel || 'Not available'}`);
        
        console.log('\n💰 Pricing Information:');
        console.log(`  Total Variations: ${product.pricings.length}`);
        product.pricings.forEach((pricing, index) => {
            console.log(`    ${index + 1}. $${pricing.totalPrice.toFixed(2)} (${pricing.packSize} seeds, $${pricing.pricePerSeed.toFixed(2)}/seed)`);
        });
        
        console.log('\n📊 Data Completeness Analysis:');
        const fields = {
            core: ['name', 'url', 'slug', 'pricings'],
            cannabis: ['seedType', 'cannabisType', 'floweringTime', 'growingLevel'],
            optional: ['imageUrl', 'badge', 'rating', 'reviewCount'],
            missing: ['thcLevel', 'cbdLevel']
        };
        
        const coreComplete = fields.core.filter(field => {
            if (field === 'pricings') return product.pricings.length > 0;
            return product[field as keyof typeof product] != null;
        }).length;
        
        const cannabisComplete = fields.cannabis.filter(field => 
            product[field as keyof typeof product] != null
        ).length;
        
        const optionalComplete = fields.optional.filter(field => 
            product[field as keyof typeof product] != null
        ).length;
        
        console.log(`  Core Fields: ${coreComplete}/${fields.core.length} (${(coreComplete/fields.core.length*100).toFixed(1)}%)`);
        console.log(`  Cannabis Data: ${cannabisComplete}/${fields.cannabis.length} (${(cannabisComplete/fields.cannabis.length*100).toFixed(1)}%)`);
        console.log(`  Optional Fields: ${optionalComplete}/${fields.optional.length} (${(optionalComplete/fields.optional.length*100).toFixed(1)}%)`);
        
        const totalFields = fields.core.length + fields.cannabis.length + fields.optional.length;
        const totalComplete = coreComplete + cannabisComplete + optionalComplete;
        console.log(`  Overall: ${totalComplete}/${totalFields} (${(totalComplete/totalFields*100).toFixed(1)}%)`);
        
        // Analysis vs card extraction
        console.log('\n🔍 Comparison with Card Extraction:');
        console.log('  Detail Page Benefits:');
        console.log(`    ✅ Cannabis specifics detected: ${product.cannabisType ? 'Yes' : 'No'}`);
        console.log(`    ✅ Flowering time available: ${product.floweringTime ? 'Yes' : 'No'}`);
        console.log(`    ✅ Growing type available: ${product.growingLevel ? 'Yes' : 'No'}`);
        console.log(`    ✅ Accurate pack sizes: ${product.pricings.length > 1 ? 'Yes' : 'No'}`);
        console.log(`    ✅ Strain badge: ${product.badge ? 'Yes' : 'No'}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    console.log('\n🎉 BC Bud Depot Product Detail Extraction Test Complete!');
    console.log('============================================================');
}

// Run the test
testBCBudDepotDetailExtraction();