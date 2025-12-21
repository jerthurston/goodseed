/**
 * Hybrid Extraction Utilities
 * 
 * Support utilities for hybrid scraper system - testing, validation, and batch processing
 * Main factory pattern is in /lib/factories/scraper-factory.ts
 */

import { CheerioCrawler, Dataset } from 'crawlee';
import { CheerioAPI } from 'cheerio';
import { 
  extractHybridProduct,
  extractHybridWithValidation, 
  ManualSelectors, 
  ScraperProduct,
  generateExtractionReport,
  calculateQualityScore
} from '@/lib/services/json-ld';

/**
 * Configuration for creating a hybrid scraper
 */
export interface HybridScraperConfig {
  siteName: string;
  baseUrl: string;
  selectors: ManualSelectors;
  customEnhancer?: (product: ScraperProduct, $: CheerioAPI) => ScraperProduct;
  
  // Scraping behavior
  maxConcurrency?: number;
  maxRequestsPerMinute?: number;
  minDelay?: number;
  maxDelay?: number;
  
  // Quality control
  enableCrossValidation?: boolean;
  minQualityScore?: number;
  
  // Data handling
  datasetName?: string;
  saveToDataset?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<HybridScraperConfig> = {
  maxConcurrency: 1,
  maxRequestsPerMinute: 15,
  minDelay: 2000,
  maxDelay: 5000,
  enableCrossValidation: false,
  minQualityScore: 60,
  saveToDataset: true
};

/**
 * Create a standardized hybrid scraper
 */
export async function createHybridScraper(config: HybridScraperConfig): Promise<CheerioCrawler> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Setup dataset if needed
  let dataset: Dataset | null = null;
  if (mergedConfig.saveToDataset) {
    const datasetName = mergedConfig.datasetName || `${config.siteName}-hybrid-products`;
    dataset = await Dataset.open(datasetName);
  }

