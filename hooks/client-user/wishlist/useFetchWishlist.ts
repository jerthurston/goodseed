import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { WishlistItemRaw, WishlistItemUI } from '@/types/wishlist.type';
import { transformWishlistItemRawToUI } from '@/lib/transfomers/wishlist/wishlist.transformer';


interface UseFetchWishlistOptions {
  folderId?: string; // Optional: Filter by folder
  enabled?: boolean; // Optional: Enable/disable query
}

/**
 * Hook để fetch danh sách wishlist items của user
 * 
 * @example
 * ```tsx
 * // Fetch all wishlist items
 * const { wishlistItems, isLoading } = useFetchWishlist();
 * 
 * // Fetch items in specific folder
 * const { wishlistItems, isLoading } = useFetchWishlist({ 
 *   folderId: 'folder-123' 
 * });
 * 
 * // Conditionally fetch
 * const { wishlistItems, isLoading } = useFetchWishlist({ 
 *   enabled: isAuthenticated 
 * });
 * ```
 */
export const useFetchWishlist = (options?: UseFetchWishlistOptions) => {
  const { folderId, enabled = true } = options || {};

  const query = useQuery({
    queryKey: ['wishlist', folderId || 'all'],
    queryFn: async () => {
      apiLogger.debug('[useFetchWishlist] Starting fetch', {
        folderId: folderId || 'all',
        enabled
      });

      // Build query params
      const params = new URLSearchParams();
      if (folderId) {
        params.append('folderId', folderId);
      }

      const url = `/me/wishlist${params.toString() ? `?${params.toString()}` : ''}`;
      
      apiLogger.debug('[useFetchWishlist] Calling API', { url });

      try {
        // API call
        const response = await api.get<WishlistItemRaw[]>(url);

        apiLogger.debug('[useFetchWishlist] Raw response received', {
          status: response.status,
          dataLength: response.data?.length || 0,
          data: response.data
        });

        // Transform raw data to UI format
        const transformedData = response.data.map(transformWishlistItemRawToUI);

        apiLogger.debug('[useFetchWishlist] Data transformed', {
          count: transformedData.length,
          folderId: folderId || 'all',
          items: transformedData
        });

        return transformedData;
      } catch (error) {
        apiLogger.logError('[useFetchWishlist] Fetch failed', {error});
        throw error;
      }
    },
    enabled, // Chỉ fetch khi enabled = true
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    retry: 1, // Retry 1 lần nếu fail
  });

  return {
    wishlistItems: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};