import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faArrowUp, faArrowDown, faMinus } from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface PerformanceMetric {
  label: string;
  value: string;
  trend: {
    value: string;
    isPositive: boolean;
    isNeutral?: boolean;
  };
  color: string;
}

interface AutoScraperPerformanceMetricsProps {
  className?: string;
}

export default function AutoScraperPerformanceMetrics({ className }: AutoScraperPerformanceMetricsProps) {
  // Mock performance data (can be replaced with real API data)
  const performanceMetrics: PerformanceMetric[] = [
    {
      label: 'Avg Scrape Time',
      value: '2.3m',
      trend: { value: '-15%', isPositive: true },
      color: 'var(--brand-primary)'
    },
    {
      label: 'Success Rate',
      value: '94.2%',
      trend: { value: '+3.2%', isPositive: true },
      color: 'var(--status-success)'
    },
    {
      label: 'Products/Hour',
      value: '127',
      trend: { value: '+8.5%', isPositive: true },
      color: 'var(--brand-secondary)'
    },
    {
      label: 'Error Rate',
      value: '5.8%',
      trend: { value: '-1.2%', isPositive: true },
      color: 'var(--status-warning)'
    }
  ];

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
        <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-2 gap-4">
          {performanceMetrics.map((metric, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--card-bg-secondary)',
                borderColor: 'var(--border-color)'
              }}
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
                  className="text-sm font-['Poppins']"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {metric.label}
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
            backgroundColor: 'var(--status-success-bg)',
            border: '1px solid var(--status-success)'
          }}
        >
          <div 
            className="text-sm font-['Poppins'] font-semibold"
            style={{ color: 'var(--status-success-text)' }}
          >
            ✨ Auto scraper performance is excellent this week
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}