import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AutoScraperService } from '@/lib/services/auto-scraper/frontend/auto-scraper.service';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Hook for real-time job statistics monitoring
 * Polls for job statistics every 30 seconds for dashboard overview
 */
export function useJobStatistics() {
  const queryClient = useQueryClient();

  // Poll for job statistics every 30 seconds
  const { 
    data: jobStats, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['autoScraperStats', 'jobs'],
    queryFn: async () => {
      try {
        apiLogger.info('[useJobStatistics] Fetching job statistics');
        return await AutoScraperService.getJobStatistics();
      } catch (error) {
        apiLogger.logError('[useJobStatistics] Failed to fetch job statistics', error as Error);
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
   * Force refresh job statistics
   */
  const refreshJobStats = () => {
    queryClient.invalidateQueries({
      queryKey: ['autoScraperStats', 'jobs']
    });
  };

  /**
   * Invalidate all auto scraper related queries
   */
  const refreshAllStats = () => {
    queryClient.invalidateQueries({
      queryKey: ['autoScraperStats']
    });
  };

  return {
    jobStats,
    isLoading,
    isError,
    error,
    refetch,
    refreshJobStats,
    refreshAllStats,
  };
}