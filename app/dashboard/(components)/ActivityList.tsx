import React from 'react';
import { ActivityItem, ActivityData, ActivityType } from './ActivityItem';
import { ScraperErrorAlert } from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { ScrapeJob } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import styles from './dashboardAdmin.module.css';

interface ActivityListProps {
  // Data sources
  errors?: ScraperErrorAlert[];
  successJobs?: ScrapeJob[];
  
  // View configuration
  view: 'all' | 'errors' | 'success';
  
  // Selection
  selectedErrors?: Set<string>;
  selectedJobs?: Set<string>;
  onToggleErrorSelection?: (errorId: string) => void;
  onToggleJobSelection?: (jobId: string) => void;
  
  // Actions
  onRetryError?: (activity: ActivityData) => void;
  onDeleteJob?: (activity: ActivityData) => void;
  isDeletingJob?: boolean;
}

/**
 * Unified Activity List Component
 * Renders activities based on view type with consistent styling
 */
export function ActivityList({
  errors = [],
  successJobs = [],
  view,
  selectedErrors = new Set(),
  selectedJobs = new Set(),
  onToggleErrorSelection,
  onToggleJobSelection,
  onRetryError,
  onDeleteJob,
  isDeletingJob = false
}: ActivityListProps) {
  
  /**
   * Convert ScraperErrorAlert to ActivityData
   */
  const convertErrorToActivity = (error: ScraperErrorAlert): ActivityData => ({
    type: 'error' as ActivityType,
    id: error.id,
    sellerId: error.sellerId,
    sellerName: error.sellerName,
    timestamp: new Date(error.timestamp), // Ensure Date object
    errorMessage: error.errorMessage,
    errorSource: error.errorSource,
    jobId: error.jobId,
    duration: error.duration || undefined
  });

  /**
   * Convert ScrapeJob to ActivityData
   */
  const convertJobToActivity = (job: ScrapeJob): ActivityData => ({
    type: 'success' as ActivityType,
    id: job.id,
    sellerId: job.sellerId,
    sellerName: job.sellerName,
    timestamp: new Date(job.endTime || job.updatedAt), // Ensure Date object
    mode: job.mode,
    productsScraped: job.productsScraped,
    productsSaved: job.productsSaved,
    productsUpdated: job.productsUpdated,
    endTime: job.endTime ? new Date(job.endTime) : undefined,
    jobId: job.id
  });

  /**
   * Get activities based on view
   */
  const getActivities = (): ActivityData[] => {
    switch (view) {
      case 'errors':
        return errors.map(convertErrorToActivity);
      
      case 'success':
        return successJobs.map(convertJobToActivity);
      
      case 'all':
      default:
        const errorActivities = errors.map(convertErrorToActivity);
        const successActivities = successJobs.map(convertJobToActivity);
        
        // Combine and sort by timestamp (newest first)
        const allActivities = [...errorActivities, ...successActivities];
        return allActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }
  };

  const activities = getActivities();

  if (activities.length === 0) {
    return (
      <div className={styles.errorEmptyState}>
        <div className="h-12 w-12 mx-auto mb-4 text-gray-400">
          {view === 'errors' ? '🚨' : view === 'success' ? '✅' : '📊'}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {view === 'errors' ? 'No Errors Found' : 
           view === 'success' ? 'No Successful Jobs Found' :
           'No Activity Found'}
        </h3>
        <p className="text-gray-600">
          {view === 'errors' ? 'All scrapers are running smoothly! 🎉' : 
           view === 'success' ? 'No completed scraping jobs found in the selected timeframe.' :
           'No scraping activity found in the selected timeframe.'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.activityList}>
      {activities.map((activity) => {
        const isErrorSelected = activity.type === 'error' && selectedErrors.has(activity.id);
        const isJobSelected = activity.type === 'success' && selectedJobs.has(activity.id);
        const showErrorSelection = activity.type === 'error' && view !== 'success';
        const showJobSelection = activity.type === 'success' && view !== 'errors';
        
        return (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isSelected={isErrorSelected || isJobSelected}
            showSelection={showErrorSelection || showJobSelection}
            onToggleSelection={activity.type === 'error' ? onToggleErrorSelection : onToggleJobSelection}
            onRetry={onRetryError}
            onDelete={onDeleteJob}
            isDeleting={isDeletingJob}
          />
        );
      })}
    </div>
  );
}