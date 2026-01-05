// lib/cache-headers.ts
export const getCacheHeaders = (type: 'static' | 'api' | 'page' | 'admin') => {
  const headers = {
    static: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000'
    },
    api: {
      // 3-Layer Coordination: Browser 30s → Cloudflare 60s → Database
      'Cache-Control': 'public, max-age=30, s-maxage=60', // 30s browser, 60s edge
      'CDN-Cache-Control': 'public, max-age=60'
    },
    page: {
      'Cache-Control': 'public, max-age=300, s-maxage=900', // 5min browser, 15min edge
      'CDN-Cache-Control': 'public, max-age=900'
    },
    admin: {
      // Admin data - NO cache for sensitive scraper status
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'CDN-Cache-Control': 'private, max-age=0'
    }
  }
  return headers[type]
}