  return new CheerioCrawler({
    maxConcurrency: mergedConfig.maxConcurrency,
    maxRequestsPerMinute: mergedConfig.maxRequestsPerMinute,
    
    async requestHandler({ $, request, log }) {
      // Add compliance delay
      const delay = Math.random() * (mergedConfig.maxDelay! - mergedConfig.minDelay!) + mergedConfig.minDelay!;
      await new Promise(resolve => setTimeout(resolve, delay));

      log.info(`🔍 [${config.siteName}] Processing: ${request.url}`);

      try {
        // Extract using appropriate method
        let product: ScraperProduct | null = null;
        
        if (mergedConfig.enableCrossValidation) {
          product = await extractHybridWithValidation($, config.selectors, request.url);
        } else {
          product = await extractHybridProduct($, config.selectors, request.url);
        }
        
        if (product) {
          // Apply custom enhancement if provided
          if (config.customEnhancer) {
            product = config.customEnhancer(product, $);
          }

          // Quality control
          const qualityScore = calculateQualityScore(product);
          if (qualityScore < mergedConfig.minQualityScore!) {
            log.info(`⚠️ Low quality score (${qualityScore}%) for: ${product.name}`);
          }

          // Save to dataset
          if (dataset) {
            await dataset.pushData({
              ...product,
              extracted_at: new Date().toISOString(),
              site: config.siteName,
              page_url: request.url,
              quality_score: qualityScore,
              extraction_config: {
                method: product.data_source,
                cross_validation: mergedConfig.enableCrossValidation,
                quality_threshold: mergedConfig.minQualityScore
              }
            });
          }

          log.info(`✅ [${config.siteName}] Extracted: ${product.name} ($${product.price}) - Quality: ${qualityScore}%`);
        } else {
          log.error(`❌ [${config.siteName}] Failed to extract from: ${request.url}`);
        }

      } catch (error) {
        log.error(`💥 [${config.siteName}] Error processing ${request.url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    failedRequestHandler({ request, log }) {
      log.error(`❌ [${config.siteName}] Request failed: ${request.url}`);
    }
  });
}

/**
 * Batch processing utility for multiple URLs
 */
export async function processUrlsBatch(
  config: HybridScraperConfig,
  urls: string[]
): Promise<ScraperProduct[]> {
  const results: ScraperProduct[] = [];

  // Create a simple crawler for batch processing
  const batchCrawler = new CheerioCrawler({
    maxConcurrency: config.maxConcurrency || 1,
    maxRequestsPerMinute: config.maxRequestsPerMinute || 15,
    
    async requestHandler({ $, request }) {
      // Add delay
      const delay = Math.random() * 3000 + 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const product = await extractHybridProduct($, config.selectors, request.url);
        if (product) {
          if (config.customEnhancer) {
            results.push(config.customEnhancer(product, $));
          } else {
            results.push(product);
          }
        }
      } catch (error) {
        console.error(`Error processing ${request.url}:`, error);
      }
    }
  });

  await batchCrawler.addRequests(urls.map(url => ({ url })));
  await batchCrawler.run();

  return results;
}

/**
 * Test JSON-LD availability across multiple sites
 */
export async function testJsonLdAvailability(sites: Array<{ name: string; urls: string[] }>): Promise<void> {
  console.log('🧪 Testing JSON-LD availability across cannabis seed sites...\n');

  for (const site of sites) {
    console.log(`\n🏢 Testing ${site.name}:`);
    console.log('═'.repeat(50));

    for (const url of site.urls.slice(0, 3)) { // Test first 3 URLs per site
      const testCrawler = new CheerioCrawler({
        maxConcurrency: 1,
        
        async requestHandler({ $, request }) {
          console.log(`\n📄 ${url}`);
          
          // Check JSON-LD
          const jsonLdScripts = $('script[type="application/ld+json"]');
          const hasJsonLd = jsonLdScripts.length > 0;
          
          let hasProductSchema = false;
          let hasCannabisTerms = false;
          
          if (hasJsonLd) {
            jsonLdScripts.each((_, element) => {
              const content = $(element).html();
              if (content) {
                try {
                  const jsonData = JSON.parse(content);
                  if (jsonData['@type'] === 'Product') hasProductSchema = true;
                  if (/cannabis|seed|strain|thc|cbd/i.test(content)) hasCannabisTerms = true;
                } catch (e) {
                  // Ignore parse errors
                }
              }
            });
          }

          console.log(`  JSON-LD Scripts: ${jsonLdScripts.length}`);
          console.log(`  Product Schema: ${hasProductSchema ? '✅' : '❌'}`);
          console.log(`  Cannabis Terms: ${hasCannabisTerms ? '✅' : '❌'}`);
          console.log(`  Overall Score: ${hasJsonLd && hasProductSchema ? '🟢 Excellent' : hasJsonLd ? '🟡 Partial' : '🔴 None'}`);
        }
      });

      await testCrawler.addRequests([url]);
      await testCrawler.run();
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('🎯 Recommendation: Prioritize sites with "Excellent" JSON-LD support for fastest implementation');
}

/**
 * Generate comprehensive scraper performance report
 */
export async function generateScraperReport(
  config: HybridScraperConfig,
  testUrls: string[]
): Promise<{
  siteName: string;
  totalTested: number;
  jsonLdSuccessRate: number;
  manualSuccessRate: number;
  overallSuccessRate: number;
  averageQualityScore: number;
  recommendations: string[];
}> {
  const results: Array<{
    url: string;
    jsonLdSuccess: boolean;
    manualSuccess: boolean;
    qualityScore: number;
  }> = [];

  const testCrawler = new CheerioCrawler({
    maxConcurrency: 1,
    
    async requestHandler({ $, request }) {
      // Test both methods
      const jsonLdProduct = await extractHybridProduct($, config.selectors, request.url);
      
      // Mock manual extraction by checking if selectors exist
      const manualSuccess = !!(
        $(config.selectors.name).length &&
        $(config.selectors.price).length
      );
      
      const qualityScore = jsonLdProduct ? calculateQualityScore(jsonLdProduct) : 0;
      
      results.push({
        url: request.url,
        jsonLdSuccess: !!jsonLdProduct && jsonLdProduct.data_source === 'json-ld',
        manualSuccess,
        qualityScore
      });
    }
  });

  await testCrawler.addRequests(testUrls.map(url => ({ url })));
  await testCrawler.run();

  // Calculate metrics
  const jsonLdSuccessRate = (results.filter(r => r.jsonLdSuccess).length / results.length) * 100;
  const manualSuccessRate = (results.filter(r => r.manualSuccess).length / results.length) * 100;
  const overallSuccessRate = (results.filter(r => r.jsonLdSuccess || r.manualSuccess).length / results.length) * 100;
  const averageQualityScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (jsonLdSuccessRate > 80) {
    recommendations.push('✅ Excellent JSON-LD support - prioritize JSON-LD extraction');
  } else if (jsonLdSuccessRate > 50) {
    recommendations.push('⚠️ Partial JSON-LD support - use hybrid approach');
  } else {
    recommendations.push('❌ Limited JSON-LD support - focus on manual selectors');
  }

  if (averageQualityScore < 70) {
    recommendations.push('🔧 Consider improving selector specificity for better data quality');
  }

  if (overallSuccessRate < 90) {
    recommendations.push('📋 Review and optimize selectors for better coverage');
  }

  return {
    siteName: config.siteName,
    totalTested: results.length,
    jsonLdSuccessRate: Math.round(jsonLdSuccessRate * 10) / 10,
    manualSuccessRate: Math.round(manualSuccessRate * 10) / 10,
    overallSuccessRate: Math.round(overallSuccessRate * 10) / 10,
    averageQualityScore: Math.round(averageQualityScore * 10) / 10,
    recommendations
  };
}