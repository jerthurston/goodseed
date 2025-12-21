/**
 * Helper function to build pagination URL
 * 
 * Vancouver Seed Bank uses /pagenum/N/ format for pagination
 */
export function getScrapingUrl(baseUrl: string, page: number = 1): string {
    if (page === 1) {
        return baseUrl;
    }

    // Vancouver Seed Bank pagination format: /pagenum/2/
    // Remove trailing slash if exists
    const cleanUrl = baseUrl.replace(/\/$/, '');

    return `${cleanUrl}/pagenum/${page}/`;
}