import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ErrorProcessorService, 
  ScraperErrorType, 
  ErrorSeverity 
} from '@/lib/services/error-monitoring/error-processor.service';
import { ScraperErrorAlert } from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { ScrapeJob } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import styles from './dashboardAdmin.module.css';
import { formatRelativeTime } from '@/lib/helpers/formtRelativeTime';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faClock, 
  faUser, 
  faDatabase,
  faChartLine,
  faChartBar,
  faSync,
  faTrash,
  faExclamationTriangle,
  faShop
} from '@fortawesome/free-solid-svg-icons';

/**
 * Activity Item Types
 */
export type ActivityType = 'error' | 'success';

export interface ActivityData {
  type: ActivityType;
  id: string;
  sellerId: string;
  sellerName: string;
  timestamp: Date;
  
  // For errors
  errorMessage?: string;
  errorSource?: 'ACTIVITY' | 'JOB';
  jobId?: string;
  duration?: number;
  
  // For success jobs
  mode?: string;
  productsScraped?: number;
  productsSaved?: number;
  productsUpdated?: number;
  endTime?: Date;
}

interface ActivityItemProps {
  activity: ActivityData;
  isSelected?: boolean;
  showSelection?: boolean;
  onToggleSelection?: (id: string) => void;
  onRetry?: (activity: ActivityData) => void;
  onDelete?: (activity: ActivityData) => void;
  isDeleting?: boolean;
}

/**
 * Unified Activity Item Component
 * Renders both error and success activities with consistent styling
 */
