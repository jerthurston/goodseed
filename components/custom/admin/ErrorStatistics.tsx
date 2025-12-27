'use client'

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react';
import { ScraperErrorAlert } from '@/hooks/admin/error-monitoring/useScraperErrorMonitor';
import { ErrorProcessorService, ScraperErrorType, ErrorSeverity } from '@/lib/services/error-monitoring/error-processor.service';
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard';

interface ErrorStatisticsProps {
  errors: ScraperErrorAlert[];
  timeframe: number; // minutes
}

interface ErrorTrend {
  type: ScraperErrorType;
  count: number;
  trend: 'up' | 'down' | 'stable';
  severity: ErrorSeverity;
}

interface SellerErrorStats {
  sellerId: string;
  sellerName: string;
  errorCount: number;
  criticalCount: number;
  lastError: Date;
  healthScore: number; // 0-100
}

/**
 * Error Statistics Dashboard Component
 * Provides visual insights into error patterns and trends
 */
export default function ErrorStatistics({ errors, timeframe }: ErrorStatisticsProps) {
  
  // Calculate error trends by type
  const errorTrends = useMemo(() => {
    const trends: ErrorTrend[] = [];
    const typeGroups = errors.reduce((acc, error) => {
      const classification = ErrorProcessorService.classifyError(error.errorMessage);
      if (!acc[classification.type]) {
        acc[classification.type] = {
          count: 0,
          severity: classification.severity,
          recent: [] as Date[]
        };
      }
      acc[classification.type].count++;
      acc[classification.type].recent.push(new Date(error.timestamp));
      return acc;
    }, {} as Record<ScraperErrorType, { count: number; severity: ErrorSeverity; recent: Date[] }>);

    // Calculate trends (simplified - in real app, you'd compare with previous timeframe)
    Object.entries(typeGroups).forEach(([type, data]) => {
      // Mock trend calculation (replace with actual historical comparison)
      const recentErrors = data.recent.filter(date => 
        date.getTime() > Date.now() - (timeframe / 2) * 60 * 1000
      ).length;
      const olderErrors = data.count - recentErrors;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentErrors > olderErrors) trend = 'up';
      else if (recentErrors < olderErrors) trend = 'down';

      trends.push({
        type: type as ScraperErrorType,
        count: data.count,
        trend,
        severity: data.severity
      });
    });

    return trends.sort((a, b) => b.count - a.count);
  }, [errors, timeframe]);

  // Calculate seller error statistics
  const sellerStats = useMemo(() => {
    const sellerGroups = errors.reduce((acc, error) => {
      if (!acc[error.sellerId]) {
        acc[error.sellerId] = {
          sellerId: error.sellerId,
          sellerName: error.sellerName,
          errorCount: 0,
          criticalCount: 0,
          errors: [] as ScraperErrorAlert[],
          lastError: new Date(error.timestamp),
          healthScore: 0
        };
      }
      
      acc[error.sellerId].errorCount++;
      acc[error.sellerId].errors.push(error);
      
      const classification = ErrorProcessorService.classifyError(error.errorMessage);
      if (classification.severity === 'CRITICAL') {
        acc[error.sellerId].criticalCount++;
      }
      
      if (new Date(error.timestamp) > acc[error.sellerId].lastError) {
        acc[error.sellerId].lastError = new Date(error.timestamp);
      }
      
      return acc;
    }, {} as Record<string, SellerErrorStats & { errors: ScraperErrorAlert[] }>);

    // Calculate health scores
    const stats: SellerErrorStats[] = Object.values(sellerGroups).map(seller => {
      // Health score based on error count and severity
      const maxErrors = Math.max(...Object.values(sellerGroups).map(s => s.errorCount), 10);
      const errorPenalty = (seller.errorCount / maxErrors) * 50;
      const criticalPenalty = seller.criticalCount * 10;
      const healthScore = Math.max(0, 100 - errorPenalty - criticalPenalty);
      
      return {
        sellerId: seller.sellerId,
        sellerName: seller.sellerName,
        errorCount: seller.errorCount,
        criticalCount: seller.criticalCount,
        lastError: seller.lastError,
        healthScore: Math.round(healthScore)
      };
    });

    return stats.sort((a, b) => b.errorCount - a.errorCount);
  }, [errors]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const total = errors.length;
    const critical = errors.filter(error => {
      const classification = ErrorProcessorService.classifyError(error.errorMessage);
      return classification.severity === 'CRITICAL';
    }).length;
    
    const bySource = errors.reduce((acc, error) => {
      acc[error.errorSource] = (acc[error.errorSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgPerSeller = sellerStats.length > 0 ? Math.round(total / sellerStats.length) : 0;
    
    return {
      total,
      critical,
      bySource,
      avgPerSeller,
      affectedSellers: sellerStats.length
    };
  }, [errors, sellerStats]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  if (errors.length === 0) {
    return (
      <DashboardCard>
        <div className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">System Healthy</h3>
          <p className="text-gray-600">No errors to analyze in the selected timeframe.</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DashboardCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{overallStats.total}</p>
                <p className="text-sm text-gray-600">Total Errors</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{overallStats.critical}</p>
                <p className="text-sm text-gray-600">Critical</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{overallStats.affectedSellers}</p>
                <p className="text-sm text-gray-600">Affected Sellers</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{overallStats.avgPerSeller}</p>
                <p className="text-sm text-gray-600">Avg per Seller</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Trends */}
        <DashboardCard>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Error Trends by Type
            </h3>
            
            {errorTrends.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No error trends to display</p>
            ) : (
              <div className="space-y-3">
                {errorTrends.slice(0, 6).map((trend) => (
                  <div key={trend.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTrendIcon(trend.trend)}
                      <div>
                        <p className="font-medium text-sm">
                          {trend.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {trend.severity} severity
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-sm">{trend.count}</p>
                      <p className="text-xs text-gray-500 capitalize">{trend.trend}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Seller Health */}
        <DashboardCard>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Seller Health Score
            </h3>
            
            {sellerStats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No seller data to display</p>
            ) : (
              <div className="space-y-3">
                {sellerStats.slice(0, 6).map((seller) => (
                  <div key={seller.sellerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm truncate">
                        {seller.sellerName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {seller.errorCount} error{seller.errorCount !== 1 ? 's' : ''}
                        {seller.criticalCount > 0 && (
                          <span className="text-red-600 ml-1">
                            ({seller.criticalCount} critical)
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        getHealthColor(seller.healthScore)
                      }`}>
                        {seller.healthScore}%
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTimestamp(seller.lastError)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Source Breakdown */}
      <DashboardCard>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Error Source Distribution</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(overallStats.bySource).map(([source, count]) => (
              <div key={source} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{source} Errors</p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${(count / overallStats.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((count / overallStats.total) * 100)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}