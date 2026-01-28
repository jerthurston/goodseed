// lib/cache-headers.ts

export type CacheType = 'static' | 'api' | 'content' | 'page' | 'image' | 'admin';

export interface CacheConfig {
  'Cache-Control': string;
  'CDN-Cache-Control'?: string;
  'Vary'?: string;
}

export const getCacheHeaders = (type: CacheType): CacheConfig => {
  const configs: Record<CacheType, CacheConfig> = {
    static: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000'
    },

    // Image - Long cache, can revalidate
    image: {
      'Cache-Control': 'public, max-age=2502000', // 30 days
      'CDN-Cache-Control': 'public, max-age=2502000',
      'Vary': 'Accept' // For WebP vs JPEG
    },
    // API endpoints (seed listing, filters)
    api: {
      // Browser: 2 min fresh, 10 min stale-while-revalidate
      // CDN: 15 min fresh (UPDATED from 5 min)
      'Cache-Control': 'public, max-age=120, s-maxage=900, stale-while-revalidate=600',
      'CDN-Cache-Control': 'public, max-age=900', // 15 min (UPDATED)
      'Vary': 'Accept-Encoding'
    },

    // CMS Content (homepage, FAQ)
    content: {
      // Browser: 5 min fresh, 1 hour stale-while-revalidate
      // CDN: 30 min fresh, 1 hour stale-while-revalidate
      'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'public, max-age=1800',
      'Vary': 'Accept-Encoding'
    },
    // HTML pages (marketing pages)
    // 🔴 CRITICAL FIX: Browser does NOT cache, only CDN caches
    page: {
      // Browser: 0s (must revalidate with CDN every time)
      // CDN: 30 min fresh, 1 hour stale-while-revalidate
      'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=1800, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'public, max-age=1800',
      'Vary': 'Accept-Encoding, Cookie' // Cookie for authenticated users
    },
    // Admin/User-specific - Never cache
    admin: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'CDN-Cache-Control': 'private, max-age=0'
    }
  }
  return configs[type]
}

/**
 * Apply cache headers to Response
 */

export function applyCacheHeaders(
  response: Response,
  type: CacheType,
  customHeaders?: Record<string, string>
): Response {
  const headers = getCacheHeaders(type);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply custom headers (e.g., CF-Cache-Tag, ETag)
  if (customHeaders) {
    Object.entries(customHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

/**
 * Generate ETag from content
 * Useful for conditional requests (304 Not Modified)
 * Giải thích: 
 * - Server trả header: ETag: "k3f9x2"
 * - Lần sau client gửi: If-None-Match: "k3f9x2"
 * - Nếu ETag mới tính ra trùng → trả 304 không có body, tiết kiệm băng thông.
 */
export function generateETag(content: string | object): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  
  // Simple hash (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // Duyệt từng ký tự, lấy mã Unicode (charCodeAt).
    const char = str.charCodeAt(i);
    // Công thức ((hash << 5) - hash) + char tương đương hash * 31 + char (một kiểu rolling hash phổ biến).
    hash = ((hash << 5) - hash) + char;
    //hash = hash & hash ép hash về số nguyên 32-bit (giống hành vi tràn số trong JS bitwise), giúp giá trị ổn định trong phạm vi int32.
    hash = hash & hash; // Convert to 32-bit integer
  }
  //Chuyển hash thành chuỗi ETag
  return `"${Math.abs(hash).toString(36)}"`;
};

/**
 * Check if request can use cached response (304)
 * Compare ETag or Last-Modified
 */
export function shouldReturnNotModified(
  request: Request,
  etag: string,
  lastModified?: Date
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  const ifModifiedSince = request.headers.get('If-Modified-Since');

  // Check ETag
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true;
  }

  // Check Last-Modified
  if (lastModified && ifModifiedSince) {
    const modifiedTime = lastModified.getTime();
    const sinceTime = new Date(ifModifiedSince).getTime();
    
    if (modifiedTime <= sinceTime) {
      return true;
    }
  }

  return false;
}