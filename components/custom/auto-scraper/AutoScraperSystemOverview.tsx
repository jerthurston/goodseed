import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faClock, faChartLine, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import { useBulkAutoScraperStatus } from '@/hooks/admin/auto-scrape/useAutoScraperStatus';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperSystemOverviewProps {
  sellersCount: number;
}

export default function AutoScraperSystemOverview({ sellersCount }: AutoScraperSystemOverviewProps) {
  const { status: bulkStatus, isLoading, error } = useBulkAutoScraperStatus();

  // Debug logging
  console.log('AutoScraperSystemOverview - Hook data:', { 
    bulkStatus, 
    isLoading, 
    error,
    sellersCount 
  });

  const getSystemHealthColor = () => {
    if (!bulkStatus) return 'var(--text-primary-muted)';
    
    // Use coverage percentage for health determination
    const coverage = bulkStatus.coverage || 0;
    if (coverage < 50) return 'var(--status-danger)';
    if (coverage < 90) return 'var(--status-warning)';
    return 'var(--status-success)';
  };

  const getSystemHealthText = () => {
    if (!bulkStatus) return 'Unknown';
    
    // Use the health status from API
    const status = bulkStatus.status;
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'unhealthy':
        return 'Unhealthy';
      case 'error':
        return 'Error';
      default:
        return 'Updating...';
    }
  };

  if (isLoading) {
    return (
      <DashboardCard className={`${styles.card} animate-pulse`}>
        <div className="h-32 bg-gray-200 rounded" />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className={styles.card}>
      <DashboardCardHeader className={styles.cardHeader}>
        <div className="flex items-center gap-3">
          <FontAwesomeIcon 
            icon={faRobot} 
            className="text-xl"
            style={{ color: 'var(--brand-primary)' }}
          />
          <h3 
            className="text-lg font-['Archivo_Black'] uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            Auto Scraper System
          </h3>
        </div>
        <div 
          className="px-3 py-1 rounded-full text-sm font-['Poppins'] font-semibold"
          style={{ 
            backgroundColor: getSystemHealthColor() + '20',
            color: getSystemHealthColor(),
            border: `1px solid ${getSystemHealthColor()}`
          }}
        >
          {getSystemHealthText()}
        </div>
      </DashboardCardHeader>

      <div className={styles.cardBody}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Active Scrapers */}
          <div className="text-center">
            <div 
              className="text-2xl font-['Archivo_Black'] mb-1"
              style={{ color: 'var(--brand-primary)' }}
            >
              {bulkStatus?.activeScrapers || 0}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Active Scrapers
            </div>
          </div>

          {/* Scheduled Scrapers */}
          <div className="text-center">
            <div 
              className="text-2xl font-['Archivo_Black'] mb-1"
              style={{ color: 'var(--brand-secondary)' }}
            >
              {bulkStatus?.scheduledScrapers || 0}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Scheduled
            </div>
          </div>

          {/* Success Rate */}
          <div className="text-center">
            <div 
              className="text-2xl font-['Archivo_Black'] mb-1"
              style={{ color: 'var(--status-success)' }}
            >
              {bulkStatus ? Math.round(((bulkStatus.totalJobs - bulkStatus.totalErrors) / Math.max(bulkStatus.totalJobs, 1)) * 100) : 0}%
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Success Rate
            </div>
          </div>

          {/* Total Jobs */}
          <div className="text-center">
            <div 
              className="text-2xl font-['Archivo_Black'] mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {bulkStatus?.totalJobs || 0}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Total Jobs
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {bulkStatus && bulkStatus.totalErrors > 0 && (
          <div 
            className="mt-4 p-3 rounded-lg flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--status-warning-bg)',
              border: '1px solid var(--status-warning)'
            }}
          >
            <FontAwesomeIcon 
              icon={faExclamationTriangle}
              style={{ color: 'var(--status-warning)' }}
            />
            <span 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--status-warning-text)' }}
            >
              {bulkStatus.totalErrors} error(s) detected in recent scraping jobs
            </span>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}