/**
 * Validation utilities for Cropking Seeds scraper
 * 
 * Provides defensive validation for sourceContext and configuration
 * to prevent crashes and provide better error messages
 */

import { apiLogger } from '@/lib/helpers/api-logger';
import { SiteConfig } from '@/lib/factories/scraper-factory';

/**
 * SourceContext type definition
 */
export interface SourceContext {
  scrapingSourceUrl: string;
  sourceName: string;
  dbMaxPage: number;
}

/**
 * Validation result type
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  validatedContext?: SourceContext;
}

/**
 * Validate and sanitize sourceContext
 */
export function validateSourceContext(
  sourceContext: SourceContext | undefined,
  siteConfig: SiteConfig
): ValidationResult {
  // Check if sourceContext exists
  if (!sourceContext) {
    const errorMsg = '[Cropking Seeds] sourceContext is required but was undefined';
    apiLogger.logError(errorMsg, new Error(errorMsg), {
      siteConfig: siteConfig.name,
      baseUrl: siteConfig.baseUrl
    });
    return {
      isValid: false,
      error: errorMsg
    };
  }

  // Validate scrapingSourceUrl (REQUIRED)
  if (!sourceContext.scrapingSourceUrl || sourceContext.scrapingSourceUrl.trim() === '') {
    const errorMsg = '[Cropking Seeds] scrapingSourceUrl is required in sourceContext';
    apiLogger.logError(errorMsg, new Error(errorMsg), {
      sourceContext,
      siteConfig: siteConfig.name
    });
    return {
      isValid: false,
      error: errorMsg
    };
  }

  // Validate URL format
  try {
    new URL(sourceContext.scrapingSourceUrl);
  } catch (urlError) {
    const errorMsg = `[Cropking Seeds] Invalid scrapingSourceUrl format: ${sourceContext.scrapingSourceUrl}`;
    apiLogger.logError(errorMsg, urlError as Error, {
      scrapingSourceUrl: sourceContext.scrapingSourceUrl,
      siteConfig: siteConfig.name
    });
    return {
      isValid: false,
      error: errorMsg
    };
  }

  // Create validated context with sanitized values
  const validatedContext: SourceContext = {
    scrapingSourceUrl: sourceContext.scrapingSourceUrl.trim(),
    sourceName: sourceContext.sourceName || siteConfig.name,
    dbMaxPage: sourceContext.dbMaxPage || 100
  };

  // Warn if sourceName was missing and defaulted
  if (!sourceContext.sourceName || sourceContext.sourceName.trim() === '') {
    apiLogger.warn('[Cropking Seeds] sourceName missing, using siteConfig.name', {
      scrapingSourceUrl: validatedContext.scrapingSourceUrl,
      defaultedTo: siteConfig.name
    });
  }

  // Warn if dbMaxPage was invalid and defaulted
  if (!sourceContext.dbMaxPage || sourceContext.dbMaxPage < 1) {
    apiLogger.warn('[Cropking Seeds] Invalid dbMaxPage, using default: 100', {
      originalValue: sourceContext.dbMaxPage,
      scrapingSourceUrl: validatedContext.scrapingSourceUrl,
      defaultedTo: 100
    });
  }

  return {
    isValid: true,
    validatedContext
  };
}

/**
 * Validate scraping mode and page parameters
 */
export function validateScrapingMode(
  startPage?: number | null,
  endPage?: number | null,
  fullSiteCrawl?: boolean | null
): {
  isTestMode: boolean;
  effectiveStartPage: number;
  effectiveEndPage: number | null;
} {
  const isTestMode = 
    startPage !== null && 
    endPage !== null && 
    startPage !== undefined && 
    endPage !== undefined;

  const effectiveStartPage = (startPage && startPage > 0) ? startPage : 1;
  const effectiveEndPage = (endPage && endPage > 0) ? endPage : null;

  if (isTestMode && effectiveStartPage > effectiveEndPage!) {
    apiLogger.warn('[Cropking Seeds] Invalid page range: startPage > endPage', {
      startPage: effectiveStartPage,
      endPage: effectiveEndPage
    });
  }

  return {
    isTestMode,
    effectiveStartPage,
    effectiveEndPage
  };
}

/**
 * Log scraper initialization
 */
export function logScraperInitialization(
  siteConfig: SiteConfig,
  sourceContext: SourceContext,
  mode: {
    isTestMode: boolean;
    startPage?: number | null;
    endPage?: number | null;
    fullSiteCrawl?: boolean | null;
    expectedPages: number;
  }
): void {
  apiLogger.crawl('Initializing scraper', {
    seller: sourceContext.sourceName,
    mode: mode.isTestMode ? 'test' : mode.fullSiteCrawl ? 'full' : 'normal',
    baseUrl: siteConfig.baseUrl,
    scrapingSourceUrl: sourceContext.scrapingSourceUrl,
    expectedPages: mode.expectedPages
  });

  apiLogger.debug('[Cropking Seeds] Starting with configuration', {
    name: siteConfig.name,
    baseUrl: siteConfig.baseUrl,
    isImplemented: siteConfig.isImplemented,
    scrapingSourceUrl: sourceContext.scrapingSourceUrl,
    dbMaxPage: sourceContext.dbMaxPage,
    mode: {
      isTestMode: mode.isTestMode,
      startPage: mode.startPage,
      endPage: mode.endPage,
      fullSiteCrawl: mode.fullSiteCrawl
    }
  });
}
