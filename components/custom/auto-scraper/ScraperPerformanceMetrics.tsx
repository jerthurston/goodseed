import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faArrowUp, faArrowDown, faMinus, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import { useScraperPerformanceMetrics, type PerformanceMetric } from '@/hooks/admin/scraper/useScraperPerformanceMetrics';
import { apiLogger } from '@/lib/helpers/api-logger';

interface ScraperPerformanceMetricsProps {
  className?: string;
}

export default function ScraperPerformanceMetrics({ className }: ScraperPerformanceMetricsProps) {
  const { data: performanceMetrics, isLoading, error, isError } = useScraperPerformanceMetrics('24h');

  // Metric tooltips with detailed explanations
  const metricTooltips: Record<string, string> = {
    'Avg Scrape Time': 'Average time to complete a scraping job. Includes page loading, data parsing, and database saving. High values may indicate slow target websites or complex jobs.',
    'Success Rate': 'Percentage of scraping jobs completed successfully without errors. Low rates indicate issues with target websites, network connectivity, or scraper logic.',
    'Products/Hour': 'Number of products successfully scraped and saved per hour. This metric reflects the actual data collection performance of the system.',
    'Error Rate': 'Percentage of scraping jobs that failed or encountered errors. Includes timeouts, network errors, parse errors, and database errors. Monitor to ensure data quality.'
  };

  apiLogger.debug('AutoScraperPerformanceMetrics - Detailed Debug:', {
    performanceMetrics,
    isLoading,
    error,
    isError,
    hasData: !!performanceMetrics,
    dataLength: performanceMetrics?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Log the actual data structure
  if (performanceMetrics) {
    apiLogger.debug(`AutoScraperPerformanceMetrics - Actual data:'+ ${performanceMetrics}`);
  }

  // Fallback data while loading or on error
  const fallbackMetrics: PerformanceMetric[] = [
    {
      label: 'Avg Scrape Time',
      value: '0.0m',
      trend: { value: '0%', isPositive: true, isNeutral: true },
      color: 'var(--brand-primary)'
    },
    {
      label: 'Success Rate',
      value: '0.0%',
      trend: { value: '0%', isPositive: true, isNeutral: true },
      color: 'var(--status-success)'
    },
    {
      label: 'Products/Hour',
      value: '0',
      trend: { value: '0%', isPositive: true, isNeutral: true },
      color: 'var(--brand-secondary)'
    },
    {
      label: 'Error Rate',
      value: '0.0%',
      trend: { value: '0%', isPositive: true, isNeutral: true },
      color: 'var(--status-warning)'
    }
  ];

  const metricsToShow = performanceMetrics || fallbackMetrics;

  apiLogger.info('AutoScraperPerformanceMetrics - Metrics selection:', {
    usingPerformanceMetrics: !!performanceMetrics,
    usingFallbackMetrics: !performanceMetrics,
    metricsToShow: metricsToShow.slice(0, 2) // Show first 2 metrics
  });

  const getTrendIcon = (trend: PerformanceMetric['trend']) => {
    if (trend.isNeutral) return faMinus;
    return trend.isPositive ? faArrowUp : faArrowDown;
  };

  const getTrendColor = (trend: PerformanceMetric['trend']) => {
    if (trend.isNeutral) return 'var(--text-primary-muted)';
    return trend.isPositive ? 'var(--status-success)' : 'var(--status-danger)';
  };

  return (
    <DashboardCard className={`${styles.card} ${className || ''}`}>
      <DashboardCardHeader className={styles.cardHeader}>
        <div className="flex items-center gap-3 ">
          <FontAwesomeIcon 
            icon={faChartLine} 
            className="text-xl"
            style={{ color: 'var(--brand-primary)' }}
          />
          <h3 
            className="text-lg font-['Archivo_Black'] uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            Performance Metrics
          </h3>
        </div>
        <div 
          className="text-sm font-['Poppins']"
          style={{ color: 'var(--text-primary-muted)' }}
        >
          Last 24 hours
        </div>
      </DashboardCardHeader>

      <div className={styles.cardBody}>
        <div className="grid grid-cols-2 gap-4 ">
          {metricsToShow.map((metric, index) => (
            <div 
              key={index}
              className="p-4 border-dashed border border-(--border-color) bg-(--bg-section) "
              // style={{ 
              //   backgroundColor: 'var(--card-bg-secondary)',
              //   borderColor: 'var(--border-color)'
              // }}
            >
              {/* Metric Value */}
              <div className="text-center mb-3">
                <div 
                  className="text-2xl font-['Archivo_Black'] mb-1"
                  style={{ color: metric.color }}
                >
                  {metric.value}
                </div>
                <div 
                  className="text-sm font-['Poppins'] flex items-center justify-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>{metric.label}</span>
                  <div 
                    className="relative group cursor-help"
                    title={metricTooltips[metric.label]}
                  >
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="text-lg opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-primary-muted)' }}
                    />
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-(--accent-cta) text-black text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-10">
                      <div className="text-center leading-relaxed">
                        {metricTooltips[metric.label]}
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend Indicator */}
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon
                  icon={getTrendIcon(metric.trend)}
                  className="text-xs"
                  style={{ color: getTrendColor(metric.trend) }}
                />
                <span 
                  className="text-xs font-['Poppins'] font-semibold"
                  style={{ color: getTrendColor(metric.trend) }}
                >
                  {metric.trend.value}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div 
          className="mt-4 p-3 rounded-lg text-center"
          style={{ 
            backgroundColor: isLoading ? 'var(--card-bg-secondary)' : error ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
            border: `1px solid ${isLoading ? 'var(--border-color)' : error ? 'var(--status-danger)' : 'var(--status-success)'}`
          }}
        >
          <div 
            className="text-sm font-['Poppins'] font-semibold"
            style={{ 
              color: isLoading ? 'var(--text-primary-muted)' : error ? 'var(--status-danger-text)' : 'var(--status-success-text)'
            }}
          >
            {isLoading ? 
              '⏳ Loading performance metrics...' : 
              error ? 
              '❌ Unable to load performance metrics' :
              performanceMetrics && performanceMetrics.length > 0 ?
              '✨ Auto scraper performance metrics updated from database' :
              '📊 Performance metrics calculated from scrape jobs'
            }
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}