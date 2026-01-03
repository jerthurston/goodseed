/**
 * Crop King Seeds URL Generator
 * 
 * Generates pagination URLs for Crop King Seeds product listings
 * Uses WordPress standard pagination format: /page/N/
 */

/**
 * Generate pagination URL for Crop King Seeds
 * 
 * @param baseUrl - Base URL (e.g., "https://www.cropkingseeds.ca/marijuana-seeds/")
 * @param pageNumber - Page number (1-based)
 * @returns Full URL for the specified page
 * 
 * @example
 * getScrapingUrl("https://www.cropkingseeds.ca/marijuana-seeds/", 1)
 * // Returns: "https://www.cropkingseeds.ca/marijuana-seeds/"
 * 
 * getScrapingUrl("https://www.cropkingseeds.ca/marijuana-seeds/", 2)
 * // Returns: "https://www.cropkingseeds.ca/marijuana-seeds/page/2/"
 */
export function getScrapingUrl(baseUrl: string, pageNumber: number): string {
    // Page 1 is the base URL
    if (pageNumber <= 1) {
        return baseUrl;
    }

    // Remove trailing slash if present for consistent URL building
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Generate WordPress standard pagination URL
    return `${cleanBaseUrl}/page/${pageNumber}/`;
}

/**
 * Extract page number from a Crop King Seeds pagination URL
 * 
 * @param url - Full URL
 * @returns Page number (1-based), or 1 if not a pagination URL
 * 
 * @example
 * getPageNumberFromUrl("https://www.cropkingseeds.ca/marijuana-seeds/page/3/")
 * // Returns: 3
 * 
 * getPageNumberFromUrl("https://www.cropkingseeds.ca/marijuana-seeds/")
 * // Returns: 1
 */
export function getPageNumberFromUrl(url: string): number {
    const pageMatch = url.match(/\/page\/(\d+)\//);
    return pageMatch ? parseInt(pageMatch[1], 10) : 1;
}

/**
 * Check if URL is a pagination URL
 * 
 * @param url - Full URL
 * @returns True if URL contains pagination pattern
 */
export function isPaginationUrl(url: string): boolean {
    return /\/page\/\d+\//.test(url);
}

/**
 * Generate multiple pagination URLs for a range
 * 
 * @param baseUrl - Base URL
 * @param startPage - Start page number (inclusive)
 * @param endPage - End page number (inclusive)
 * @returns Array of pagination URLs
 */
export function getScrapingUrlRange(baseUrl: string, startPage: number, endPage: number): string[] {
    const urls: string[] = [];
    
    for (let page = startPage; page <= endPage; page++) {
        urls.push(getScrapingUrl(baseUrl, page));
    }
    
    return urls;
}

export default getScrapingUrl;