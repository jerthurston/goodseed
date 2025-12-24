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
import ErrorStatistics from '@/components/custom/admin/ErrorStatistics';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  useScraperErrorMonitor, 
  ScraperErrorAlert 
} from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { 
  ErrorProcessorService, 
  ScraperErrorType, 
  ErrorSeverity 
} from '@/lib/services/error-monitoring/error-processor.service';
import { useScraperOperations } from '@/hooks/scraper-site/useScraperOperations';
import { apiLogger } from '@/lib/helpers/api-logger';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

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
interface ErrorAlertTabContentProps {
  sellers: Array<{ id: string; name: string }>;
  onRefreshData?: () => void;
}

/**
 * Dedicated Error Alert Tab Component
 * Comprehensive error monitoring and management interface
 */
export default function ErrorAlertTabContent({ 
  sellers, 
  onRefreshData 
}: ErrorAlertTabContentProps) {
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
  const [currentView, setCurrentView] = useState<'errors' | 'statistics'>('errors');

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
    onRefreshData?.();
    toast.success('Error data refreshed');
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
      <div>
        <h2 className="font-['Archivo_Black'] text-3xl uppercase text-(--brand-primary) tracking-tight mb-2">
          Error Alert Management
        </h2>
        <p className="font-['Poppins'] text-(--text-primary-muted)">
          Comprehensive error monitoring and management dashboard
        </p>
      </div>

      {/* Statistics Overview */}
      {errorStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{filteredErrors.length}</p>
                  <p className="text-sm text-gray-600">Total Errors</p>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{errorStats.bySeverity.CRITICAL || 0}</p>
                  <p className="text-sm text-gray-600">Critical Errors</p>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{Object.keys(errorStats.bySeller).length}</p>
                  <p className="text-sm text-gray-600">Affected Sellers</p>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{filters.timeframe}m</p>
                  <p className="text-sm text-gray-600">Time Window</p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* Controls */}
      <DashboardCard>
        <div className="p-4 space-y-4">
          {/* Top Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search errors or sellers..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.values(filters).some(v => v !== 'ALL' && v !== 30 && v !== '') && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                  Active
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentView === 'errors' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('errors')}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Error List
              </Button>
              <Button
                variant={currentView === 'statistics' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('statistics')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Statistics
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedErrors.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {selectedErrors.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRetry}
                  className="h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedErrors(new Set())}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Error Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Error Type</label>
                  <select
                    value={filters.errorType}
                    onChange={(e) => updateFilter('errorType', e.target.value as ScraperErrorType | 'ALL')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select
                    value={filters.severity}
                    onChange={(e) => updateFilter('severity', e.target.value as ErrorSeverity | 'ALL')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                <div>
                  <label className="block text-sm font-medium mb-1">Source</label>
                  <select
                    value={filters.errorSource}
                    onChange={(e) => updateFilter('errorSource', e.target.value as 'ACTIVITY' | 'JOB' | 'ALL')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="ACTIVITY">Activity Logs</option>
                    <option value="JOB">Job Logs</option>
                  </select>
                </div>

                {/* Seller Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Seller</label>
                  <select
                    value={filters.sellerId}
                    onChange={(e) => updateFilter('sellerId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                <div>
                  <label className="block text-sm font-medium mb-1">Time Range</label>
                  <select
                    value={filters.timeframe}
                    onChange={(e) => updateFilter('timeframe', Number(e.target.value) as 15 | 30 | 60 | 120)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={15}>Last 15 minutes</option>
                    <option value={30}>Last 30 minutes</option>
                    <option value={60}>Last hour</option>
                    <option value={120}>Last 2 hours</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-sm"
                >
                  Clear Filters
                </Button>
                
                {filteredErrors.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllErrors}
                    className="text-sm"
                  >
                    Select All ({filteredErrors.length})
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardCard>

      {/* Main Content Area */}
      {currentView === 'statistics' ? (
        <ErrorStatistics 
          errors={filteredErrors}
          timeframe={filters.timeframe}
        />
      ) : (
        <DashboardCard>
          <DashboardCardHeader>
            <h3 className="text-lg font-semibold">
              Error Details ({filteredErrors.length} errors)
            </h3>
          </DashboardCardHeader>

          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading errors...</p>
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="p-8 text-center">
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
            <div className="divide-y">
              {filteredErrors.map((error) => {
                const classification = ErrorProcessorService.classifyError(error.errorMessage);
                const isSelected = selectedErrors.has(error.id);

                return (
                  <div 
                    key={error.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleErrorSelection(error.id)}
                        className="mt-1"
                      />

                      {/* Error Icon */}
                      <div className="shrink-0">
                        <AlertTriangle className={`h-5 w-5 ${
                          classification.severity === 'CRITICAL' ? 'text-red-500' :
                          classification.severity === 'HIGH' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                      </div>

                      {/* Error Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">{error.sellerName}</h4>
                              
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                getSeverityColor(classification.severity)
                              }`}>
                                {classification.severity}
                              </span>

                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                {classification.type.replace('_', ' ')}
                              </span>

                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                {error.errorSource}
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                              {error.errorMessage}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
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
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <strong>💡 Recommendation:</strong> {classification.recommendation.action}
                                {classification.recommendation.estimatedFixTime && (
                                  <span className="ml-2 text-gray-600">
                                    (Est. fix time: {classification.recommendation.estimatedFixTime})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="shrink-0">
                            {classification.recommendation.autoRetryable && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryError(error)}
                                className="h-8 px-3 text-xs"
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
        </DashboardCard>
      )}
    </div>
  );
}