import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Scraper Error Alert interface (sync with API)
 */
export interface ScraperErrorAlert {
  id: string;
  sellerId: string;
  sellerName: string;
  errorMessage: string;
  timestamp: Date;
  jobId?: string;
  errorSource: 'ACTIVITY' | 'JOB';
  errorDetails?: any;
  duration?: number | null;
  productsFound?: number;
}

/**
 * Recent Errors API Response
 */
interface RecentErrorsResponse {
  success: true;
  data: {
    errors: ScraperErrorAlert[];
    summary: {
      totalErrors: number;
      timeframe: number;
      errorsBySource: {
        ACTIVITY: number;
        JOB: number;
      };
      errorsBySeller: Record<string, number>;
    };
    fetchedAt: string;
  };
}

/**
 * Error Monitor Configuration
 */
interface ErrorMonitorConfig {
  timeframe?: number;      // Minutes to look back (default: 15)
  limit?: number;          // Max results (default: 20) 
  severity?: 'all' | 'high' | 'critical';  // Filter by severity
  pollInterval?: number;   // Poll interval in ms (default: 30000)
  enabled?: boolean;       // Enable/disable monitoring (default: true)
}

/**
 * Hook result interface
 */
interface UseScraperErrorMonitorResult {
  // Data
  errors: ScraperErrorAlert[] | undefined;
  summary: RecentErrorsResponse['data']['summary'] | undefined;
  
  // State
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Actions
  refetch: () => void;
  refreshErrors: () => void;
  clearErrorCache: () => void;
  
  // Computed values
  hasErrors: boolean;
  criticalErrorCount: number;
  recentErrorCount: number;
}

/**
 * Hook for real-time scraper error monitoring
 * Polls /api/admin/scraper/recent-errors for error alerts
 * 
 * Usage:
 * ```tsx
 * const { errors, summary, hasErrors, refreshErrors } = useScraperErrorMonitor({
 *   timeframe: 15,
 *   severity: 'high'
 * });
 * ```
 */
export function useScraperErrorMonitor(
  config: ErrorMonitorConfig = {}
): UseScraperErrorMonitorResult {
  const {
    timeframe = 15,
    limit = 20,
    severity = 'all',
    pollInterval = 30000,  // 30 seconds
    enabled = true
  } = config;

  const queryClient = useQueryClient();

  // Main query for recent errors
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<RecentErrorsResponse>({
    queryKey: ['scraperRecentErrors', timeframe, limit, severity],
    queryFn: async () => {
      try {
        apiLogger.info('[useScraperErrorMonitor] Fetching recent errors', { 
          timeframe, 
          limit, 
          severity 
        });

        const response = await api.get('/admin/scraper/recent-errors', {
          params: {
            timeframe,
            limit,
            severity
          }
        });

        apiLogger.debug('[useScraperErrorMonitor] Errors fetched successfully', {
          errorCount: response.data.data.errors.length,
          summary: response.data.data.summary
        });

        return response.data;
      } catch (error) {
        apiLogger.logError('[useScraperErrorMonitor] Failed to fetch errors', error as Error, {
          timeframe,
          limit,
          severity
        });
        throw error;
      }
    },
    enabled,
    refetchInterval: enabled ? pollInterval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    // Keep previous data while refetching để avoid loading states
    placeholderData: (previousData) => previousData,
    // Retry on failure với exponential backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Stale time để balance freshness vs performance
    staleTime: 10000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Computed values
  const errors = data?.data.errors;
  const summary = data?.data.summary;
  const hasErrors = (summary?.totalErrors || 0) > 0;
  const criticalErrorCount = errors?.filter(e => e.errorSource === 'JOB').length || 0;
  const recentErrorCount = summary?.totalErrors || 0;

  /**
   * Force refresh error data (invalidate cache)
   */
  const refreshErrors = () => {
    queryClient.invalidateQueries({
      queryKey: ['scraperRecentErrors']
    });
  };

  /**
   * Clear all error-related cache
   */
  const clearErrorCache = () => {
    queryClient.removeQueries({
      queryKey: ['scraperRecentErrors']
    });
  };

  return {
    // Data
    errors,
    summary,
    
    // State  
    isLoading,
    isError,
    error,
    
    // Actions
    refetch,
    refreshErrors,
    clearErrorCache,
    
    // Computed
    hasErrors,
    criticalErrorCount,
    recentErrorCount
  };
}

/**
 * Specialized hook for dashboard overview (critical errors only)
 */
export function useCriticalErrorMonitor() {
  return useScraperErrorMonitor({
    timeframe: 30,  // Last 30 minutes
    severity: 'critical',
    limit: 10,
    pollInterval: 15000  // Poll every 15 seconds for critical errors
  });
}

/**
 * Specialized hook for seller-specific error monitoring
 */
export function useSellerErrorMonitor(sellerId: string) {
  const { errors, summary, ...rest } = useScraperErrorMonitor({
    timeframe: 60,  // Last hour
    severity: 'all',
    limit: 50
  });

  // Filter by seller
  const sellerErrors = errors?.filter(error => error.sellerId === sellerId);
  const sellerErrorCount = summary?.errorsBySeller?.[sellerId] || 0;

  return {
    ...rest,
    errors: sellerErrors,
    errorCount: sellerErrorCount,
    hasSellerErrors: sellerErrorCount > 0
  };
}