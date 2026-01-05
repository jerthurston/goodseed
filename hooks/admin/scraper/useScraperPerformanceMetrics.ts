'use client';

import { useQuery } from '@tanstack/react-query';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ScrapeJobService, type ScrapeJob } from '@/lib/services/scrape-job/scrape-job.service';

export interface PerformanceMetric {
  label: string;
  value: string;
  trend: {
    value: string;
    isPositive: boolean;
    isNeutral?: boolean;
  };
  color: string;
}

interface PerformanceData {
  avgScrapeTimeMinutes: number;
  successRate: number;
  productsPerHour: number;
  errorRate: number;
  totalJobs: number;
}

interface TrendData {
  current: PerformanceData;
  previous: PerformanceData;
}

export function useScraperPerformanceMetrics(timeframe: string = '24h') {
  return useQuery({
    queryKey: ['scraperPerformanceMetrics', timeframe],
    queryFn: async (): Promise<PerformanceMetric[]> => {
      try {
        apiLogger.info('useScraperPerformanceMetrics - Starting fetch...', { timeframe });
        
        // Convert timeframe to minutes - use larger window for testing
        const timeframeMinutes = timeframe === '24h' ? 48 * 60 : 7 * 24 * 60; // 48h instead of 24h

        apiLogger.info('useScraperPerformanceMetrics - Fetching current jobs...', { timeframeMinutes });
        
        // Get current period data (last 24h)
        const currentJobs = await ScrapeJobService.fetchJobs({
          limit: 1000,
          timeframe: timeframeMinutes
        });

        apiLogger.info('useScraperPerformanceMetrics - Current jobs fetched:', { 
          count: currentJobs.length,
          jobs: currentJobs.slice(0, 3) // Show first 3 jobs
        });

        // Get previous period data for trend comparison
        const previousTimeframe = timeframe === '24h' ? 48 * 60 : 14 * 24 * 60;
        const previousJobs = await ScrapeJobService.fetchJobs({
          limit: 1000,
          timeframe: previousTimeframe
        });

        apiLogger.info('useScraperPerformanceMetrics - Previous jobs fetched:', { 
          count: previousJobs.length 
        });

        const currentData = calculatePerformanceData(currentJobs);
        apiLogger.info(`useScraperPerformanceMetrics - Current data calculated: + ${currentData}`);
        
        const previousData = calculatePerformanceData(
          previousJobs.filter((job: ScrapeJob) => {
            const jobDate = new Date(job.createdAt);
            const cutoff = new Date();
            cutoff.setHours(cutoff.getHours() - (timeframe === '24h' ? 24 : 168));
            return jobDate < cutoff;
          })
        );

        apiLogger.info(`useScraperPerformanceMetrics - Previous data calculated: + ${previousData}`);

        const metrics = buildMetricsWithTrends({ current: currentData, previous: previousData });
        apiLogger.info(`useScraperPerformanceMetrics - Final metrics: + ${metrics}`);

        return metrics;
      } catch (error) {
        apiLogger.logError('Failed to fetch scraper performance metrics', error as Error, { timeframe });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: true, // Force refetch on focus . Giải thích chi tiết refetchOnWindowFocus: Khi người dùng quay lại tab trình duyệt, dữ liệu sẽ được làm mới để đảm bảo thông tin hiển thị là mới nhất.
  });
}

function calculatePerformanceData(jobs: ScrapeJob[]): PerformanceData {
  apiLogger.info('calculatePerformanceData - Input jobs:', { 
    totalJobs: jobs.length,
    firstFewJobs: jobs.slice(0, 3)
  });

  if (jobs.length === 0) {
    apiLogger.info('calculatePerformanceData - No jobs found, returning zeros');
    return {
      avgScrapeTimeMinutes: 0,
      successRate: 0,
      productsPerHour: 0,
      errorRate: 0,
      totalJobs: 0
    };
  }

  const completedJobs = jobs.filter(job => job.status === 'COMPLETED');
  const failedJobs = jobs.filter(job => job.status === 'FAILED');
  const successfulJobs = jobs.filter(job => job.status === 'COMPLETED' && !job.errorMessage);

  // Include more job types for metrics calculation
  const activeJobs = jobs.filter(job => job.status === 'ACTIVE');
  const testJobs = jobs.filter(job => job.mode === 'test');
  const createdJobs = jobs.filter(job => job.status === 'CREATED');
  const allProcessedJobs = jobs.filter(job => ['COMPLETED', 'FAILED', 'ACTIVE'].includes(job.status));

  apiLogger.info('calculatePerformanceData - Job categories:', {
    completed: completedJobs.length,
    failed: failedJobs.length,
    successful: successfulJobs.length,
    test: testJobs.length,
    active: activeJobs.length,
    created: createdJobs.length,
    allProcessed: allProcessedJobs.length,
    statuses: jobs.map(j => `${j.status}(${j.mode})`),
    modes: [...new Set(jobs.map(j => j.mode))]
  });

  // Calculate average scrape time for completed jobs (using start/end times)
  const jobsWithTiming = completedJobs.filter(job => job.startTime && job.endTime);
  
  // Also check if we have duration field
  const jobsWithDuration = completedJobs.filter(job => job.duration && job.duration > 0);
  
  apiLogger.info('calculatePerformanceData - Jobs with timing:', {
    withStartEnd: jobsWithTiming.length,
    withDuration: jobsWithDuration.length,
    sampleTiming: jobsWithTiming.slice(0, 2).map(j => ({
      id: j.id,
      startTime: j.startTime,
      endTime: j.endTime
    })),
    sampleDuration: jobsWithDuration.slice(0, 2).map(j => ({
      id: j.id,
      duration: j.duration
    }))
  });

  // Calculate average scrape time - try both methods
  let avgScrapeTime = 0;
  
  if (jobsWithTiming.length > 0) {
    // Method 1: Calculate from start/end times
    avgScrapeTime = jobsWithTiming.reduce((sum, job) => {
      const duration = new Date(job.endTime!).getTime() - new Date(job.startTime!).getTime();
      const durationMinutes = duration / (1000 * 60);
      return sum + durationMinutes;
    }, 0) / jobsWithTiming.length;
  } else if (jobsWithDuration.length > 0) {
    // Method 2: Use duration field (assuming it's in seconds)
    avgScrapeTime = jobsWithDuration.reduce((sum, job) => {
      return sum + (job.duration! / 60); // Convert seconds to minutes
    }, 0) / jobsWithDuration.length;
  }

  // Calculate success rate based on all processed jobs
  const successRate = allProcessedJobs.length > 0 
    ? (successfulJobs.length / allProcessedJobs.length) * 100
    : 0;

  // Calculate error rate based on all processed jobs
  const errorRate = allProcessedJobs.length > 0 
    ? (failedJobs.length / allProcessedJobs.length) * 100
    : 0;

  // Calculate products per hour based on actual scraped data
  const totalProductsScraped = [...successfulJobs, ...activeJobs].reduce((sum, job) => {
    return sum + (job.productsScraped || 0);
  }, 0);
  const totalHours = 48; // for 48h timeframe we're using
  const productsPerHour = totalProductsScraped / totalHours;

  const result = {
    avgScrapeTimeMinutes: avgScrapeTime,
    successRate,
    productsPerHour,
    errorRate,
    totalJobs: jobs.length
  };

  apiLogger.info('calculatePerformanceData - Final calculations:', {
    result,
    totalProductsScraped,
    avgScrapeTime,
    timingMethod: jobsWithTiming.length > 0 ? 'startEnd' : jobsWithDuration.length > 0 ? 'duration' : 'none',
    jobsWithTimingCount: jobsWithTiming.length,
    jobsWithDurationCount: jobsWithDuration.length,
    allProcessedCount: allProcessedJobs.length
  });

  return result;
}

function buildMetricsWithTrends({ current, previous }: TrendData): PerformanceMetric[] {
  const calculateTrend = (currentValue: number, previousValue: number, isLowerBetter = false) => {
    if (previousValue === 0) {
      return { value: '0%', isPositive: true, isNeutral: true };
    }
    
    const change = ((currentValue - previousValue) / previousValue) * 100;
    const isPositive = isLowerBetter ? change < 0 : change > 0;
    
    return {
      value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      isPositive,
      isNeutral: Math.abs(change) < 0.5
    };
  };

  return [
    {
      label: 'Avg Scrape Time',
      value: `${current.avgScrapeTimeMinutes.toFixed(1)}m`,
      trend: calculateTrend(current.avgScrapeTimeMinutes, previous.avgScrapeTimeMinutes, true),
      color: 'var(--brand-primary)'
    },
    {
      label: 'Success Rate',
      value: `${current.successRate.toFixed(1)}%`,
      trend: calculateTrend(current.successRate, previous.successRate),
      color: 'var(--status-success)'
    },
    {
      label: 'Products/Hour',
      value: Math.round(current.productsPerHour).toString(),
      trend: calculateTrend(current.productsPerHour, previous.productsPerHour),
      color: 'var(--brand-secondary)'
    },
    {
      label: 'Error Rate',
      value: `${current.errorRate.toFixed(1)}%`,
      trend: calculateTrend(current.errorRate, previous.errorRate, true),
      color: 'var(--status-warning)'
    }
  ];
}