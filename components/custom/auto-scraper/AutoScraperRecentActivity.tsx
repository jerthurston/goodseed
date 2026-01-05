import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCheckCircle, faExclamationCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import { useFetchScrapeJobs } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperActivityItem {
  id: string;
  sellerId: string;
  sellerName: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: Date;
  productsScraped?: number;
  errorMessage?: string;
}

interface AutoScraperRecentActivityProps {
  // No props needed - component fetches its own data
}

export default function AutoScraperRecentActivity() {
  // Fetch recent scrape jobs from real API
  const { 
    jobs, 
    isLoading,
    error,
    successfulJobs,
    failedJobs 
  } = useFetchScrapeJobs({
    limit: 50, // Get more jobs to ensure we have recent ones
    timeframe: undefined, // No timeframe filter - get ALL jobs
  });

  // Handle error state
  if (error) {
    console.error('Error fetching scrape jobs:', error);
    return (
      <DashboardCard className={styles.card}>
        <DashboardCardHeader className={styles.cardHeader}>
          <h3 
            className="text-lg font-['Archivo_Black'] uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            Auto Scraper Activity
          </h3>
        </DashboardCardHeader>
        <div className={styles.cardBody}>
          <div className="text-center py-8">
            <FontAwesomeIcon
              icon={faExclamationCircle}
              className="text-2xl mb-3"
              style={{ color: 'var(--status-danger)' }}
            />
            <p 
              className="font-['Poppins']"
              style={{ color: 'var(--status-danger-text)' }}
            >
              Failed to load recent activity
            </p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  // Transform scrape jobs to activity items
  const transformJobToActivity = (job: any): AutoScraperActivityItem => {
    let status: 'running' | 'completed' | 'failed';
    
    // Map job status to display status
    switch (job.status) {
      case 'CREATED':
      case 'WAITING':
      case 'DELAYED':
      case 'ACTIVE':
        status = 'running';
        break;
      case 'COMPLETED':
        status = 'completed';
        break;
      case 'FAILED':
      case 'CANCELLED':
        status = 'failed';
        break;
      default:
        status = 'failed';
    }

    // Safely extract error message
    let errorMessage: string | undefined;
    if (status === 'failed') {
      if (typeof job.errorDetails === 'string') {
        errorMessage = job.errorDetails;
      } else if (job.errorDetails && typeof job.errorDetails === 'object') {
        errorMessage = JSON.stringify(job.errorDetails);
      } else {
        errorMessage = 'Scraping failed';
      }
    }

    // Safely parse timestamp - prefer endTime > updatedAt > createdAt
    let timestamp: Date;
    const endTime = job.endTime || job.completedAt;
    const updatedAt = job.updatedAt;
    const createdAt = job.createdAt;
    
    if (endTime) {
      timestamp = new Date(endTime);
    } else if (updatedAt) {
      timestamp = new Date(updatedAt);
    } else if (createdAt) {
      timestamp = new Date(createdAt);
    } else {
      timestamp = new Date(); // fallback to now
    }
    
    // Validate timestamp
    if (isNaN(timestamp.getTime())) {
      timestamp = new Date();
    }

    // Extract seller name from job data
    const sellerName = job.sellerName || 
                      (job as any).seller?.name || 
                      `Seller ${job.sellerId}` || 
                      'Unknown Seller';

    return {
      id: job.id || 'unknown',
      sellerId: job.sellerId || 'unknown',
      sellerName,
      status,
      timestamp,
      productsScraped: Number(job.productsSaved || job.productsScraped || 0) || undefined,
      errorMessage
    };
  };

  // Transform and sort activities by timestamp
  const activities: AutoScraperActivityItem[] = React.useMemo(() => {
    try {
      console.log('AutoScraperRecentActivity - Hook data:', { 
        jobsCount: jobs?.length, 
        isLoading, 
        error,
        jobs: jobs?.slice(0, 2) 
      });
      
      if (!jobs || !Array.isArray(jobs)) {
        console.log('AutoScraperRecentActivity - No jobs array available');
        return [];
      }

      if (jobs.length === 0) {
        console.log('AutoScraperRecentActivity - Jobs array is empty');
        return [];
      }

      // Debug: Log raw job data
      console.log('AutoScraperRecentActivity - Raw jobs data (first 3):', jobs.slice(0, 3).map(job => ({
        id: job.id,
        sellerName: job.sellerName,
        sellerId: job.sellerId,
        seller: (job as any).seller,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        endTime: job.endTime,
        status: job.status,
        mode: job.mode
      })));

      const transformed = jobs
        .map(transformJobToActivity)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5); // Show 5 most recent activities
        
      // Debug logging for transformation
      console.log('AutoScraperRecentActivity - Transformed activities:', transformed);
      console.log('AutoScraperRecentActivity - Activities count:', transformed.length);
      
      return transformed;
    } catch (error) {
      console.error('AutoScraperRecentActivity - Error transforming activities:', error);
      return [];
    }
  }, [jobs, isLoading, error]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return faSpinner;
      case 'completed':
        return faCheckCircle;
      case 'failed':
        return faExclamationCircle;
      default:
        return faClock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'var(--status-warning)';
      case 'completed':
        return 'var(--status-success)';
      case 'failed':
        return 'var(--status-danger)';
      default:
        return 'var(--text-primary-muted)';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    try {
      const now = new Date();
      const diffInMs = now.getTime() - timestamp.getTime();
      
      // If timestamp is in the future or invalid, return fallback
      if (diffInMs < 0 || isNaN(diffInMs)) {
        return 'Unknown time';
      }
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      // For older than 7 days, show date
      const weeks = Math.floor(diffInDays / 7);
      if (weeks < 4) return `${weeks}w ago`;
      
      // For very old dates, show actual date
      return timestamp.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };

  if (isLoading) {
    return (
      <DashboardCard className={`${styles.card} animate-pulse`}>
        <DashboardCardHeader className={styles.cardHeader}>
          <h3 className="text-lg font-['Archivo_Black']">Auto Scraper Activity</h3>
        </DashboardCardHeader>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className={styles.card}>
      <DashboardCardHeader className={styles.cardHeader}>
        <h3 
          className="text-lg font-['Archivo_Black'] uppercase tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          Auto Scraper Activity
        </h3>
        <div 
          className="text-sm font-['Poppins']"
          style={{ color: 'var(--text-primary-muted)' }}
        >
          Recent automated scraping jobs
        </div>
      </DashboardCardHeader>

      <div className={styles.cardBody}>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              {/* Status Icon */}
              <div className="shrink-0">
                <FontAwesomeIcon
                  icon={getStatusIcon(activity.status)}
                  className={`text-lg ${activity.status === 'running' ? 'animate-spin' : ''}`}
                  style={{ color: getStatusColor(activity.status) }}
                />
              </div>

              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 
                    className="text-sm font-semibold font-['Poppins'] truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {String(activity.sellerName || 'Unknown Seller')}
                  </h4>
                  <span 
                    className="text-xs font-['Poppins'] ml-2"
                    style={{ color: 'var(--text-primary-muted)' }}
                  >
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>

                <div className="mt-1">
                  {activity.status === 'running' && (
                    <p 
                      className="text-xs font-['Poppins']"
                      style={{ color: 'var(--status-warning-text)' }}
                    >
                      Auto scraping in progress...
                    </p>
                  )}
                  
                  {activity.status === 'completed' && activity.productsScraped && (
                    <p 
                      className="text-xs font-['Poppins']"
                      style={{ color: 'var(--status-success-text)' }}
                    >
                      Successfully scraped {String(activity.productsScraped)} products
                    </p>
                  )}
                  
                  {activity.status === 'failed' && activity.errorMessage && (
                    <p 
                      className="text-xs font-['Poppins']"
                      style={{ color: 'var(--status-danger-text)' }}
                    >
                      Failed: {String(activity.errorMessage).substring(0, 50)}
                      {String(activity.errorMessage).length > 50 ? '...' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <FontAwesomeIcon
                icon={faClock}
                className="text-2xl mb-3"
                style={{ color: 'var(--text-primary-muted)' }}
              />
              <p 
                className="font-['Poppins'] mb-2"
                style={{ color: 'var(--text-primary-muted)' }}
              >
                No recent auto scraper activity
              </p>
              <p 
                className="text-xs font-['Poppins']"
                style={{ color: 'var(--text-primary-muted)' }}
              >
                {jobs ? `Found ${jobs.length} total jobs` : 'No jobs data available'}
              </p>
              {error && (
                <p 
                  className="text-xs font-['Poppins'] mt-2"
                  style={{ color: 'var(--status-danger)' }}
                >
                  Error: {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}