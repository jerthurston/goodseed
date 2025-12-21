/**
 * JSON-LD Extraction Utilities for Cannabis Seed Sites
 * 
 * This module provides utilities for extracting structured data from JSON-LD
 * embedded in cannabis seed e-commerce sites, with fallback to manual selectors.
 */

import { CheerioAPI } from 'cheerio';

/**
 * Scraper product data interface for JSON-LD extraction
 */
export interface ScraperProduct {
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
  rating?: number;
  review_count?: number;
  description: string;
  sku: string;
  availability: boolean;
  source_url: string;
  data_source: 'json-ld' | 'manual';
  
  // Cannabis-specific properties
  strain_type: string | null;      // Indica, Sativa, Hybrid
  seed_type: string | null;        // Feminized, Regular, Auto
  thc_content: string | null;      // "18-22%"
  cbd_content: string | null;      // "1-3%"
  flowering_time: string | null;   // "8-9 weeks"
  yield_info: string | null;       // "400-500g/m²"
  genetics: string | null;         // Parent strains
  height: string | null;           // Plant height
  effects: string | null;          // Effects description
  aroma: string | null;            // Aroma profile
  flavor: string | null;           // Flavor profile
}

/**
 * Cannabis-specific property mappings for JSON-LD extraction
 */
export const CANNABIS_PROPERTY_MAPPINGS = {
  'Seed Type': ['seedType', 'seed_type', 'type', 'variety', 'seedVariety'],
  'Cannabis Type': ['strainType', 'strain_type', 'variety', 'category', 'cannabisType'],
  'THC Content': ['thc', 'THC', 'thc_content', 'thc_level', 'thc_percentage', 'thcContent'],
  'CBD Content': ['cbd', 'CBD', 'cbd_content', 'cbd_level', 'cbd_percentage', 'cbdContent'],
  'Flowering Time': ['flowering', 'flower_time', 'flowering_period', 'bloom_time', 'floweringTime'],
  'Genetics': ['genetics', 'lineage', 'cross', 'parentage', 'breeding', 'strain_genetics'],
  'Yield': ['yield', 'harvest', 'production', 'output', 'yieldInfo'],
  'Height': ['height', 'plant_height', 'size', 'plantHeight'],
  'Effect': ['effect', 'effects', 'high_type', 'experience'],
  'Aroma': ['aroma', 'smell', 'fragrance', 'scent', 'terpenes'],
  'Flavor': ['flavor', 'flavour', 'taste', 'flavoring']
} as const;

/**
 * JSON-LD detection result interface
 */
interface JsonLdDetection {
  index: number;
  content: string | null;
  hasProduct: boolean;
  hasOffer: boolean;
  hasCannabisTerms: boolean;
  isValid: boolean;
}

/**
 * Detect and analyze JSON-LD scripts in the page
 */
export function detectJsonLdStructure($: CheerioAPI): JsonLdDetection[] {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const results: JsonLdDetection[] = [];

  jsonLdScripts.each((index, element) => {
    const content = $(element).html();
    const hasCannabisTerms = content ? 
      /cannabis|seed|strain|thc|cbd|indica|sativa|feminized|autoflower|regular/i.test(content) : 
      false;

    results.push({
      index,
      content,
      hasProduct: content?.includes('"@type":"Product"') || content?.includes('"@type": "Product"') || false,
      hasOffer: content?.includes('"offers"') || content?.includes('"offer"') || false,
      hasCannabisTerms,
      isValid: !!(content && content.trim().length > 0)
    });
  });

  return results;
}

/**
 * Extract price information from offers object
 */
function extractPrice(offers: any): number {
  if (!offers) return 0;

  // Handle array of offers
  if (Array.isArray(offers)) {
    offers = offers[0];
  }

  // Extract price value
  const priceValue = offers.price || offers.priceSpecification?.price || offers.lowPrice || 0;
  
  // Convert to number
  if (typeof priceValue === 'string') {
    return parseFloat(priceValue.replace(/[^0-9.]/g, '')) || 0;
  }
  
  return typeof priceValue === 'number' ? priceValue : 0;
}

/**
 * Extract currency from offers object
 */
function extractCurrency(offers: any): string {
  if (!offers) return 'USD';

  // Handle array of offers
  if (Array.isArray(offers)) {
    offers = offers[0];
  }

  return offers.priceCurrency || offers.priceSpecification?.priceCurrency || 'USD';
}

/**
 * Extract availability status from offers
 */
function extractAvailability(offers: any): boolean {
  if (!offers) return false;

  // Handle array of offers
  if (Array.isArray(offers)) {
    offers = offers[0];
  }

  const availability = offers.availability || offers.availabilityStatus || '';
  
  // Check for in-stock indicators
  return availability.includes('InStock') || 
         availability.includes('Available') ||
         availability.toLowerCase().includes('in stock');
}

/**
 * Extract cannabis-specific properties from product data
 */
