import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

export interface ScrapeJob {
  id: string;
  jobId: string; // External job ID (cuid)
  sellerId: string;
  sellerName: string;
  status: 'CREATED' | 'WAITING' | 'DELAYED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  mode: 'manual' | 'batch' | 'auto' | 'test';
  
  // Progress tracking
  currentPage?: number | null;
  totalPages?: number | null;
  productsScraped: number;
  productsSaved: number;
  productsUpdated: number;
  errors: number;
  
  // Timing
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  duration?: number | null;
  
  // Error details
  errorMessage?: string | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Legacy fields for backward compatibility
  startTime?: Date;
  endTime?: Date;
}

export interface FetchScrapeJobsParams {
  status?: 'COMPLETED' | 'FAILED' | 'ALL';
  mode?: 'manual' | 'batch' | 'auto' | 'test' | 'ALL';
  sellerId?: string;
  limit?: number;
  timeframe?: number; // minutes
}

export interface ScrapeJobsResponse {
  success: boolean;
  jobs: ScrapeJob[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Scrape Jobs Service
 * Handles all API calls related to scrape jobs
 */
export class ScrapeJobService {
  
  /**
   * Fetch scrape jobs from API
   */
  static async fetchJobs(params: FetchScrapeJobsParams = {}): Promise<ScrapeJob[]> {
    try {
      const searchParams = new URLSearchParams();
      
      // Build query parameters
      if (params.status && params.status !== 'ALL') {
        searchParams.append('status', params.status);
      }
      
      if (params.mode && params.mode !== 'ALL') {
        searchParams.append('mode', params.mode);
      }
      
      if (params.sellerId) {
        searchParams.append('sellerId', params.sellerId);
      }
      
      if (params.limit) {
        searchParams.append('limit', params.limit.toString());
      }

      apiLogger.debug('[Scrape-job-service] Fetching jobs', { params });

      // Make API call
      const response = await api.get<ScrapeJobsResponse>(
        `/admin/scraper/scrape-job?${searchParams.toString()}`
      );

      apiLogger.debug('[Scrape-job-service] response get scrape jobs', { response });
      
      let jobs = response.data.jobs || [];
      
      // Filter by timeframe if specified (client-side filtering)
      if (params.timeframe) {
        const cutoffTime = new Date(Date.now() - params.timeframe * 60 * 1000);
        jobs = jobs.filter((job: ScrapeJob) => 
          new Date(job.updatedAt) > cutoffTime
        );
      }

      apiLogger.info('[ScrapeJobService] Jobs fetched successfully', {
        count: jobs.length,
        originalCount: response.data.jobs?.length || 0,
        ...params
      });

      return jobs;

    } catch (error) {
      apiLogger.logError('[ScrapeJobService] Failed to fetch jobs', error as Error, { params });
      throw error;
    }
  }

  /**
   * Get specific scrape job by ID
   */
  static async getJobById(jobId: string): Promise<ScrapeJob> {
    try {
      const response = await api.get<{ success: boolean; job: ScrapeJob }>(
        `/admin/scraper/scrape-job/${jobId}`
      );
      
      apiLogger.info('[ScrapeJobService] Job fetched by ID', { jobId });
      return response.data.job;

    } catch (error) {
      apiLogger.logError('[ScrapeJobService] Failed to fetch job by ID', error as Error, { jobId });
      throw error;
    }
  }

  /**
   * Cancel a running scrape job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      await api.post(`/admin/scraper/scrape-job/${jobId}/cancel`);
      
      apiLogger.info('[ScrapeJobService] Job cancelled', { jobId });
      return true;

    } catch (error) {
      apiLogger.logError('[ScrapeJobService] Failed to cancel job', error as Error, { jobId });
      throw error;
    }
  }

  /**
   * Retry a failed scrape job
   */
  static async retryJob(jobId: string): Promise<{ newJobId: string }> {
    try {
      const response = await api.post<{ success: boolean; newJobId: string }>(
        `/admin/scraper/scrape-job/${jobId}/retry`
      );
      
      apiLogger.info('[ScrapeJobService] Job retried', { 
        originalJobId: jobId, 
        newJobId: response.data.newJobId 
      });
      
      return { newJobId: response.data.newJobId };

    } catch (error) {
      apiLogger.logError('[ScrapeJobService] Failed to retry job', error as Error, { jobId });
      throw error;
    }
  }

  /**
   * Delete a scrape job
   */
  static async deleteJob(jobId: string): Promise<boolean> {
    try {
      await api.delete(`/admin/scraper/scrape-job/${jobId}`);
      
      apiLogger.info('[ScrapeJobService] Job deleted', { jobId });
      return true;

    } catch (error) {
      apiLogger.logError('[ScrapeJobService] Failed to delete job', error as Error, { jobId });
      throw error;
    }
  }

  /**
   * Get job statistics for a seller
   */
  static async getJobStats(sellerId?: string, timeframe?: number): Promise<{
    total: number;
    completed: number;
    failed: number;
    active: number;
    successRate: number;
  }> {
    try {
      const searchParams = new URLSearchParams();
      
      if (sellerId) {
        searchParams.append('sellerId', sellerId);
      }
      
      if (timeframe) {
        searchParams.append('timeframe', timeframe.toString());
      }

      const response = await api.get<{ 
        success: boolean; 
        stats: {
          total: number;
          completed: number;
          failed: number;
          active: number;
          successRate: number;
        }
      }>(`/admin/scraper/scrape-job/stats?${searchParams.toString()}`);
      
      apiLogger.info('[ScrapeJobService] Job stats fetched', { sellerId, timeframe });
      return response.data.stats;

    } catch (error) {
      apiLogger.logError('[ScrapeJobService] Failed to fetch job stats', error as Error, { 
        sellerId, 
        timeframe 
      });
      throw error;
    }
  }

  /**
   * Classify jobs into successful and failed based on business logic
   */
  static classifyJobs(jobs: ScrapeJob[]): {
    successfulJobs: ScrapeJob[];
    failedJobs: ScrapeJob[];
  } {
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

    return { successfulJobs, failedJobs };
  }
}