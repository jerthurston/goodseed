// lib/cache/query-persister.ts
// localStorage persistence for TanStack Query (client-side only)
// Only used for /seeds listing queries

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/**
 * Configuration for localStorage persistence
 */
export const PERSIST_CONFIG = {
  // Storage key prefix
  KEY_PREFIX: 'goodseed_cache_',
  
  // Version for cache invalidation on schema changes
  VERSION: 1,
  
  // Max age: 24 hours
  MAX_AGE: 1000 * 60 * 60 * 24,
  
  // Max size: 2MB (conservative, room for growth)
  MAX_SIZE: 2 * 1024 * 1024,
} as const;

/**
 * Create localStorage persister with safety checks
 * Returns undefined on SSR or when localStorage is unavailable
 */
export function createLocalStoragePersister(): Persister | undefined {
  // Only in browser
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Check localStorage availability
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
  } catch (error) {
    console.error('[Cache] localStorage not available:', error);
    return undefined;
  }

  return createAsyncStoragePersister({
    storage: window.localStorage,
    key: `${PERSIST_CONFIG.KEY_PREFIX}v${PERSIST_CONFIG.VERSION}`,
    
    // Serialize with error handling
    serialize: (data: PersistedClient) => {
      try {
        return JSON.stringify(data);
      } catch (error) {
        console.error('[Cache] Failed to serialize:', error);
        return '{}';
      }
    },
    
    // Deserialize with validation
    deserialize: (data: string): PersistedClient => {
      try {
        const parsed = JSON.parse(data);
        
        // Validate structure
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid cache structure');
        }
        
        return parsed as PersistedClient;
      } catch (error) {
        console.error('[Cache] Failed to deserialize:', error);
        // Return valid PersistedClient structure
        return { 
          clientState: { queries: [], mutations: [] }, 
          timestamp: 0,
          buster: '',
        };
      }
    },
  });
}

/**
 * Filter which queries should be persisted
 * Only persist /seeds listing queries
 */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }

  const key = queryKey[0] as string;

  // ✅ PERSIST these queries
  const PERSIST_KEYS = [
    'seeds',           // ONLY listing pages with filters/sort
  ];

  // ❌ DO NOT persist these
  const SKIP_KEYS = [
    'seed',            // Product details - HTTP cache sufficient
    'content',         // CMS content - HTTP cache sufficient
    'categories',      // Small data - HTTP cache sufficient
    'user',            // User-specific data
    'admin',           // Admin dashboard
    'wishlist',        // User-specific
    'scrape-jobs',     // Real-time monitoring
    'search',          // Search results (too fragmented)
  ];

  // Check skip list first
  if (SKIP_KEYS.some(skip => key.startsWith(skip))) {
    return false;
  }

  // Check persist list
  return PERSIST_KEYS.some(persist => key.startsWith(persist));
}

/**
 * Clean up old cache entries to prevent quota exceeded
 */
export function cleanupCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = `${PERSIST_CONFIG.KEY_PREFIX}v${PERSIST_CONFIG.VERSION}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return;

    // Check size
    const sizeInBytes = new Blob([cached]).size;
    
    if (sizeInBytes > PERSIST_CONFIG.MAX_SIZE) {
      console.log('[Cache] Size exceeded, clearing:', { 
        size: `${(sizeInBytes / 1024).toFixed(2)}KB`,
        limit: `${(PERSIST_CONFIG.MAX_SIZE / 1024).toFixed(2)}KB`
      });
      
      localStorage.removeItem(cacheKey);
    }
  } catch (error) {
    console.error('[Cache] Cleanup failed:', error);
  }
}

/**
 * Clear persisted cache manually
 */
export function clearPersistedCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `${PERSIST_CONFIG.KEY_PREFIX}v${PERSIST_CONFIG.VERSION}`;
    localStorage.removeItem(cacheKey);
    console.log('[Cache] Cleared manually');
  } catch (error) {
    console.error('[Cache] Failed to clear:', error);
  }
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  if (typeof window === 'undefined') {
    return { exists: false, size: 0, count: 0 };
  }

  try {
    const cacheKey = `${PERSIST_CONFIG.KEY_PREFIX}v${PERSIST_CONFIG.VERSION}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return { exists: false, size: 0, count: 0 };
    }

    const parsed = JSON.parse(cached);
    const queries = parsed.clientState?.queries || [];
    const sizeInBytes = new Blob([cached]).size;

    return {
      exists: true,
      size: sizeInBytes,
      sizeFormatted: `${(sizeInBytes / 1024).toFixed(2)}KB`,
      count: queries.length,
      queries: queries.map((q: any) => q.queryKey),
    };
  } catch (error) {
    return { exists: false, size: 0, count: 0, error: String(error) };
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).getCacheStats = getCacheStats;
  (window as any).clearPersistedCache = clearPersistedCache;
}