function extractProperty(product: any, propertyName: keyof typeof CANNABIS_PROPERTY_MAPPINGS): string | null {
  const variations = CANNABIS_PROPERTY_MAPPINGS[propertyName] || [propertyName];
  
  // Check additionalProperty array (Schema.org standard)
  if (product.additionalProperty && Array.isArray(product.additionalProperty)) {
    for (const prop of product.additionalProperty) {
      if (prop.name && prop.value) {
        const propName = prop.name.toLowerCase();
        const found = variations.some(v => propName.includes(v.toLowerCase()));
        if (found) {
          return String(prop.value);
        }
      }
    }
  }
  
  // Check direct properties
  for (const variation of variations) {
    if (product[variation]) {
      return String(product[variation]);
    }
  }
  
  return null;
}

/**
 * Extract image URL from product data
 */
function extractImageUrl(product: any): string | null {
  if (!product.image) return null;

  // Handle array of images
  if (Array.isArray(product.image)) {
    return product.image[0] || null;
  }

  // Handle image object with url property
  if (typeof product.image === 'object' && product.image.url) {
    return product.image.url;
  }

  // Handle direct string URL
  if (typeof product.image === 'string') {
    return product.image;
  }

  return null;
}

/**
 * Extract cannabis product data from JSON-LD
 */
export function extractCannabisProduct(jsonData: any, sourceUrl: string): ScraperProduct | null {
  try {
    // Handle array of JSON-LD objects
    const products = Array.isArray(jsonData) ? jsonData : [jsonData];
    
    for (const item of products) {
      if (item['@type'] === 'Product' || item.type === 'Product') {
        const product: Partial<ScraperProduct> = {
          name: item.name || '',
          price: extractPrice(item.offers),
          currency: extractCurrency(item.offers),
          image_url: extractImageUrl(item),
          rating: item.aggregateRating?.ratingValue ? parseFloat(item.aggregateRating.ratingValue) : undefined,
          review_count: item.aggregateRating?.reviewCount ? parseInt(item.aggregateRating.reviewCount) : undefined,
          description: item.description || '',
          sku: item.sku || '',
          availability: extractAvailability(item.offers),
          source_url: sourceUrl,
          data_source: 'json-ld' as const,
          
          // Cannabis-specific properties
          strain_type: extractProperty(item, 'Cannabis Type'),
          seed_type: extractProperty(item, 'Seed Type'),
          thc_content: extractProperty(item, 'THC Content'),
          cbd_content: extractProperty(item, 'CBD Content'),
          flowering_time: extractProperty(item, 'Flowering Time'),
          yield_info: extractProperty(item, 'Yield'),
          genetics: extractProperty(item, 'Genetics'),
          height: extractProperty(item, 'Height'),
          effects: extractProperty(item, 'Effect'),
          aroma: extractProperty(item, 'Aroma'),
          flavor: extractProperty(item, 'Flavor')
        };

        // Validate minimum required fields
        if (product.name && product.name.trim().length > 0) {
          return product as ScraperProduct;
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting cannabis product from JSON-LD:', error);
  }

  return null;
}

/**
 * Main function to extract JSON-LD data from page
 */
export function extractJsonLdProduct($: CheerioAPI, sourceUrl: string): ScraperProduct | null {
  const detections = detectJsonLdStructure($);
  
  // Prioritize cannabis-related JSON-LD scripts
  const cannabisScripts = detections.filter(d => d.hasProduct && d.hasCannabisTerms && d.isValid);
  const productScripts = detections.filter(d => d.hasProduct && d.isValid);
  
  const scriptsToTry = cannabisScripts.length > 0 ? cannabisScripts : productScripts;
  
  for (const detection of scriptsToTry) {
    try {
      if (!detection.content) continue;
      
      const jsonData = JSON.parse(detection.content);
      const product = extractCannabisProduct(jsonData, sourceUrl);
      
      if (product) {
        console.log(`✅ JSON-LD extraction successful: ${product.name}`);
        return product;
      }
    } catch (error) {
      console.warn(`JSON-LD parse error for script ${detection.index}:`, error);
    }
  }
  
  return null;
}

/**
 * Validate extracted product data quality
 */
export function validateProductData(product: Partial<ScraperProduct>): boolean {
  const requiredFields = ['name', 'price'] as const;
  const missingFields = requiredFields.filter(field => !product[field] || product[field] === 0);
  
  if (missingFields.length > 0) {
    console.warn(`Missing required fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Additional validation rules
  if (product.price && product.price < 0) {
    console.warn('Invalid price: negative value');
    return false;
  }
  
  if (product.name && product.name.trim().length < 3) {
    console.warn('Invalid name: too short');
    return false;
  }
  
  return true;
}

/**
 * Log extraction results for monitoring
 */
export function logExtractionResult(product: ScraperProduct | null, source: 'json-ld' | 'manual', url: string): void {
  if (product) {
    console.log(`✅ Extracted via ${source}: ${product.name} - $${product.price} (${url})`);
  } else {
    console.warn(`❌ Failed extraction via ${source}: ${url}`);
  }
}