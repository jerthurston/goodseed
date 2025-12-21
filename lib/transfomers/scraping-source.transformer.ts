import type { ScrapingSource, CreateScrapingSourceData } from '@/lib/services/scraping-sources/scraping-source.service'
import { extractScrapingSourceName } from '@/lib/utils/scraping-source.utils'

/**
 * Simple transformers for scraping source data
 * Since we're keeping it minimal, these are mostly pass-through
 */

/**
 * Transform API response to UI format
 */
export function transformScrapingSourceForUI(apiSource: ScrapingSource): ScrapingSource {
  // For now, just pass through since the API and UI use the same format
  return {
    ...apiSource
  }
}

/**
 * Transform UI form data to API format
 * Automatically compute scrapingSourceName from URL
 */
export function transformScrapingSourceForAPI(formData: CreateScrapingSourceData): CreateScrapingSourceData {
  // Clean up form data and compute name from URL
  const cleanUrl = formData.scrapingSourceUrl.trim()
  const computedName = extractScrapingSourceName(cleanUrl)
  
  return {
    scrapingSourceName: computedName,
    scrapingSourceUrl: cleanUrl,
    maxPage: formData.maxPage
  }
}

/**
 * Transform array of scraping sources for UI display
 */
export function transformScrapingSourcesListForUI(apiSources: ScrapingSource[]): ScrapingSource[] {
  return apiSources.map(transformScrapingSourceForUI)
}