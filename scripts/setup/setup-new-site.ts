/**
 * New Site Setup Generator
 * 
 * Utility script to scaffold new cannabis seed site scrapers
 * using the modern hybrid extraction system
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ScraperSource } from '@/lib/factories/scraper-factory';

interface NewSiteConfig {
  source: ScraperSource;
  siteName: string;
  baseUrl: string;
  platform?: 'woocommerce' | 'shopify' | 'custom';
  description?: string;
}

/**
 * Generate hybrid scraper template for new site
 */
function generateScraperTemplate(config: NewSiteConfig): string {
  const capitalizedName = config.siteName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
  ).join('');

  return `/**
 * ${config.siteName} Hybrid Scraper
 * 
 * Hybrid JSON-LD + Manual extraction for ${config.siteName}
 * Platform: ${config.platform || 'Unknown'}
 * Base URL: ${config.baseUrl}
 */

import { CheerioCrawler, Dataset } from 'crawlee';
import { CheerioAPI } from 'cheerio';
import { 
  extractHybridProduct, 
  ManualSelectors, 
  ScraperProduct 
} from '@/lib/services/json-ld';

/**
 * ${config.siteName} manual selectors configuration
 * TODO: Update these selectors based on actual site structure
 */
export const ${config.source.toUpperCase()}_SELECTORS: ManualSelectors = {
  // Core product information
  name: 'h1.product-title, .product-name, h1',
  price: '.price .amount, .woocommerce-Price-amount, .product-price',
  currency: '.woocommerce-Price-currencySymbol, .currency',
  image: '.product-image img, .wp-post-image, img.primary',
  description: '.product-description, .short-description, .summary',
  availability: '.stock, .availability, .in-stock',
  rating: '.star-rating, .rating, .stars',
  reviewCount: '.review-count, .reviews-count',
  
  // Cannabis-specific selectors (update based on site)
  strainType: '.strain-type, .cannabis-type, .type',
  seedType: '.seed-type, .variety, .seed-variety',
  thcContent: '.thc-content, .thc-level, .thc',
  cbdContent: '.cbd-content, .cbd-level, .cbd',
  floweringTime: '.flowering-time, .flower-time, .flowering',
  yieldInfo: '.yield, .harvest, .production',
  genetics: '.genetics, .lineage, .parents',
  height: '.height, .plant-height, .size',
  effects: '.effects, .experience, .high',
  aroma: '.aroma, .smell, .fragrance',
  flavor: '.flavor, '.taste', .flavour'
};

/**
 * Create ${config.siteName} hybrid scraper
 */
export async function create${capitalizedName.replace(/\s/g, '')}Scraper(): Promise<CheerioCrawler> {
  const dataset = await Dataset.open('${config.source}-hybrid-products');

  return new CheerioCrawler({
    // Compliance settings
    maxConcurrency: 1,
    maxRequestsPerMinute: 15,
    
    async requestHandler({ $, request, log }) {
      // Compliance delay (2-5 seconds)
      await new Promise(resolve => 
        setTimeout(resolve, Math.random() * 3000 + 2000)
      );

      log.info(\`🔍 Processing: \${request.url}\`);

      try {
        const product = await extractHybridProduct($, ${config.source.toUpperCase()}_SELECTORS, request.url);
        
        if (product) {
          const enhancedProduct = enhance${capitalizedName.replace(/\s/g, '')}Product(product, $);
          
          await dataset.pushData({
            ...enhancedProduct,
            extracted_at: new Date().toISOString(),
            site: '${config.source}',
            page_url: request.url
          });

          log.info(\`✅ Extracted: \${enhancedProduct.name} ($\${enhancedProduct.price})\`);
        } else {
          log.error(\`❌ Failed to extract: \${request.url}\`);
        }

      } catch (error) {
        log.error(\`💥 Error processing \${request.url}: \${error instanceof Error ? error.message : String(error)}\`);
      }
    },

    failedRequestHandler({ request, log }) {
      log.error(\`❌ Request failed: \${request.url}\`);
    }
  });
}

/**
 * Site-specific enhancement function
 */
function enhance${capitalizedName.replace(/\s/g, '')}Product(product: ScraperProduct, $: CheerioAPI): ScraperProduct {
  const enhanced = { ...product };

  try {
    // TODO: Add site-specific enhancements here
    // Example: Extract pack sizes, special offers, etc.
    
    console.log(\`🔧 Enhanced product: \${product.name}\`);
    
  } catch (error) {
    console.warn('Enhancement processing error:', error);
  }

  return enhanced;
}

/**
 * Test JSON-LD availability for ${config.siteName}
 */
export async function test${capitalizedName.replace(/\s/g, '')}JsonLD(url: string): Promise<void> {
  const { CheerioCrawler } = await import('crawlee');
  
  const testCrawler = new CheerioCrawler({
    maxConcurrency: 1,
    
    async requestHandler({ $, request }) {
      console.log(\`🧪 Testing JSON-LD on: \${request.url}\`);
      
      const jsonLdScripts = $('script[type="application/ld+json"]');
      console.log(\`📄 Found \${jsonLdScripts.length} JSON-LD scripts\`);

      jsonLdScripts.each((index, element) => {
        const content = $(element).html();
        if (content) {
          try {
            const jsonData = JSON.parse(content);
            console.log(\`📋 Script \${index + 1}:\`, {
              type: jsonData['@type'] || 'Unknown',
              hasProduct: jsonData['@type'] === 'Product',
              hasOffer: !!jsonData.offers,
              preview: JSON.stringify(jsonData).substring(0, 200) + '...'
            });
          } catch (e) {
            console.log(\`⚠️ Script \${index + 1}: Invalid JSON\`);
          }
        }
      });

      const product = await extractHybridProduct($, ${config.source.toUpperCase()}_SELECTORS, request.url);
      console.log(\`🎯 Extraction result:\`, product ? 'SUCCESS' : 'FAILED');
      
      if (product) {
        console.log(\`📊 Product data:\`, {
          name: product.name,
          price: product.price,
          source: product.data_source
        });
      }
    }
  });

  await testCrawler.addRequests([url]);
  await testCrawler.run();
}

export { ${config.source.toUpperCase()}_SELECTORS };`;
}

