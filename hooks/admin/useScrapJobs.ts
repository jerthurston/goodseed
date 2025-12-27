'use client'

import { useState, useEffect, useCallback } from 'react';
import { apiLogger } from '@/lib/helpers/api-logger';

export interface ScrapeJob {
  id: string;
  sellerId: string;
  sellerName: string;
  status: 'CREATED' | 'WAITING' | 'DELAYED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  mode: 'manual' | 'batch' | 'auto' | 'test';
  productsScraped: number;
  productsSaved: number;
  productsUpdated: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

interface UseScrapJobsParams {
  status?: 'COMPLETED' | 'FAILED' | 'ALL';
  mode?: 'manual' | 'batch' | 'auto' | 'test' | 'ALL';
  sellerId?: string;
  limit?: number;
  timeframe?: number; // minutes
}

interface UseScrapJobsResult {
  jobs: ScrapeJob[];
  isLoading: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  successfulJobs: ScrapeJob[];
  failedJobs: ScrapeJob[];
}

export function useScrapJobs({
  status = 'ALL',
  mode = 'ALL', 
  sellerId,
  limit = 50,
  timeframe = 60
}: UseScrapJobsParams = {}): UseScrapJobsResult {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (status !== 'ALL') {
        params.append('status', status);
      }
      
      if (mode !== 'ALL') {
        params.append('mode', mode);
      }
      
      if (sellerId) {
        params.append('sellerId', sellerId);
      }
      
      params.append('limit', limit.toString());

      const response = await fetch(`/api/admin/scraper/scrape-job?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scrape jobs: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter by timeframe if specified
      let filteredJobs = data.jobs || [];
      
      if (timeframe) {
        const cutoffTime = new Date(Date.now() - timeframe * 60 * 1000);
        filteredJobs = filteredJobs.filter((job: ScrapeJob) => 
          new Date(job.updatedAt) > cutoffTime
        );
      }

      setJobs(filteredJobs);
      
      apiLogger.info('[useScrapJobs] Jobs fetched successfully', {
        count: filteredJobs.length,
        status,
        mode,
        timeframe
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scrape jobs';
      setError(errorMessage);
      apiLogger.logError('[useScrapJobs] Failed to fetch jobs', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [status, mode, sellerId, limit, timeframe]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const refreshJobs = useCallback(() => {
    return fetchJobs();
  }, [fetchJobs]);

  // Derived data
  const successfulJobs = jobs.filter(job => job.status === 'COMPLETED');
  const failedJobs = jobs.filter(job => job.status === 'FAILED');

  return {
    jobs,
    isLoading,
    error,
    refreshJobs,
    successfulJobs,
    failedJobs
  };
}