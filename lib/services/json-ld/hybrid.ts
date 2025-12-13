/**
 * Hybrid Scraper Utilities
 * 
 * Combines JSON-LD extraction with manual selector fallback for cannabis seed sites
 */

import { CheerioAPI } from 'cheerio';
import { 
  ScraperProduct, 
  extractJsonLdProduct, 
  validateProductData, 
  logExtractionResult 
} from './extractor';

/**
 * Manual selector configuration for a scraper site
 */
export interface ManualSelectors {
  name: string;
  price: string;
  currency?: string;
  image?: string;
  description?: string;
  availability?: string;
  rating?: string;
  reviewCount?: string;
  
  // Cannabis-specific selectors
  strainType?: string;
  seedType?: string;
  thcContent?: string;
  cbdContent?: string;
  floweringTime?: string;
  yieldInfo?: string;
  genetics?: string;
  height?: string;
  effects?: string;
  aroma?: string;
  flavor?: string;
}

/**
 * Extract product using manual CSS selectors
 */
export function extractManualSelectors(
  $: CheerioAPI, 
  selectors: ManualSelectors, 
  sourceUrl: string
): ScraperProduct | null {
  try {
    // Extract required fields
    const name = $(selectors.name).text().trim();
    const priceText = $(selectors.price).text().trim();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

    if (!name || !price) {
      console.warn('Manual extraction failed: missing name or price');
      return null;
    }

    // Extract optional fields
    const product: ScraperProduct = {
      name,
      price,
      currency: selectors.currency ? $(selectors.currency).text().trim() : 'USD',
      image_url: selectors.image ? $(selectors.image).attr('src') || null : null,
      description: selectors.description ? $(selectors.description).text().trim() : '',
      sku: '',
      availability: selectors.availability ? 
        $(selectors.availability).text().toLowerCase().includes('stock') : true,
      source_url: sourceUrl,
      data_source: 'manual',
      
      // Optional rating/reviews
      rating: selectors.rating ? parseFloat($(selectors.rating).text()) || undefined : undefined,
      review_count: selectors.reviewCount ? parseInt($(selectors.reviewCount).text()) || undefined : undefined,
      
      // Cannabis-specific properties
      strain_type: selectors.strainType ? $(selectors.strainType).text().trim() || null : null,
      seed_type: selectors.seedType ? $(selectors.seedType).text().trim() || null : null,
      thc_content: selectors.thcContent ? $(selectors.thcContent).text().trim() || null : null,
      cbd_content: selectors.cbdContent ? $(selectors.cbdContent).text().trim() || null : null,
      flowering_time: selectors.floweringTime ? $(selectors.floweringTime).text().trim() || null : null,
      yield_info: selectors.yieldInfo ? $(selectors.yieldInfo).text().trim() || null : null,
      genetics: selectors.genetics ? $(selectors.genetics).text().trim() || null : null,
      height: selectors.height ? $(selectors.height).text().trim() || null : null,
      effects: selectors.effects ? $(selectors.effects).text().trim() || null : null,
      aroma: selectors.aroma ? $(selectors.aroma).text().trim() || null : null,
      flavor: selectors.flavor ? $(selectors.flavor).text().trim() || null : null,
    };

    return product;
  } catch (error) {
    console.warn('Manual extraction error:', error);
    return null;
  }
}

/**
 * Hybrid extraction combining JSON-LD and manual selectors
 */
export async function extractHybridProduct(
  $: CheerioAPI, 
  selectors: ManualSelectors, 
  sourceUrl: string
): Promise<ScraperProduct | null> {
  let product: ScraperProduct | null = null;
  
  // PRIORITY 1: Try JSON-LD extraction
  product = extractJsonLdProduct($, sourceUrl);
  if (product && validateProductData(product)) {
    logExtractionResult(product, 'json-ld', sourceUrl);
    return product;
  }
  
  // FALLBACK: Manual selector extraction
  product = extractManualSelectors($, selectors, sourceUrl);
  if (product && validateProductData(product)) {
    logExtractionResult(product, 'manual', sourceUrl);
    return product;
  }
  
  // No successful extraction
  logExtractionResult(null, 'json-ld', sourceUrl);
  return null;
}

/**
 * Enhanced hybrid extraction with cross-validation
 */
