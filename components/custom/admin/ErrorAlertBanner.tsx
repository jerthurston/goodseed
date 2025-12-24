'use client'

import { useState } from 'react';
import { X, AlertTriangle, RefreshCw, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useScraperErrorMonitor, ScraperErrorAlert } from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { ErrorProcessorService, ScraperErrorType } from '@/lib/services/error-monitoring/error-processor.service';
import { useScraperOperations } from '@/hooks/scraper-site/useScraperOperations';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Error Alert Banner Props
 */
interface ErrorAlertBannerProps {
  /**
   * Whether to show critical errors only (default: false)
   */
  criticalOnly?: boolean;
  
  /**
   * Whether banner can be dismissed (default: true)
   */
  dismissible?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Callback when errors are refreshed
   */
  onRefresh?: () => void;
}

/**
 * Error Alert Banner Component
 * Displays recent scraper errors at top of admin dashboard
 * 
 * Features:
 * - Real-time error monitoring
 * - Error classification with severity
 * - Quick action buttons (retry, dismiss)
 * - Collapsible error details
 */
export default function ErrorAlertBanner({
  criticalOnly = false,
  dismissible = true,
  className = '',
  onRefresh
}: ErrorAlertBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  // Monitor recent errors
  const {
    errors,
    summary,
    isLoading,
    hasErrors,
    criticalErrorCount,
    refreshErrors
  } = useScraperErrorMonitor({
    timeframe: criticalOnly ? 30 : 15,
    severity: criticalOnly ? 'critical' : 'all',
    limit: criticalOnly ? 5 : 10
  });

  // Scraper operations for retry functionality
  const { triggerManualScrape } = useScraperOperations(() => {
    // Refresh errors after manual scrape
    refreshErrors();
  });

  // Don't show if dismissed or no errors
  if (isDismissed || !hasErrors || isLoading) {
    return null;
  }

  // Get most recent/critical errors to display
  const displayErrors = errors?.slice(0, criticalOnly ? 3 : 5) || [];
  const totalErrorCount = summary?.totalErrors || 0;

  /**
   * Handle banner dismissal
   */
  const handleDismiss = () => {
    setIsDismissed(true);
    apiLogger.info('[ErrorAlertBanner] Banner dismissed', { 
      errorCount: totalErrorCount,
      criticalOnly 
    });
  };

  /**
   * Handle retry scraping for specific seller
   */
  const handleRetry = async (sellerId: string, sellerName: string) => {
    try {
      apiLogger.info('[ErrorAlertBanner] Retrying scrape', { sellerId, sellerName });
      
      await triggerManualScrape(sellerId, {}); // Pass empty config object
      
      toast.success('Retry initiated', {
        description: `Manual scrape started for ${sellerName}`,
        duration: 3000
      });
      
      // Refresh errors after retry
      setTimeout(refreshErrors, 2000);
      
    } catch (error) {
      apiLogger.logError('[ErrorAlertBanner] Retry failed', error as Error, { sellerId });
      toast.error('Retry failed', {
        description: 'Could not start manual scrape. Please try again.',
        duration: 5000
      });
    }
  };

  /**
   * Handle refresh errors
   */
  const handleRefresh = () => {
    refreshErrors();
    onRefresh?.();
    toast.success('Errors refreshed', { duration: 2000 });
    apiLogger.info('[ErrorAlertBanner] Errors manually refreshed');
  };

  /**
   * Get error severity styling
   */
  const getErrorSeverityStyle = (error: ScraperErrorAlert) => {
    const classification = ErrorProcessorService.classifyError(error.errorMessage);
    
    switch (classification.severity) {
      case 'CRITICAL':
        return 'border-red-500 bg-red-50 text-red-900';
      case 'HIGH':
        return 'border-orange-500 bg-orange-50 text-orange-900';
      case 'MEDIUM':
        return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-900';
    }
  };

  /**
   * Get error icon based on type
   */
  const getErrorIcon = (error: ScraperErrorAlert) => {
    const classification = ErrorProcessorService.classifyError(error.errorMessage);
    
    switch (classification.type) {
      case ScraperErrorType.SITE_CHANGED:
      case ScraperErrorType.WORKER_ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case ScraperErrorType.NETWORK_ERROR:
      case ScraperErrorType.TIMEOUT_ERROR:
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className={`relative border rounded-lg shadow-sm mb-6 ${className}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        criticalErrorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${
            criticalErrorCount > 0 ? 'text-red-600' : 'text-orange-600'
          }`} />
          <div>
            <h3 className={`font-semibold ${
              criticalErrorCount > 0 ? 'text-red-900' : 'text-orange-900'
            }`}>
              {criticalErrorCount > 0 ? 'Critical Scraper Errors' : 'Recent Scraper Errors'}
            </h3>
            <p className={`text-sm ${
              criticalErrorCount > 0 ? 'text-red-700' : 'text-orange-700'
            }`}>
              {totalErrorCount} error{totalErrorCount !== 1 ? 's' : ''} detected in the last {
                criticalOnly ? '30 minutes' : '15 minutes'
              }
              {criticalErrorCount > 0 && ` • ${criticalErrorCount} critical`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 px-3"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error List */}
      <div className="p-4 space-y-3">
        {displayErrors.map((error) => {
          const classification = ErrorProcessorService.classifyError(error.errorMessage);
          const isExpanded = expandedError === error.id;
          
          return (
            <div
              key={error.id}
              className={`border rounded-lg p-3 ${getErrorSeverityStyle(error)}`}
            >
              {/* Error Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {getErrorIcon(error)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{error.sellerName}</span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {error.errorSource}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(error.timestamp)}
                      </div>
                    </div>
                    
                    <p className="text-sm line-clamp-2">
                      {error.errorMessage}
                    </p>
                    
                    {classification.recommendation && (
                      <p className="text-xs mt-1 font-medium">
                        💡 {classification.recommendation.action}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {classification.recommendation.autoRetryable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(error.sellerId, error.sellerName)}
                      className="h-7 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedError(isExpanded ? null : error.id)}
                    className="h-7 px-2 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {isExpanded ? 'Less' : 'More'}
                  </Button>
                </div>
              </div>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-white border-opacity-50">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>Error Type:</strong> {classification.type}
                      <br />
                      <strong>Severity:</strong> {classification.severity}
                      <br />
                      {error.jobId && (
                        <>
                          <strong>Job ID:</strong> {error.jobId}
                          <br />
                        </>
                      )}
                      {error.duration && (
                        <>
                          <strong>Duration:</strong> {error.duration}ms
                          <br />
                        </>
                      )}
                    </div>
                    
                    <div>
                      <strong>Recommendation:</strong>
                      <br />
                      {classification.recommendation.description}
                      <br />
                      {classification.recommendation.estimatedFixTime && (
                        <>
                          <strong>Est. Fix Time:</strong> {classification.recommendation.estimatedFixTime}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {error.errorDetails && (
                    <div className="mt-2">
                      <strong className="text-xs">Stack Trace:</strong>
                      <pre className="text-xs mt-1 p-2 bg-white bg-opacity-50 rounded overflow-auto max-h-24">
                        {JSON.stringify(error.errorDetails, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Show more indicator */}
        {totalErrorCount > displayErrors.length && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              + {totalErrorCount - displayErrors.length} more error{totalErrorCount - displayErrors.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}