/**
 * Generate database service template
 */
function generateDbServiceTemplate(config: NewSiteConfig): string {
  const capitalizedName = config.siteName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
  ).join('');

  return `/**
 * ${config.siteName} Database Service
 * 
 * Database operations for ${config.siteName} scraper
 */

import { PrismaClient } from '@prisma/client';
import { ISaveDbService } from '@/lib/factories/scraper-factory';

export class SaveDbService implements ISaveDbService {
  private prisma: PrismaClient;
  private sellerId?: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async initializeSeller(): Promise<string> {
    if (this.sellerId) {
      return this.sellerId;
    }

    const seller = await this.prisma.seller.upsert({
      where: { url: '${config.baseUrl}' },
      update: {
        name: '${config.siteName}',
        updatedAt: new Date()
      },
      create: {
        name: '${config.siteName}',
        url: '${config.baseUrl}',
        slug: '${config.source}',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    this.sellerId = seller.id;
    return this.sellerId;
  }

  async getOrCreateCategory(sellerId: string, categoryData: {
    name: string;
    slug: string;
    seedType?: string;
  }): Promise<string> {
    const category = await this.prisma.category.upsert({
      where: {
        sellerId_slug: {
          sellerId,
          slug: categoryData.slug
        }
      },
      update: {
        name: categoryData.name,
        updatedAt: new Date()
      },
      create: {
        sellerId,
        name: categoryData.name,
        slug: categoryData.slug,
        cannabisType: null, // Update based on category analysis
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return category.id;
  }

  async saveProductsToCategory(categoryId: string, products: any[]): Promise<{
    saved: number;
    updated: number;
    errors: number;
  }> {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // TODO: Implement product saving logic
        // Map ScraperProduct to database schema
        console.log(\`💾 Saving product: \${product.name}\`);
        saved++;
      } catch (error) {
        console.error(\`Error saving product \${product.name}:\`, error);
        errors++;
      }
    }

    return { saved, updated, errors };
  }

  async logScrapeActivity(sellerId: string, status: string, productsCount: number, duration: number): Promise<void> {
    await this.prisma.scrapeActivity.create({
      data: {
        sellerId,
        status,
        productsCount,
        duration,
        createdAt: new Date()
      }
    });
  }
}`;
}

/**
 * Generate test script template
 */
