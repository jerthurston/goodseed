/**
 * JSON-LD Hybrid Extraction System
 * 
 * Main entry point for hybrid scraping system that combines
 * JSON-LD structured data extraction with manual CSS selector fallback
 */

// Core extraction utilities
export * from './extractor';

// Hybrid scraping utilities
export * from './hybrid';

// Re-export main functions for convenience
export { 
  extractJsonLdProduct,
  extractCannabisProduct,
  validateProductData,
  logExtractionResult
} from './extractor';

export {
  extractManualSelectors,
  extractHybridProduct,
  extractHybridWithValidation,
  calculateQualityScore,
  generateExtractionReport
} from './hybrid';

// Type definitions
export type { ScraperProduct } from './extractor';

// Utilities (moved from hybrid-factory)
export { 
  testJsonLdAvailability,
  generateScraperReport,
  processUrlsBatch
} from '../scraper/hybrid-utilities';