export async function extractHybridWithValidation(
  $: CheerioAPI, 
  selectors: ManualSelectors, 
  sourceUrl: string
): Promise<ScraperProduct | null> {
  // Extract using both methods
  const jsonLdProduct = extractJsonLdProduct($, sourceUrl);
  const manualProduct = extractManualSelectors($, selectors, sourceUrl);
  
  // If both extractions successful, cross-validate
  if (jsonLdProduct && manualProduct) {
    const mergedProduct = mergeProductData(jsonLdProduct, manualProduct);
    logExtractionResult(mergedProduct, 'json-ld', `${sourceUrl} (cross-validated)`);
    return mergedProduct;
  }
  
  // Use whichever method succeeded
  const product = jsonLdProduct || manualProduct;
  if (product && validateProductData(product)) {
    const source = jsonLdProduct ? 'json-ld' : 'manual';
    logExtractionResult(product, source, sourceUrl);
    return product;
  }
  
  logExtractionResult(null, 'json-ld', sourceUrl);
  return null;
}

/**
 * Merge product data from JSON-LD and manual extraction
 */
function mergeProductData(jsonLdProduct: ScraperProduct, manualProduct: ScraperProduct): ScraperProduct {
  return {
    // Prioritize JSON-LD for core fields
    name: jsonLdProduct.name || manualProduct.name,
    price: jsonLdProduct.price || manualProduct.price,
    currency: jsonLdProduct.currency || manualProduct.currency,
    image_url: jsonLdProduct.image_url || manualProduct.image_url,
    description: jsonLdProduct.description || manualProduct.description,
    sku: jsonLdProduct.sku || manualProduct.sku,
    availability: jsonLdProduct.availability !== undefined ? jsonLdProduct.availability : manualProduct.availability,
    source_url: jsonLdProduct.source_url,
    data_source: 'json-ld', // Mark as JSON-LD since it had priority
    
    // Merge ratings (prefer JSON-LD)
    rating: jsonLdProduct.rating || manualProduct.rating,
    review_count: jsonLdProduct.review_count || manualProduct.review_count,
    
    // Cannabis properties - take best available from either source
    strain_type: jsonLdProduct.strain_type || manualProduct.strain_type,
    seed_type: jsonLdProduct.seed_type || manualProduct.seed_type,
    thc_content: jsonLdProduct.thc_content || manualProduct.thc_content,
    cbd_content: jsonLdProduct.cbd_content || manualProduct.cbd_content,
    flowering_time: jsonLdProduct.flowering_time || manualProduct.flowering_time,
    yield_info: jsonLdProduct.yield_info || manualProduct.yield_info,
    genetics: jsonLdProduct.genetics || manualProduct.genetics,
    height: jsonLdProduct.height || manualProduct.height,
    effects: jsonLdProduct.effects || manualProduct.effects,
    aroma: jsonLdProduct.aroma || manualProduct.aroma,
    flavor: jsonLdProduct.flavor || manualProduct.flavor,
  };
}

/**
 * Quality score for extracted product data
 */
export function calculateQualityScore(product: ScraperProduct): number {
  let score = 0;
  const weights = {
    // Required fields (high weight)
    name: 20,
    price: 20,
    
    // Important fields (medium weight)
    image_url: 10,
    description: 8,
    availability: 8,
    
    // Cannabis-specific (medium weight)
    strain_type: 10,
    seed_type: 10,
    
    // Optional fields (low weight)
    thc_content: 3,
    cbd_content: 3,
    flowering_time: 2,
    yield_info: 2,
    genetics: 2,
    rating: 2
  };
  
  // Calculate score based on available fields
  Object.entries(weights).forEach(([field, weight]) => {
    const value = product[field as keyof ScraperProduct];
    if (value !== null && value !== undefined && value !== '') {
      score += weight;
    }
  });
  
  return Math.min(score, 100); // Cap at 100%
}

/**
 * Generate extraction report for monitoring
 */
export function generateExtractionReport(
  jsonLdProduct: ScraperProduct | null,
  manualProduct: ScraperProduct | null,
  finalProduct: ScraperProduct | null,
  url: string
) {
  const report = {
    url,
    timestamp: new Date().toISOString(),
    methods: {
      jsonLd: {
        success: !!jsonLdProduct,
        qualityScore: jsonLdProduct ? calculateQualityScore(jsonLdProduct) : 0
      },
      manual: {
        success: !!manualProduct,
        qualityScore: manualProduct ? calculateQualityScore(manualProduct) : 0
      }
    },
    final: {
      success: !!finalProduct,
      qualityScore: finalProduct ? calculateQualityScore(finalProduct) : 0,
      dataSource: finalProduct?.data_source || 'none'
    }
  };
  
  console.log('📊 Extraction Report:', JSON.stringify(report, null, 2));
  return report;
}