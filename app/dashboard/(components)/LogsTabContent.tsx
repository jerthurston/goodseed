'use client'

import { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Filter, 
  Search, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  User,
  Database,
  BarChart3,
  Download,
  CheckCircle2,
  X,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  useScraperErrorMonitor, 
  ScraperErrorAlert 
} from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { useFetchScrapeJobs } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import { useDeleteScrapeJob } from '@/hooks/admin/scrape-job/useDeleteScrapeJob';
import { 
  ErrorProcessorService, 
  ScraperErrorType, 
  ErrorSeverity 
} from '@/lib/services/error-monitoring/error-processor.service';
import { useScraperOperations } from '@/hooks/scraper-site/useScraperOperations';
import { apiLogger } from '@/lib/helpers/api-logger';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import { ActivityList } from '@/app/dashboard/(components)/ActivityList';
import { ActivityData } from '@/app/dashboard/(components)/ActivityItem';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faToolbox } from '@fortawesome/free-solid-svg-icons';

/**
 * Error Filter State
 */
interface ErrorFilters {
  search: string;
  errorType: ScraperErrorType | 'ALL';
  severity: ErrorSeverity | 'ALL';
  errorSource: 'ACTIVITY' | 'JOB' | 'ALL';
  timeframe: 15 | 30 | 60 | 120; // minutes
  sellerId: string | 'ALL';
}

/**
 * Error Alert Tab Content Props
 */
interface LogsTabContentProps {
  sellers: Array<{ id: string; name: string }>;
  onRefreshData?: () => void;
}

/**
 * Dedicated Error Alert Tab Component
 * Comprehensive error monitoring and management interface
 */
