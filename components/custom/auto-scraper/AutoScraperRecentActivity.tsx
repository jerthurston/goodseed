import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCheckCircle, faExclamationCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperActivityItem {
  id: string;
  sellerId: string;
  sellerName: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: Date;
  productsScraped?: number;
  errorMessage?: string;
}

interface AutoScraperRecentActivityProps {
  activities?: AutoScraperActivityItem[];
  isLoading?: boolean;
}

export default function AutoScraperRecentActivity({ activities = [], isLoading = false }: AutoScraperRecentActivityProps) {
  // Mock data for demonstration (can be replaced with real API data)
  const mockActivities: AutoScraperActivityItem[] = [
    {
      id: '1',
      sellerId: 'seller1',
      sellerName: 'BC Bud Depot',
      status: 'completed',
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      productsScraped: 45
    },
    {
      id: '2',
      sellerId: 'seller2',
      sellerName: 'Crop King Seeds',
      status: 'running',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    },
    {
      id: '3',
      sellerId: 'seller3',
      sellerName: 'Beaver Seeds',
      status: 'failed',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      errorMessage: 'Network timeout'
    },
    {
      id: '4',
      sellerId: 'seller4',
      sellerName: 'Royal Queen Seeds',
      status: 'completed',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      productsScraped: 32
    }
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return faSpinner;
      case 'completed':
        return faCheckCircle;
      case 'failed':
        return faExclamationCircle;
      default:
        return faClock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'var(--status-warning)';
      case 'completed':
        return 'var(--status-success)';
      case 'failed':
        return 'var(--status-danger)';
      default:
        return 'var(--text-primary-muted)';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000 / 60);
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <DashboardCard className={`${styles.card} animate-pulse`}>
        <DashboardCardHeader className={styles.cardHeader}>
          <h3 className="text-lg font-['Archivo_Black']">Auto Scraper Activity</h3>
        </DashboardCardHeader>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className={styles.card}>
      <DashboardCardHeader className={styles.cardHeader}>
        <h3 
          className="text-lg font-['Archivo_Black'] uppercase tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          Auto Scraper Activity
        </h3>
        <div 
          className="text-sm font-['Poppins']"
          style={{ color: 'var(--text-primary-muted)' }}
        >
          Recent automated scraping jobs
        </div>
      </DashboardCardHeader>

      <div className={styles.cardBody}>
        <div className="space-y-4">
          {displayActivities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                <FontAwesomeIcon
                  icon={getStatusIcon(activity.status)}
                  className={`text-lg ${activity.status === 'running' ? 'animate-spin' : ''}`}
                  style={{ color: getStatusColor(activity.status) }}
                />
              </div>

              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 
                    className="text-sm font-semibold font-['Poppins'] truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {activity.sellerName}
                  </h4>
                  <span 
                    className="text-xs font-['Poppins'] ml-2"
                    style={{ color: 'var(--text-primary-muted)' }}
                  >
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>

                <div className="mt-1">
                  {activity.status === 'running' && (
                    <p 
                      className="text-xs font-['Poppins']"
                      style={{ color: 'var(--status-warning-text)' }}
                    >
                      Auto scraping in progress...
                    </p>
                  )}
                  
                  {activity.status === 'completed' && activity.productsScraped && (
                    <p 
                      className="text-xs font-['Poppins']"
                      style={{ color: 'var(--status-success-text)' }}
                    >
                      Successfully scraped {activity.productsScraped} products
                    </p>
                  )}
                  
                  {activity.status === 'failed' && activity.errorMessage && (
                    <p 
                      className="text-xs font-['Poppins']"
                      style={{ color: 'var(--status-danger-text)' }}
                    >
                      Failed: {activity.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {displayActivities.length === 0 && (
            <div className="text-center py-8">
              <FontAwesomeIcon
                icon={faClock}
                className="text-2xl mb-3"
                style={{ color: 'var(--text-primary-muted)' }}
              />
              <p 
                className="font-['Poppins']"
                style={{ color: 'var(--text-primary-muted)' }}
              >
                No recent auto scraper activity
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}