export function ActivityItem({
  activity,
  isSelected = false,
  showSelection = false,
  onToggleSelection,
  onRetry,
  onDelete,
  isDeleting = false
}: ActivityItemProps) {
  const isError = activity.type === 'error';
  const isSuccess = activity.type === 'success';

  // Get error classification for errors
  const errorClassification = isError && activity.errorMessage 
    ? ErrorProcessorService.classifyError(activity.errorMessage)
    : null;

  /**
   * Handle item click (for selection)
   */
  const handleItemClick = () => {
    if (showSelection && onToggleSelection) {
      onToggleSelection(activity.id);
    }
  };
  /**
   * Handle retry click
   */
  const handleRetryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry) {
      onRetry(activity);
    }
  };

  /**
   * Handle delete click
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(activity);
    }
  };

  if (isSuccess) {
    // Success Activity Card
    return (
      <div className={`${styles.activityItem} ${styles.activityItemSuccess}`}>
        <div className={styles.activityItemHeader}>
          <div className={styles.activityItemStatus}>
            <FontAwesomeIcon icon={faCheckCircle} size='sm' />
            <span className="text-green-700 font-medium text-sm">SUCCESS</span>
          </div>
          <div className={styles.activityItemTimestamp}>
             <FontAwesomeIcon icon={faClock} size='sm' />
            <span className="text-xs text-gray-500">
              {activity.endTime ? new Date(activity.endTime).toLocaleString() : new Date(activity.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.activityItemContent}>
          <div className={styles.activityItemTitle}>
             <FontAwesomeIcon icon={faUser} size='sm' />
            <span className="font-medium text-gray-900">{activity.sellerName}</span>
            {activity.mode && (
              <span className={`${styles.activityBadge} ${styles.activityBadgeSuccess}`}>
                {activity.mode.toUpperCase()}
              </span>
            )}
          </div>

          <div className={styles.activityItemStats}>
            <div className={styles.activityStatItem}>
              <FontAwesomeIcon icon={faDatabase} className="text-blue-500" />
              <span className="text-xs text-gray-600">
                Scraped: {activity.productsScraped || 0}
              </span>
            </div>
            <div className={styles.activityStatItem}>
              <FontAwesomeIcon icon={faChartLine} className="text-green-500" />
              <span className="text-xs text-gray-600">
                Saved: {activity.productsSaved || 0}
              </span>
            </div>
            <div className={styles.activityStatItem}>
              <FontAwesomeIcon icon={faChartBar} className="text-orange-500" />
              <span className="text-xs text-gray-600">
                Updated: {activity.productsUpdated || 0}
              </span>
            </div>
            {activity.duration && (
              <div className={styles.activityStatItem}>
                <FontAwesomeIcon icon={faClock} className="text-purple-500" />
                <span className="text-xs text-gray-600">
                  Duration: {Math.round(activity.duration / 1000)}s
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.activityItemFooter}>
          <span className="text-xs text-gray-500">
            Job ID: {activity.jobId?.slice(-8) || activity.id.slice(-8)}
          </span>
          
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              {isDeleting ? (
                <FontAwesomeIcon icon={faSync} className="animate-spin mr-1" />
              ) : (
                <FontAwesomeIcon icon={faTrash} className="mr-1" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Error Activity Card
  return (
    <div 
      className={`${styles.activityItem} ${styles.activityItemError} ${
        isSelected ? styles.activityItemSelected : ''
      } ${showSelection ? styles.activityItemSelectable : ''}`}
      onClick={handleItemClick}
    >
      {/* Selection checkbox for errors */}
      {showSelection && (
        <div className={styles.activityItemSelection}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection && onToggleSelection(activity.id)}
            className={styles.activityCheckbox}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className={styles.activityItemHeader}>
        <div className={styles.activityItemInfo}>
          <div className={styles.activityItemType}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
            {errorClassification?.type || 'UNKNOWN_ERROR'}
          </div>
          <div className={styles.activityItemSeller}>
            <FontAwesomeIcon icon={faShop} className="mr-1" />
            seller: {activity.sellerName}
          </div>
        </div>
        
        <div className={`${styles.activityBadge} ${
          errorClassification?.severity === 'CRITICAL' ? styles.activityBadgeCritical :
          errorClassification?.severity === 'HIGH' ? styles.activityBadgeHigh :
          styles.activityBadgeMedium
        }`}>
          {errorClassification?.severity || 'UNKNOWN'}
        </div>
      </div>

      <div className={styles.activityItemContent}>
        <div className={styles.activityItemMessage}>
          {activity.errorMessage}
        </div>

        <div className={styles.activityItemMeta}>
          <div className={styles.activityMetaItem}>
            <FontAwesomeIcon icon={faClock} />
            <span>{formatRelativeTime(activity.timestamp)}</span>
          </div>
          <div className={styles.activityMetaItem}>
            <FontAwesomeIcon icon={faDatabase} />
            <span>Source: {activity.errorSource}</span>
          </div>
          {activity.jobId && (
            <div className={styles.activityMetaItem}>
              <span>Job: {activity.jobId}</span>
            </div>
          )}
          {activity.duration && (
            <div className={styles.activityMetaItem}>
              <span>Duration: {activity.duration}ms</span>
            </div>
          )}
        </div>

        {errorClassification?.recommendation && (
          <div className={styles.activityItemRecommendation}>
            <strong>💡 Recommendation:</strong> {errorClassification.recommendation.action}
            {errorClassification.recommendation.estimatedFixTime && (
              <span className={styles.activityRecommendationTime}>
                (Est. fix time: {errorClassification.recommendation.estimatedFixTime})
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.activityItemFooter}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {errorClassification?.recommendation.autoRetryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryClick}
                className={styles.activityRetryButton}
              >
                <FontAwesomeIcon icon={faSync} className="mr-1" />
                Retry
              </Button>
            )}
          </div>
          
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className={styles.activityDeleteButton}
            >
              {isDeleting ? (
                <FontAwesomeIcon icon={faSync} className="animate-spin mr-1" />
              ) : (
                <FontAwesomeIcon icon={faTrash} className="mr-1" />
              )}
              {/* {isDeleting ? 'Deleting...' : 'Delete'} */}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}