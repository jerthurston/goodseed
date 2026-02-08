/**
 * Canuk Seeds URL Generator
 * 
 * Generates pagination URLs for Canuk Seeds product listings
 * Uses query parameter pagination format: ?p=N
 */

/**
 * Generate pagination URL for Canuk Seeds
 * 
 * @param baseUrl - Base URL (e.g., "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds")
 * @param pageNumber - Page number (1-based)
 * @returns Full URL for the specified page
 * 
 * @example
 * getScrapingUrl("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds", 1)
 * // Returns: "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds"
 * 
 * getScrapingUrl("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds", 2)
 * // Returns: "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?p=2"
 */
export function getScrapingUrl(baseUrl: string, pageNumber: number): string {
    // Page 1 is the base URL (no query parameter needed)
    if (pageNumber <= 1) {
        return baseUrl;
    }

    // Check if baseUrl already has query parameters
    const separator = baseUrl.includes('?') ? '&' : '?';
    
    // Generate Canuk Seeds pagination URL with ?p=N format
    return `${baseUrl}${separator}p=${pageNumber}`;
}

/**
 * Extract page number from a Canuk Seeds pagination URL
 * 
 * @param url - Full URL
 * @returns Page number (1-based), or 1 if not a pagination URL
 * 
 * @example
 * getPageNumberFromUrl("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?p=3")
 * // Returns: 3
 * 
 * getPageNumberFromUrl("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds")
 * // Returns: 1
 * 
 * getPageNumberFromUrl("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?filter=indica&p=2")
 * // Returns: 2
 */
export function getPageNumberFromUrl(url: string): number {
    // Look for ?p=N or &p=N pattern
    const pageMatch = url.match(/[?&]p=(\d+)/);
    return pageMatch ? parseInt(pageMatch[1], 10) : 1;
}

/**
 * Check if URL is a pagination URL
 * 
 * @param url - Full URL
 * @returns True if URL contains pagination pattern (?p=N or &p=N)
 */
export function isPaginationUrl(url: string): boolean {
    return /[?&]p=\d+/.test(url);
}

/**
 * Generate multiple pagination URLs for a range
 * 
 * @param baseUrl - Base URL
 * @param startPage - Start page number (inclusive)
 * @param endPage - End page number (inclusive)
 * @returns Array of pagination URLs
 * 
 * @example
 * getScrapingUrlRange("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds", 1, 3)
 * // Returns: [
 * //   "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds",
 * //   "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?p=2", 
 * //   "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?p=3"
 * // ]
 */
export function getScrapingUrlRange(baseUrl: string, startPage: number, endPage: number): string[] {
    const urls: string[] = [];
    
    for (let page = startPage; page <= endPage; page++) {
        urls.push(getScrapingUrl(baseUrl, page));
    }
    
    return urls;
}

/**
 * Remove pagination parameter from URL to get base URL
 * 
 * @param url - URL that may contain pagination
 * @returns Base URL without pagination parameter
 * 
 * @example
 * getBaseUrl("https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?p=3&filter=indica")
 * // Returns: "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?filter=indica"
 */
export function getBaseUrl(url: string): string {
    // Remove ?p=N or &p=N parameter
    return url.replace(/([?&])p=\d+(&|$)/, (match, prefix, suffix) => {
        // If it starts with ? and ends with &, replace with ?
        if (prefix === '?' && suffix === '&') return '?';
        // If it starts with & and ends with anything, remove completely
        if (prefix === '&') return '';
        // If it starts with ? and ends with nothing, remove completely
        return '';
    });
}

export default getScrapingUrl;
