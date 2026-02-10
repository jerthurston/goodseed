'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/lib/helpers/api-logger';
import { 
  ScrapeJobService, 
  type ScrapeJob, 
  type FetchScrapeJobsParams 
} from '@/lib/services/scrape-job';

// Re-export types for convenience
export type { ScrapeJob };

interface UseScrapJobsParams extends FetchScrapeJobsParams {
  enablePolling?: boolean;
}

interface UseScrapJobsResult {
  jobs: ScrapeJob[];
  isLoading: boolean;
  error: string | null;
  refreshJobs: () => void;
  successfulJobs: ScrapeJob[];
  failedJobs: ScrapeJob[];
}


export function useFetchScrapeJobs({
  status = 'ALL',
  mode = 'ALL', 
  sellerId,
  limit = 50,
  timeframe = 1440 // 24 hours (was 60 minutes - too short for auto scraper jobs)
}: UseScrapJobsParams = {}): UseScrapJobsResult {
  const queryClient = useQueryClient();

  const {
    data: jobs = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['admin', 'scrapeJobs', { status, mode, sellerId, limit, timeframe }],
    queryFn: () => ScrapeJobService.fetchJobs({ status, mode, sellerId, limit, timeframe }),
    staleTime: 0, // Always consider data stale for admin dashboard
    gcTime: 0, // Don't cache data
    refetchOnWindowFocus: true, // Refresh when window gains focus
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds for real-time updates
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors
      if (failureCount < 2) {
        apiLogger.info('[useScrapeJobs] Retrying fetch', { attempt: failureCount + 1 });
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Convert query error to string
  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : 'Failed to fetch scrape jobs') : 
    null;

  // Log errors
  if (queryError) {
    apiLogger.logError('[useScrapJobs] Failed to fetch jobs', queryError as Error);
  }

  // Derived data - More accurate success/failure detection
  const successfulJobs = jobs.filter(job => {
    // A job is truly successful if:
    // 1. Status is COMPLETED, AND
    // 2. Actually saved or updated some products (not just scraped them)
    return job.status === 'COMPLETED' && 
           (job.productsSaved > 0 || job.productsUpdated > 0);
  });
  
  const failedJobs = jobs.filter(job => {
    // A job is failed if:
    // 1. Status is explicitly FAILED, OR
    // 2. Status is COMPLETED but no products were saved/updated (all errors)
    return job.status === 'FAILED' || 
           (job.status === 'COMPLETED' && job.productsSaved === 0 && job.productsUpdated === 0);
  });

  // Refresh function that invalidates and refetches
  const refreshJobs = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['admin', 'scrapeJobs'] 
    });
    refetch();
  };

  return {
    jobs,
    isLoading,
    error,
    refreshJobs,
    successfulJobs,
    failedJobs
  };
}