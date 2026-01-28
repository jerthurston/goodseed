'use client'

import { useQuery } from '@tanstack/react-query';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { ScrapeJob } from '@/lib/services/scrape-job';

interface UseFetchJobDetailParams {
  jobId: string | undefined;
  sellerId: string;
  /** Enable polling for real-time updates (default: true for active jobs) */
  enablePolling?: boolean;
}

interface UseFetchJobDetailResult {
  job: ScrapeJob | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch single scrape job detail with optional real-time polling
 * Automatically polls every 5 seconds for ACTIVE/WAITING/DELAYED jobs
 */
export function useFetchJobDetail({
  jobId,
  sellerId,
  enablePolling = true
}: UseFetchJobDetailParams): UseFetchJobDetailResult {
  
  const {
    data: job = null,
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['admin', 'scrapeJob', jobId, sellerId],
    queryFn: async () => {
      if (!jobId) return null;
      
      try {
        apiLogger.debug('[useFetchJobDetail] Fetching job detail', { jobId, sellerId });
        
        const response = await fetch(`/api/admin/sellers/${sellerId}/scraper/job/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch job: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch job');
        }
        
        return data.data as ScrapeJob;
      } catch (error) {
        apiLogger.logError('[useFetchJobDetail] Failed to fetch job', error as Error, { jobId, sellerId });
        throw error;
      }
    },
    enabled: !!jobId && !!sellerId, // Only run if jobId and sellerId exist
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    // Conditional polling based on job status
    refetchInterval: (query) => {
      if (!enablePolling) return false;
      
      const jobData = query.state.data;
      if (!jobData) return false;
      
      // Poll every 5 seconds for active/waiting jobs
      const isActiveJob = ['ACTIVE', 'WAITING', 'DELAYED', 'CREATED'].includes(jobData.status);
      
      if (isActiveJob) {
        apiLogger.debug('[useFetchJobDetail] Polling active job', { 
          jobId, 
          status: jobData.status,
          interval: '5s'
        });
        return 5000; // 5 seconds
      }
      
      // Stop polling for finished jobs
      return false;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000)
  });

  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : 'Failed to fetch job detail') : 
    null;

  return {
    job,
    isLoading,
    error,
    refetch
  };
}
