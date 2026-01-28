import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { extractProductsFromHTML } from '@/scrapers/beaverseed/utils/extractProductsFromHTML';
import { BEAVERSEED_PRODUCT_CARD_SELECTORS } from '@/scrapers/beaverseed/core/selector';

async function testPricingExtractionOnly() {
  console.log('🔍 Testing pricing extraction from HTML...');
  
  // Test với HTML mẫu
  const htmlPath = path.join(__dirname, '..', '_archive', 'card-product.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  
  console.log('📱 Loaded HTML file successfully');
  
  // Mock siteConfig with proper structure
  const siteConfig = {
    name: 'Beaver Seeds',
    baseUrl: 'https://beaverseed.com',
    selectors: BEAVERSEED_PRODUCT_CARD_SELECTORS,
    isImplemented: true
  };
  
  console.log('📋 Extracting products from HTML...');
  
  try {
    const result = extractProductsFromHTML($, siteConfig);
    
    console.log(`✅ Extracted ${result.products.length} products`);
    
    if (result.products.length > 0) {
      const firstProduct = result.products[0];
      console.log('\n📦 First product data:');
      console.log('Name:', firstProduct.name);
      console.log('Slug:', firstProduct.slug);
      console.log('URL:', firstProduct.url);
      console.log('Image URL:', firstProduct.imageUrl);
      console.log('Pricing count:', firstProduct.pricings?.length || 0);
      
      if (firstProduct.pricings && firstProduct.pricings.length > 0) {
        console.log('\n💰 Pricing data:');
        firstProduct.pricings.forEach((pricing, index) => {
          console.log(`  ${index + 1}. ${pricing.packSize} seeds = $${pricing.totalPrice} ($${pricing.pricePerSeed}/seed)`);
        });
        
        console.log('\n✅ SUCCESS: Pricing extraction working correctly!');
      } else {
        console.log('\n❌ ISSUE: No pricing data found!');
        
        // Debug selectors
        console.log('\n🔍 Debug - Checking selectors:');
        const cards = $(siteConfig.selectors.productCard || 'li.product.type-product');
        console.log(`Found ${cards.length} product cards`);
        
        if (cards.length > 0) {
          const firstCard = cards.first();
          const variationInputs = firstCard.find(siteConfig.selectors.variationInputs || 'input.product_variation_radio');
          console.log(`Found ${variationInputs.length} variation inputs`);
          
          variationInputs.each((i, input) => {
            const $input = $(input);
            console.log(`  Input ${i + 1}: value="${$input.attr('value')}" item-price="${$input.attr('item-price')}"`);
          });
        }
      }
    } else {
      console.log('\n❌ ISSUE: No products extracted at all!');
    }
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
  }
}

testPricingExtractionOnly();