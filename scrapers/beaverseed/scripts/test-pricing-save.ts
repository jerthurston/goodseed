import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { extractProductsFromHTML } from '@/scrapers/beaverseed/utils/extractProductsFromHTML';
import { BEAVERSEED_PRODUCT_CARD_SELECTORS } from '@/scrapers/beaverseed/core/selector';

const prisma = new PrismaClient();

async function testPricingExtraction() {
  console.log('🔍 Testing pricing extraction and database save...');
  
  // 1. Test HTML parsing
  const htmlPath = path.join(__dirname, '..', '_archive', 'card-product.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  
  // Mock siteConfig with proper structure
  const siteConfig = {
    name: 'Beaver Seeds',
    baseUrl: 'https://beaverseed.com',
    selectors: BEAVERSEED_PRODUCT_CARD_SELECTORS,
    isImplemented: true
  };
  
  console.log('📱 Extracting products from HTML...');
  const result = extractProductsFromHTML($, siteConfig);
  
  console.log(`✅ Extracted ${result.products.length} products`);
  
  if (result.products.length > 0) {
    const firstProduct = result.products[0];
    console.log('\n📦 First product data:');
    console.log('Name:', firstProduct.name);
    console.log('Slug:', firstProduct.slug);
    console.log('Pricing count:', firstProduct.pricings?.length || 0);
    
    if (firstProduct.pricings && firstProduct.pricings.length > 0) {
      console.log('\n💰 Pricing data:');
      firstProduct.pricings.forEach((pricing, index) => {
        console.log(`  ${index + 1}. ${pricing.packSize} seeds = $${pricing.totalPrice} ($${pricing.pricePerSeed}/seed)`);
      });
    } else {
      console.log('❌ No pricing data found!');
    }
    
    // 2. Check if we can find Beaver Seed seller
    console.log('\n🔍 Checking Beaver Seed seller in database...');
    const seller = await prisma.seller.findFirst({
      where: {
        name: {
          contains: 'Beaver',
          mode: 'insensitive'
        }
      }
    });
    
    if (seller) {
      console.log(`✅ Found seller: ${seller.name} (ID: ${seller.id})`);
      
      // 3. Check existing products
      const existingProducts = await prisma.seedProduct.findMany({
        where: { sellerId: seller.id },
        include: { 
          pricings: true,
          seller: true 
        },
        take: 3
      });
      
      console.log(`\n📋 Sample existing products (first 3 of ${existingProducts.length}):`);
      existingProducts.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name}`);
        console.log(`     - Slug: ${product.slug}`);
        console.log(`     - Pricings: ${product.pricings.length}`);
        if (product.pricings.length > 0) {
          console.log(`     - Sample pricing: ${product.pricings[0].packSize} seeds = $${product.pricings[0].totalPrice}`);
        }
      });
    } else {
      console.log('❌ Beaver Seed seller not found!');
    }
  }
}

testPricingExtraction()
  .catch(console.error)
  .finally(() => prisma.$disconnect());