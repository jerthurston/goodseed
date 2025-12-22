import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AutoScraperService } from '@/lib/services/auto-scraper/frontend/auto-scraper.service';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Hook for real-time auto scraper status monitoring
 * Polls for auto scraper status every 30 seconds
 */
export function useAutoScraperStatus(sellerId?: string) {
  const queryClient = useQueryClient();

  // Poll for auto scraper status every 30 seconds
  const { 
    data: status, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: sellerId ? ['autoScraperStatus', 'seller', sellerId] : ['autoScraperStatus', 'bulk'],
    queryFn: async () => {
      try {
        if (sellerId) {
          apiLogger.info('[useAutoScraperStatus] Fetching seller auto scraper status', { sellerId });
          return await AutoScraperService.getSellerAutoScraperStatus(sellerId);
        } else {
          apiLogger.info('[useAutoScraperStatus] Fetching auto scraper health status');
          return await AutoScraperService.getAutoScraperHealth();
        }
      } catch (error) {
        apiLogger.logError('[useAutoScraperStatus] Failed to fetch status', error as Error, { sellerId });
        throw error;
      }
    },
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true,
    // Only refetch if window is focused để save resources
    refetchOnWindowFocus: true,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
    // Retry on failure với backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  /**
   * Force refresh auto scraper status
   */
  const refreshStatus = () => {
    queryClient.invalidateQueries({
      queryKey: sellerId ? ['autoScraperStatus', 'seller', sellerId] : ['autoScraperStatus', 'bulk']
    });
  };

  /**
   * Invalidate all auto scraper status queries
   */
  const refreshAllStatus = () => {
    queryClient.invalidateQueries({
      queryKey: ['autoScraperStatus']
    });
  };

  return {
    status,
    isLoading,
    isError,
    error,
    refetch,
    refreshStatus,
    refreshAllStatus,
  };
}

/**
 * Hook for bulk auto scraper status monitoring
 * Specialized for dashboard overview
 */
export function useBulkAutoScraperStatus() {
  return useAutoScraperStatus();
}

/**
 * Hook for individual seller auto scraper status monitoring
 * Specialized for seller detail pages
 */
export function useSellerAutoScraperStatus(sellerId: string) {
  return useAutoScraperStatus(sellerId);
}