'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ScrapeJobService } from '@/lib/services/scrape-job';

export interface UseDeleteScrapeJobResult {
  deleteJob: (jobId: string) => Promise<void>;
  isDeletingJob: boolean;
  deleteError: string | null;
  reset: () => void;
}

/**
 * Hook for deleting scrape jobs
 * 
 * Features:
 * - Mutation-based delete operation
 * - Auto-refresh job lists after successful delete
 * - Comprehensive error handling and logging
 * - Loading state management
 * - Error reset functionality
 */
export function useDeleteScrapeJob(): UseDeleteScrapeJobResult {
  const queryClient = useQueryClient();

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      apiLogger.info('[useDeleteScrapeJob] Starting delete operation', { jobId });
      return await ScrapeJobService.deleteJob(jobId);
    },
    onSuccess: (result, deletedJobId) => {
      apiLogger.info('[useDeleteScrapeJob] Job deleted successfully', { 
        jobId: deletedJobId,
        result 
      });
      
      // Invalidate all scrape jobs queries to refresh the lists
      queryClient.invalidateQueries({ 
        queryKey: ['admin', 'scrapeJobs'] 
      });
      
      // Also invalidate individual job queries
      queryClient.invalidateQueries({
        queryKey: ['admin', 'scrapeJob', deletedJobId]
      });
    },
    onError: (error, jobId) => {
      apiLogger.logError('[useDeleteScrapeJob] Failed to delete job', error as Error, { 
        jobId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    },
    onSettled: (data, error, jobId) => {
      apiLogger.info('[useDeleteScrapeJob] Delete operation completed', { 
        jobId, 
        success: !error,
        hasError: !!error
      });
    }
  });

  // Wrapper function with enhanced error handling
  const deleteJob = async (jobId: string): Promise<void> => {
    if (!jobId) {
      const errorMessage = 'Job ID is required for delete operation';
      apiLogger.logError('[useDeleteScrapeJob] Invalid job ID', new Error(errorMessage), { jobId });
      throw new Error(errorMessage);
    }

    try {
      await deleteJobMutation.mutateAsync(jobId);
    } catch (error) {
      // Error is already logged in onError callback
      // Re-throw to allow component-level error handling
      throw error;
    }
  };

  // Convert mutation error to string
  const deleteError = deleteJobMutation.error ? 
    (deleteJobMutation.error instanceof Error ? 
      deleteJobMutation.error.message : 
      'Failed to delete scrape job'
    ) : null;

  return {
    deleteJob,
    isDeletingJob: deleteJobMutation.isPending,
    deleteError,
    reset: deleteJobMutation.reset
  };
}
