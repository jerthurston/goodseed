/**
 * Mary Jane's Garden URL Generation Utility
 * 
 * Generates pagination URLs for Mary Jane's Garden website.
 * Uses WordPress standard pagination format with /page/N/ path structure
 */

interface UrlGenerationOptions {
    baseUrl: string;
    page: number;
}

/**
 * Generate pagination URL for Mary Jane's Garden
 * 
 * Mary Jane's Garden uses WordPress pagination format:
 * - /page/2/ for pagination
 * - Examples:
 *   - https://maryjanesgarden.com/fast-version/page/2/
 *   - https://maryjanesgarden.com/shop/page/3/
 * 
 * @param baseUrl Base URL for the shop/category
 * @param page Page number (defaults to 1)
 * @returns Formatted URL for the specified page
 */
export function getScrapingUrl(baseUrl: string, page: number = 1): string {
    // Clean the base URL - remove trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // For page 1, return base URL without pagination
    if (page === 1) {
        return cleanBaseUrl;
    }
    
    // For other pages, add /page/N/ path
    // WordPress standard pagination format
    return `${cleanBaseUrl}/page/${page}/`;
}

/**
 * Extract base URL from a full pagination URL
 * 
 * @param url Full URL with potential pagination parameters
 * @returns Clean base URL without pagination parameters
 */
export function extractBaseUrl(url: string): string {
    // Remove /page/N/ path and trailing slash
    return url
        .replace(/\/page\/\d+\/?/g, '')
        .replace(/\/$/, '');
}

/**
 * Extract page number from a pagination URL
 * 
 * @param url URL with potential pagination parameters
 * @returns Page number (defaults to 1 if not found)
 */
export function extractPageNumber(url: string): number {
    const match = url.match(/\/page\/(\d+)\/?/);
    return match ? parseInt(match[1], 10) : 1;
}

/**
 * Validate if URL is a valid Mary Jane's Garden pagination URL
 * 
 * @param url URL to validate
 * @returns True if URL appears to be valid Mary Jane's Garden URL
 */
export function isValidMaryJanesGardenUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('maryjanesgarden.com');
    } catch {
        return false;
    }
}

// Export for testing
export const MaryJanesGardenUrlUtils = {
    getScrapingUrl,
    extractBaseUrl,
    extractPageNumber,
    isValidMaryJanesGardenUrl,
} as const;