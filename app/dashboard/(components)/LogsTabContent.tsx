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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  useScraperErrorMonitor, 
  ScraperErrorAlert 
} from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { useScrapJobs } from '@/hooks/admin/useScrapJobs';
import { 
  ErrorProcessorService, 
  ScraperErrorType, 
  ErrorSeverity 
} from '@/lib/services/error-monitoring/error-processor.service';
import { useScraperOperations } from '@/hooks/scraper-site/useScraperOperations';
import { apiLogger } from '@/lib/helpers/api-logger';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
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
  } = useScrapJobs({
    timeframe: filters.timeframe,
    limit: 50
  });

  // Scraper operations for retry functionality
  const { triggerManualScrape } = useScraperOperations(refreshErrors);

  // Filtered errors based on current filters
  const filteredErrors = useMemo(() => {
    if (!errors) return [];

    return errors.filter(error => {
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
  }, [errors, filters]);

  // Error statistics
  const errorStats = useMemo(() => {
    if (!filteredErrors.length) return null;

    const byType = filteredErrors.reduce((acc, error) => {
      const classification = ErrorProcessorService.classifyError(error.errorMessage);
      acc[classification.type] = (acc[classification.type] || 0) + 1;
      return acc;
    }, {} as Record<ScraperErrorType, number>);

    const bySeverity = filteredErrors.reduce((acc, error) => {
      const classification = ErrorProcessorService.classifyError(error.errorMessage);
      acc[classification.severity] = (acc[classification.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const bySeller = filteredErrors.reduce((acc, error) => {
      acc[error.sellerName] = (acc[error.sellerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { byType, bySeverity, bySeller };
  }, [filteredErrors]);

  /**
   * Handle filter updates
   */
  const updateFilter = <K extends keyof ErrorFilters>(key: K, value: ErrorFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refreshErrors();
    refreshJobs();
    onRefreshData?.();
    toast.success('Data refreshed');
    apiLogger.info('[ErrorAlertTab] Data refreshed manually');
  };

  /**
   * Handle retry single error
   */
  const handleRetryError = async (error: ScraperErrorAlert) => {
    try {
      await triggerManualScrape(error.sellerId, {});
      toast.success(`Retry initiated for ${error.sellerName}`);
      
      // Remove from selection if it was selected
      setSelectedErrors(prev => {
        const newSet = new Set(prev);
        newSet.delete(error.id);
        return newSet;
      });
      
    } catch (err) {
      toast.error('Failed to retry scraper');
      apiLogger.logError('[ErrorAlertTab] Retry failed', err as Error, { 
        errorId: error.id,
        sellerId: error.sellerId 
      });
    }
  };

  /**
   * Handle bulk retry
   */
  const handleBulkRetry = async () => {
    if (selectedErrors.size === 0) return;

    const selectedErrorList = filteredErrors.filter(error => selectedErrors.has(error.id));
    const uniqueSellers = [...new Set(selectedErrorList.map(error => ({ 
      id: error.sellerId, 
      name: error.sellerName 
    })))];

    try {
      await Promise.all(
        uniqueSellers.map(seller => triggerManualScrape(seller.id, {}))
      );

      toast.success(`Retry initiated for ${uniqueSellers.length} seller(s)`);
      setSelectedErrors(new Set());
      
    } catch (error) {
      toast.error('Failed to retry some scrapers');
      apiLogger.logError('[ErrorAlertTab] Bulk retry failed', error as Error);
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
   * Get severity color class
   */
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
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

      {/* Statistics Overview */}
      {errorStats && (
        <div className={styles.errorStatsGrid}>
          <div className={styles.errorCard}>
            <div className={styles.errorCardContent}>
              <div className={styles.errorCardIcon}>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
              <div className={styles.errorCardInfo}>
                <p className={styles.errorCardValue}>{filteredErrors.length}</p>
                <p className={styles.errorCardLabel}>Total Errors</p>
              </div>
            </div>
          </div>

          <div className={styles.errorCard}>
            <div className={styles.errorCardContent}>
              <div className={styles.errorCardIcon}>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className={styles.errorCardInfo}>
                <p className={styles.errorCardValue}>{errorStats.bySeverity.CRITICAL || 0}</p>
                <p className={styles.errorCardLabel}>Critical Errors</p>
              </div>
            </div>
          </div>

          <div className={styles.errorCard}>
            <div className={styles.errorCardContent}>
              <div className={styles.errorCardIcon}>
                <User className="h-8 w-8 text-blue-500" />
              </div>
              <div className={styles.errorCardInfo}>
                <p className={styles.errorCardValue}>{Object.keys(errorStats.bySeller).length}</p>
                <p className={styles.errorCardLabel}>Affected Sellers</p>
              </div>
            </div>
          </div>

          <div className={styles.errorCard}>
            <div className={styles.errorCardContent}>
              <div className={styles.errorCardIcon}>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
              <div className={styles.errorCardInfo}>
                <p className={styles.errorCardValue}>{filters.timeframe}m</p>
                <p className={styles.errorCardLabel}>Time Window</p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Main Content Area */}
      <div className={styles.errorCardContainer}>
        {/* View Toggle */}
        <div className={styles.errorCardHeader}>
          <h3 className={styles.errorListTitle}>
            {currentView === 'all' ? 'All Activities' : 
             currentView === 'errors' ? 'Error Details' : 'Success Details'} 
            ({currentView === 'errors' ? filteredErrors.length : 
              currentView === 'success' ? successfulJobs.length :
              currentView === 'all' ? `${filteredErrors.length + successfulJobs.length} total` : '0'})
          </h3>
          
          <div className={styles.errorViewToggle}>
            <div className={styles.errorViewToggleTabs}>
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

        {currentView === 'all' ? (
          // All Activities View (Errors + Success)
          <>
            {(isLoading || jobsLoading) ? (
              <div className={styles.errorLoadingState}>
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Loading data...</p>
              </div>
            ) : filteredErrors.length === 0 && successfulJobs.length === 0 ? (
              <div className={styles.errorEmptyState}>
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Found</h3>
                <p className="text-gray-600">
                  No scraping activity found in the selected timeframe.
                </p>
              </div>
            ) : (
              <div className={styles.errorListContainer}>
                {/* Success Jobs First */}
                {successfulJobs.map((job) => (
                  <div key={`success-${job.id}`} className={`${styles.errorCard} ${styles.successCard}`}>
                    <div className={styles.errorCardHeader}>
                      <div className={styles.errorCardStatus}>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-700 font-medium text-sm">SUCCESS</span>
                      </div>
                      <div className={styles.errorCardTimestamp}>
                        <Clock className="h-3 w-3" />
                        <span className="text-xs text-gray-500">
                          {job.endTime ? new Date(job.endTime).toLocaleString() : new Date(job.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className={styles.errorCardContent}>
                      <div className={styles.errorCardTitle}>
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{job.sellerName}</span>
                        <span className={`${styles.errorSeverityBadge} ${styles.successBadge}`}>
                          {job.mode.toUpperCase()}
                        </span>
                      </div>

                      <div className={styles.errorCardStats}>
                        <div className={styles.errorStatItem}>
                          <Database className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-gray-600">
                            Scraped: {job.productsScraped || 0}
                          </span>
                        </div>
                        <div className={styles.errorStatItem}>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-gray-600">
                            Saved: {job.productsSaved || 0}
                          </span>
                        </div>
                        <div className={styles.errorStatItem}>
                          <BarChart3 className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-gray-600">
                            Updated: {job.productsUpdated || 0}
                          </span>
                        </div>
                        {job.duration && (
                          <div className={styles.errorStatItem}>
                            <Clock className="h-3 w-3 text-purple-500" />
                            <span className="text-xs text-gray-600">
                              Duration: {Math.round(job.duration / 1000)}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.errorCardActions}>
                      <span className="text-xs text-gray-500">
                        Job ID: {job.id.slice(-8)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Error Jobs */}
                {filteredErrors.map((error) => (
                  <div 
                    key={`error-${error.id}`}
                    className={`${styles.errorCard} ${
                      selectedErrors.has(error.id) ? styles.errorCardSelected : ''
                    }`}
                    onClick={() => toggleErrorSelection(error.id)}
                  >
                    <div className={styles.errorCardHeader}>
                      <div className={styles.errorCardInfo}>
                        <div className={styles.errorCardType}>
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                          {ErrorProcessorService.classifyError(error.errorMessage).type}
                        </div>
                        <div className={styles.errorCardSeller}>
                          <User className="h-3 w-3 mr-1" />
                          {error.sellerName}
                        </div>
                      </div>
                      
                      <div className={`${styles.errorSeverityBadge} ${styles[`severity${ErrorProcessorService.classifyError(error.errorMessage).severity}`]}`}>
                        {ErrorProcessorService.classifyError(error.errorMessage).severity}
                      </div>
                    </div>

                    <div className={styles.errorCardMessage}>
                      {error.errorMessage}
                    </div>

                    <div className={styles.errorCardMeta}>
                      <div className={styles.errorMetaItem}>
                        <Clock className="h-3 w-3" />
                        <span>{new Date(error.timestamp).toLocaleString()}</span>
                      </div>
                      <div className={styles.errorMetaItem}>
                        <Database className="h-3 w-3" />
                        <span>Source: {error.errorSource}</span>
                      </div>
                    </div>

                    <div className={styles.errorCardActions}>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryError(error);
                        }}
                        className={styles.errorActionButton}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : currentView === 'errors' ? (
          // Error List View Only
          <>
            {(isLoading || jobsLoading) ? (
              <div className={styles.errorLoadingState}>
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Loading data...</p>
              </div>
            ) : filteredErrors.length === 0 ? (
              <div className={styles.errorEmptyState}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Errors Found</h3>
                <p className="text-gray-600">
                  {hasErrors 
                    ? 'No errors match your current filters.' 
                    : 'All scrapers are running smoothly! 🎉'
                  }
                </p>
              </div>
            ) : (
              <div className={styles.errorList}>
                {filteredErrors.map((error) => {
                  const classification = ErrorProcessorService.classifyError(error.errorMessage);
                  const isSelected = selectedErrors.has(error.id);

                  return (
                    <div 
                      key={error.id}
                      className={`${styles.errorListItem} ${
                        isSelected ? styles.errorListItemSelected : ''
                      }`}
                    >
                      <div className={styles.errorItemContent}>
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleErrorSelection(error.id)}
                          className={styles.errorCheckbox}
                        />

                        {/* Error Icon */}
                        <div className={styles.errorIcon}>
                          <AlertTriangle className={`h-5 w-5 ${
                            classification.severity === 'CRITICAL' ? 'text-red-500' :
                            classification.severity === 'HIGH' ? 'text-orange-500' :
                            'text-yellow-500'
                          }`} />
                        </div>

                        {/* Error Details */}
                        <div className={styles.errorDetails}>
                          <div className={styles.errorDetailsHeader}>
                            <div className={styles.errorDetailsMain}>
                              <div className={styles.errorTags}>
                                <h4 className={styles.errorSellerName}>{error.sellerName}</h4>
                                
                                <span className={`${styles.errorBadge} ${
                                  classification.severity === 'CRITICAL' ? styles.errorBadgeCritical :
                                  classification.severity === 'HIGH' ? styles.errorBadgeHigh :
                                  styles.errorBadgeMedium
                                }`}>
                                  {classification.severity}
                                </span>

                                <span className={styles.errorTypeTag}>
                                  {classification.type.replace('_', ' ')}
                                </span>

                                <span className={styles.errorSourceTag}>
                                  {error.errorSource}
                                </span>
                              </div>

                              <p className={styles.errorMessage}>
                                {error.errorMessage}
                              </p>

                              <div className={styles.errorMetadata}>
                                <span className={styles.errorTimestamp}>
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(error.timestamp)}
                                </span>
                                
                                {error.jobId && (
                                  <span>Job: {error.jobId}</span>
                                )}

                                {error.duration && (
                                  <span>Duration: {error.duration}ms</span>
                                )}
                              </div>

                              {classification.recommendation && (
                                <div className={styles.errorRecommendation}>
                                  <strong>💡 Recommendation:</strong> {classification.recommendation.action}
                                  {classification.recommendation.estimatedFixTime && (
                                    <span className={styles.errorRecommendationTime}>
                                      (Est. fix time: {classification.recommendation.estimatedFixTime})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className={styles.errorActions}>
                              {classification.recommendation.autoRetryable && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetryError(error)}
                                  className={styles.errorRetryButton}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Retry
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // Success List View
          <>
            {(isLoading || jobsLoading) ? (
              <div className={styles.errorLoadingState}>
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Loading data...</p>
              </div>
            ) : successfulJobs.length === 0 ? (
              <div className={styles.errorEmptyState}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Successful Jobs Found</h3>
                <p className="text-gray-600">
                  No completed scraping jobs found in the selected timeframe.
                </p>
              </div>
            ) : (
              <div className={styles.errorListContainer}>
                {successfulJobs.map((job) => (
                  <div key={job.id} className={`${styles.errorCard} ${styles.successCard}`}>
                    <div className={styles.errorCardHeader}>
                      <div className={styles.errorCardStatus}>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-700 font-medium text-sm">SUCCESS</span>
                      </div>
                      <div className={styles.errorCardTimestamp}>
                        <Clock className="h-3 w-3" />
                        <span className="text-xs text-gray-500">
                          {job.endTime ? new Date(job.endTime).toLocaleString() : new Date(job.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className={styles.errorCardContent}>
                      <div className={styles.errorCardTitle}>
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{job.sellerName}</span>
                        <span className={`${styles.errorSeverityBadge} ${styles.successBadge}`}>
                          {job.mode.toUpperCase()}
                        </span>
                      </div>

                      <div className={styles.errorCardStats}>
                        <div className={styles.errorStatItem}>
                          <Database className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-gray-600">
                            Scraped: {job.productsScraped || 0}
                          </span>
                        </div>
                        <div className={styles.errorStatItem}>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-gray-600">
                            Saved: {job.productsSaved || 0}
                          </span>
                        </div>
                        <div className={styles.errorStatItem}>
                          <BarChart3 className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-gray-600">
                            Updated: {job.productsUpdated || 0}
                          </span>
                        </div>
                        {job.duration && (
                          <div className={styles.errorStatItem}>
                            <Clock className="h-3 w-3 text-purple-500" />
                            <span className="text-xs text-gray-600">
                              Duration: {Math.round(job.duration / 1000)}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.errorCardActions}>
                      <span className="text-xs text-gray-500">
                        Job ID: {job.id.slice(-8)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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