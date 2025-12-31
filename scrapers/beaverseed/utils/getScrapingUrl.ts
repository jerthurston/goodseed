/**
 * Helper function to build pagination URL for Beaver Seed
 * 
 * Beaver Seed uses jet-smart-filters pagination which works differently
 * They typically use ?_page=N or similar query parameter format
 */
export function getScrapingUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // Beaver Seed jet-smart-filters pagination format
    // Add page parameter to existing URL
    const url = new URL(baseUrl);
    url.searchParams.set('_page', page.toString());
    
    return url.toString();
}