function generateTestTemplate(config: NewSiteConfig): string {
  const capitalizedName = config.siteName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
  ).join('');

  return `/**
 * ${config.siteName} Scraper Test Script
 */

import { 
  create${capitalizedName.replace(/\s/g, '')}Scraper,
  test${capitalizedName.replace(/\s/g, '')}JsonLD,
  ${config.source.toUpperCase()}_SELECTORS
} from '../hybrid/${config.source}-hybrid-scraper';

/**
 * Test URLs for ${config.siteName}
 * TODO: Add actual product URLs from the site
 */
const TEST_URLS = [
  '${config.baseUrl}/product/sample-1',
  '${config.baseUrl}/product/sample-2',
  '${config.baseUrl}/product/sample-3'
];

async function runTests() {
  console.log('🧪 Testing ${config.siteName} Scraper');
  console.log('='.repeat(40));

  try {
    // Test JSON-LD availability
    console.log('\\n📋 Testing JSON-LD availability...');
    await test${capitalizedName.replace(/\s/g, '')}JsonLD(TEST_URLS[0]);

    // Test scraper creation
    console.log('\\n🏗️ Testing scraper creation...');
    const scraper = await create${capitalizedName.replace(/\s/g, '')}Scraper();
    console.log('✅ Scraper created successfully');

    // Test actual scraping (commented out for safety)
    console.log('\\n⚠️ Actual scraping test disabled - uncomment to test');
    /*
    console.log('🔍 Testing actual scraping...');
    await scraper.addRequests(TEST_URLS.slice(0, 1)); // Test only 1 URL
    await scraper.run();
    console.log('✅ Scraping test completed');
    */

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };`;
}

/**
 * Main function to setup new site scraper
 */
export async function setupNewSite(config: NewSiteConfig): Promise<void> {
  console.log(`🏗️ Setting up scraper for ${config.siteName}`);
  console.log('='.repeat(50));

  const scrapersDir = join(process.cwd(), 'scrapers', config.source);
  
  // Create directory structure
  const directories = [
    join(scrapersDir, 'hybrid'),
    join(scrapersDir, 'core'), 
    join(scrapersDir, 'scripts')
  ];

  directories.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Generate files
  const files = [
    {
      path: join(scrapersDir, 'hybrid', `${config.source}-hybrid-scraper.ts`),
      content: generateScraperTemplate(config)
    },
    {
      path: join(scrapersDir, 'core', 'save-db-service.ts'),
      content: generateDbServiceTemplate(config)
    },
    {
      path: join(scrapersDir, 'scripts', 'test-scraper.ts'),
      content: generateTestTemplate(config)
    }
  ];

  files.forEach(file => {
    if (!existsSync(file.path)) {
      writeFileSync(file.path, file.content);
      console.log(`📄 Generated: ${file.path}`);
    } else {
      console.log(`⚠️ File exists, skipped: ${file.path}`);
    }
  });

  console.log('\\n✅ Setup completed!');
  console.log('\\n📋 Next steps:');
  console.log('1. Update selectors in the hybrid scraper file');
  console.log('2. Test JSON-LD availability on sample product pages');
  console.log('3. Implement site-specific enhancements');
  console.log('4. Add the new source to ScraperFactory.getSiteConfig()');
  console.log('5. Update database service with proper product mapping');
  console.log('\\n🧪 Test the scraper:');
  console.log(`npx tsx scrapers/${config.source}/scripts/test-scraper.ts`);
}

// CLI interface
if (require.main === module) {
  const source = process.argv[2] as ScraperSource;
  
  if (!source) {
    console.error('Usage: npm run setup-scraper <source>');
    console.error('Example: npm run setup-scraper bcbuddepot');
    process.exit(1);
  }

  const configs: Partial<Record<ScraperSource, NewSiteConfig>> = {
    'bcbuddepot': {
      source: 'bcbuddepot',
      siteName: 'BC Bud Depot',
      baseUrl: 'https://bcbuddepot.com',
      platform: 'woocommerce',
      description: 'Premium cannabis genetics from British Columbia'
    },
    'cropkingseeds': {
      source: 'cropkingseeds', 
      siteName: 'Crop King Seeds',
      baseUrl: 'https://www.cropkingseeds.ca',
      platform: 'woocommerce',
      description: 'Premium cannabis seeds from Canada'
    }
    // Add more configs as needed
  };

  const config = configs[source];
  if (!config) {
    console.error(`Configuration for ${source} not found. Please add it to the configs object.`);
    process.exit(1);
  }

  setupNewSite(config).catch(console.error);
}

export { generateScraperTemplate, generateDbServiceTemplate, generateTestTemplate };