export function LogsTabContent({ 
  sellers, 
  onRefreshData 
}: LogsTabContentProps) {
  const [filters, setFilters] = useState<ErrorFilters>({
    search: '',
    errorType: 'ALL',
    severity: 'ALL',
    errorSource: 'ALL',
    timeframe: 30,
    sellerId: 'ALL'
  });

  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState<'all' | 'errors' | 'success'>('all');

  // Monitor errors với current filters
  const {
    errors,
    summary,
    isLoading,
    hasErrors,
    criticalErrorCount,
    refreshErrors
  } = useScraperErrorMonitor({
    timeframe: filters.timeframe,
    severity: filters.severity === 'ALL' ? 'all' : filters.severity.toLowerCase() as any,
    limit: 50 // Show more errors in dedicated tab
  });

  // Monitor scrape jobs (successful and failed)
  const {
    jobs: allJobs,
    successfulJobs,
    failedJobs,
    isLoading: jobsLoading,
    error: jobsError,
    refreshJobs
  } = useFetchScrapeJobs({
    timeframe: filters.timeframe,
    limit: 50
  });

  // Scraper operations for retry functionality
  const { useTriggerScrape } = useScraperOperations(refreshErrors);

  // Delete job functionality
  const { deleteJob, isDeletingJob, deleteError, reset: resetDeleteError } = useDeleteScrapeJob();

  // Convert failed jobs to error alerts for unified display
  // This includes jobs that are "COMPLETED" but failed to save any products (saved: 0, updated: 0)
  const jobErrors = useMemo(() => {
    if (!failedJobs) return [];

    return failedJobs.map(job => ({
      id: `job-${job.id}`,
      sellerId: job.seller.id,
      sellerName: job.seller.name,
      timestamp: job.endTime || job.updatedAt,
      errorMessage: job.errorMessage || 
        (job.status === 'COMPLETED' && job.productsSaved === 0 && job.productsUpdated === 0
          ? `Job completed but failed to save products. Scraped: ${job.productsScraped}, Saved: 0, Updated: 0`
          : `Job failed with status: ${job.status}`
        ),
      errorSource: 'JOB' as const,
      jobId: job.id,
      duration: job.duration,
      productsScraped: job.productsScraped,
      productsSaved: job.productsSaved,
      productsUpdated: job.productsUpdated
    }));
  }, [failedJobs]);

  // Combine regular errors with job errors
  const allErrors = useMemo(() => {
    return [...(errors || []), ...jobErrors];
  }, [errors, jobErrors]);

  // Filtered errors based on current filters (now includes job errors)
  const filteredErrors = useMemo(() => {
    if (!allErrors) return [];

    return allErrors.filter(error => {
      // Text search
      if (filters.search && !error.errorMessage.toLowerCase().includes(filters.search.toLowerCase()) 
          && !error.sellerName.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Error type filter
      if (filters.errorType !== 'ALL') {
        const classification = ErrorProcessorService.classifyError(error.errorMessage);
        if (classification.type !== filters.errorType) return false;
      }

      // Severity filter
      if (filters.severity !== 'ALL') {
        const classification = ErrorProcessorService.classifyError(error.errorMessage);
        if (classification.severity !== filters.severity) return false;
      }

      // Error source filter
      if (filters.errorSource !== 'ALL' && error.errorSource !== filters.errorSource) {
        return false;
      }

      // Seller filter
      if (filters.sellerId !== 'ALL' && error.sellerId !== filters.sellerId) {
        return false;
      }

      return true;
    });
  }, [allErrors, filters]);


  /**
   * Handle filter updates
   */
  const updateFilter = <K extends keyof ErrorFilters>(key: K, value: ErrorFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Handle retry single error/activity
   */
  const handleRetryActivity = async (activity: ActivityData) => {
    try {
      await useTriggerScrape(activity.sellerId, {});
      toast.success(`Retry initiated for ${activity.sellerName}`);
      
      // Remove from selection if it was selected (for errors)
      if (activity.type === 'error') {
        setSelectedErrors(prev => {
          const newSet = new Set(prev);
          newSet.delete(activity.id);
          return newSet;
        });
      }
      
    } catch (err) {
      toast.error('Failed to retry scraper');
      apiLogger.logError('[ErrorAlertTab] Retry failed', err as Error, { 
        activityId: activity.id,
        sellerId: activity.sellerId 
      });
    }
  };

  /**
   * Handle delete single job/activity
   */
  const handleDeleteActivity = async (activity: ActivityData) => {
    // Need jobId to delete - works for both error and success jobs
    const jobId = activity.jobId || activity.id;
    
    if (!jobId) {
      toast.error('Cannot delete: Job ID not found');
      return;
    }

    try {
      // Reset any previous delete errors
      resetDeleteError();
      
      await deleteJob(jobId);
      toast.success(`Job deleted successfully for ${activity.sellerName}`);
      
      apiLogger.info('[LogsTabContent] Job deleted', { 
        activityId: activity.id,
        jobId: jobId,
        sellerId: activity.sellerId,
        sellerName: activity.sellerName,
        activityType: activity.type
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job';
      toast.error(errorMessage);
      
      apiLogger.logError('[LogsTabContent] Delete job failed', err as Error, { 
        activityId: activity.id,
        jobId: jobId,
        sellerId: activity.sellerId,
        activityType: activity.type
      });
    }
  };

  /**
   * Handle bulk delete jobs
   */
  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;

    const selectedJobList = successfulJobs.filter(job => selectedJobs.has(job.id));
    
    if (selectedJobList.length === 0) {
      toast.error('No jobs selected for deletion');
      return;
    }

    try {
      // Reset any previous delete errors
      resetDeleteError();
      
      // Delete jobs in parallel with Promise.allSettled to handle partial failures
      const deletePromises = selectedJobList.map(async (job) => {
        try {
          await deleteJob(job.id);
          return { success: true, jobId: job.id, sellerName: job.seller.name };
        } catch (error) {
          apiLogger.logError('[LogsTabContent] Bulk delete individual job failed', error as Error, { 
            jobId: job.id,
            sellerName: job.seller.name 
          });
          return { success: false, jobId: job.id, sellerName: job.seller.name, error };
        }
      });

      const results = await Promise.allSettled(deletePromises);
      
      // Process results
      const successful = results
        .filter((result): result is PromiseFulfilledResult<{ success: true; jobId: string; sellerName: string }> => 
          result.status === 'fulfilled' && result.value.success
        )
        .map(result => result.value);
      
      const failed = results
        .filter(result => 
          result.status === 'rejected' || 
          (result.status === 'fulfilled' && !result.value.success)
        );

      // Show results
      if (successful.length > 0) {
        toast.success(`Successfully deleted ${successful.length} job(s)`);
        setSelectedJobs(new Set()); // Clear selection
      }
      
      if (failed.length > 0) {
        toast.error(`Failed to delete ${failed.length} job(s)`);
      }

      apiLogger.info('[LogsTabContent] Bulk delete completed', {
        total: selectedJobList.length,
        successful: successful.length,
        failed: failed.length,
        selectedJobIds: Array.from(selectedJobs)
      });
      
    } catch (error) {
      toast.error('Bulk delete operation failed');
      apiLogger.logError('[LogsTabContent] Bulk delete failed', error as Error, {
        selectedJobsCount: selectedJobs.size
      });
    }
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      search: '',
      errorType: 'ALL',
      severity: 'ALL',
      errorSource: 'ALL',
      timeframe: 30,
      sellerId: 'ALL'
    });
  };

  /**
   * Toggle error selection
   */
  const toggleErrorSelection = (errorId: string) => {
    setSelectedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  /**
   * Select all visible errors
   */
  const selectAllErrors = () => {
    setSelectedErrors(new Set(filteredErrors.map(error => error.id)));
  };

  /**
   * Toggle job selection (for success jobs)
   */
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  /**
   * Select all visible success jobs
   */
  const selectAllJobs = () => {
    setSelectedJobs(new Set(successfulJobs.map(job => job.id)));
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={styles.errorHeader}>
        <h2 className={styles.errorTitle}>
          Activity Monitoring
        </h2>
        <p className={styles.errorSubtitle}>
          Comprehensive monitoring dashboard for errors and successful operations
        </p>
      </div>



      {/* Main Content Area */}
      <div className={styles.errorCardContainer}>
        {/* View Toggle */}
        <div className={styles.errorCardHeader}>
          {/* Heading */}
          <h3 className={styles.errorListTitle}>
            {currentView === 'all' ? 'All Activities' : 
             currentView === 'errors' ? 'Error Details' : 'Success Details'} 
            ({currentView === 'errors' ? filteredErrors.length : 
              currentView === 'success' ? successfulJobs.length :
              currentView === 'all' ? `${filteredErrors.length + successfulJobs.length} alert` : '0'})
          </h3>

          {/* Buttons: All, error, success, filter */}
          <div className={styles.errorViewToggle}>
            <div className={styles.errorViewToggleTabs}>
              {/* All Tab */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('all')}
                className={`${styles.errorViewToggleButton} ${
                  currentView === 'all' ? styles.errorViewToggleButtonActive : ''
                }`}
              >
                <Database className="h-4 w-4" />
                All
              </Button>

              {/* Error Tab */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('errors')}
                className={`${styles.errorViewToggleButton} ${
                  currentView === 'errors' ? styles.errorViewToggleButtonActive : ''
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Errors
              </Button>

              {/* Success Tab */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('success')}
                className={`${styles.errorViewToggleButton} ${
                  currentView === 'success' ? styles.errorViewToggleButtonActive : ''
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Success
              </Button>
            </div>
            
            {/* filter btn */}
            <div className={styles.errorViewToggleActions}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className={styles.errorFilterButton}
              >
                <FontAwesomeIcon icon={faToolbox} />
                {/* Filters */}
                {Object.values(filters).some(v => v !== 'ALL' && v !== 30 && v !== '') && (
                  <span className={styles.errorActiveFilterBadge}>
                    Active
                  </span>
                )}
              </Button>
            </div>

          </div>
        </div>

        {/* Bulk Actions Bar - For errors view with selections */}
        {currentView !== 'success' && selectedErrors.size > 0 && (
          <div className={styles.errorBulkActionBar}>
            <div className={styles.errorBulkActionInfo}>
              <span className={styles.errorBulkActionCount}>
                {selectedErrors.size} error(s) selected
              </span>
            </div>
            <div className={`${styles.errorBulkActionButtons} flex flex-row items-center gap-2 my-2 mb-4 `}>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllErrors}
                className={styles.errorBulkActionButton}
              >
                Select All ({filteredErrors.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedErrors(new Set())}
                className={styles.errorBulkActionButton}
              >
                Clear Selection
              </Button>
             
            </div>
          </div>
        )}

        {/* Bulk Actions Bar - For success jobs with selections */}
        {currentView !== 'errors' && selectedJobs.size > 0 && (
          <div className={styles.errorBulkActionBar}>
            <div className={styles.errorBulkActionInfo}>
              <span className={styles.errorBulkActionCount}>
                {selectedJobs.size} job(s) selected
              </span>
            </div>
            <div className={styles.errorBulkActionButtons}>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllJobs}
                className={styles.errorBulkActionButton}
              >
                Select All ({successfulJobs.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedJobs(new Set())}
                className={styles.errorBulkActionButton}
              >
                Clear Selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeletingJob}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingJob ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                {isDeletingJob ? 'Deleting...' : `Delete Selected (${selectedJobs.size})`}
              </Button>
            </div>
          </div>
        )}

        {/* Main Content - Unified Activity Display */}
        {(isLoading || jobsLoading) ? (
          <div className={styles.errorLoadingState}>
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading data...</p>
          </div>
        ) : (
          <ActivityList
            errors={filteredErrors}
            successJobs={successfulJobs}
            view={currentView}
            selectedErrors={selectedErrors}
            selectedJobs={selectedJobs}
            onToggleErrorSelection={toggleErrorSelection}
            onToggleJobSelection={toggleJobSelection}
            onRetryError={handleRetryActivity}
            onDeleteJob={handleDeleteActivity}
            isDeletingJob={isDeletingJob}
          />
        )}
      </div>

      {/* Filter Popup Modal */}
      {showFilters && (
        <div className={styles.modalOverlay} onClick={() => setShowFilters(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Filter Options</h3>
              <button
                onClick={() => setShowFilters(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.errorFiltersGrid}>
                {/* Error Type Filter */}
                <div className={styles.errorFilterItem}>
                  <label className={styles.errorFilterLabel}>Error Type</label>
                  <select
                    value={filters.errorType}
                    onChange={(e) => updateFilter('errorType', e.target.value as ScraperErrorType | 'ALL')}
                    className={styles.errorFilterSelect}
                  >
                    <option value="ALL">All Types</option>
                    {Object.values(ScraperErrorType).map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity Filter */}
                <div className={styles.errorFilterItem}>
                  <label className={styles.errorFilterLabel}>Severity</label>
                  <select
                    value={filters.severity}
                    onChange={(e) => updateFilter('severity', e.target.value as ErrorSeverity | 'ALL')}
                    className={styles.errorFilterSelect}
                  >
                    <option value="ALL">All Severities</option>
                    {Object.values(ErrorSeverity).map(severity => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Filter */}
                <div className={styles.errorFilterItem}>
                  <label className={styles.errorFilterLabel}>Source</label>
                  <select
                    value={filters.errorSource}
                    onChange={(e) => updateFilter('errorSource', e.target.value as 'ACTIVITY' | 'JOB' | 'ALL')}
                    className={styles.errorFilterSelect}
                  >
                    <option value="ALL">All Sources</option>
                    <option value="ACTIVITY">Activity Logs</option>
                    <option value="JOB">Job Logs</option>
                  </select>
                </div>

                {/* Seller Filter */}
                <div className={styles.errorFilterItem}>
                  <label className={styles.errorFilterLabel}>Seller</label>
                  <select
                    value={filters.sellerId}
                    onChange={(e) => updateFilter('sellerId', e.target.value)}
                    className={styles.errorFilterSelect}
                  >
                    <option value="ALL">All Sellers</option>
                    {sellers.map(seller => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Range Filter */}
                <div className={styles.errorFilterItem}>
                  <label className={styles.errorFilterLabel}>Time Range</label>
                  <select
                    value={filters.timeframe}
                    onChange={(e) => updateFilter('timeframe', Number(e.target.value) as 15 | 30 | 60 | 120)}
                    className={styles.errorFilterSelect}
                  >
                    <option value={15}>Last 15 minutes</option>
                    <option value={30}>Last 30 minutes</option>
                    <option value={60}>Last hour</option>
                    <option value={120}>Last 2 hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                variant="outline"
                onClick={clearFilters}
                className={styles.errorFilterActionButton}
              >
                Clear Filters
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(false)}
                className={styles.errorFilterActionButton}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}