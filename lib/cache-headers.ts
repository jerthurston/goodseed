// lib/cache-headers.ts
export const getCacheHeaders = (type: 'static' | 'api' | 'page') => {
  const headers = {
    static: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000'
    },
    api: {
      'Cache-Control': 'public, max-age=300, s-maxage=1800', // 5min browser, 30min edge
      'CDN-Cache-Control': 'public, max-age=1800'
    },
    page: {
      'Cache-Control': 'public, max-age=300, s-maxage=900', // 5min browser, 15min edge
      'CDN-Cache-Control': 'public, max-age=900'
    }
  }
  return headers[type]
}