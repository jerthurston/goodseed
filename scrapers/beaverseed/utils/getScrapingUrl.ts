/**
 * Helper function to build pagination URL for Beaver Seed
 * 
 * Beaver Seed uses standard WordPress pagination format: /page/N/
 * Examples:
 * - https://beaverseed.com/feminized-cannabis/page/2/
 * - https://beaverseed.com/regular/page/3/
 */
export function getScrapingUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // Beaver Seed pagination format: /page/N/
    // Remove trailing slash and add page path
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/page/${page}/`;
}