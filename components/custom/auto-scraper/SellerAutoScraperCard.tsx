import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faClock } from '@fortawesome/free-solid-svg-icons';
import { DashboardToggle } from '@/app/dashboard/(components)/DashboardToggle';
import { DashboardCard, } from '@/app/dashboard/(components)/DashboardCard';
import AutoScraperStatusBadge from './AutoScraperStatusBadge';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import { apiLogger } from '@/lib/helpers/api-logger';

interface SellerAutoScraperCardProps {
  sellerId: string;
  sellerName: string;
  isScheduled: boolean;
  isRunning?: boolean;
  nextRun?: Date;
  autoScrapeInterval?: number | null;
  onToggle: () => void;
  onIntervalChange?: (sellerId: string, interval: number) => void;
  isLoading: boolean;
}

export default function SellerAutoScraperCard({
  sellerId,
  sellerName,
  isScheduled,
  isRunning = false,
  nextRun,
  autoScrapeInterval,
  onToggle,
  onIntervalChange,
  isLoading
}: SellerAutoScraperCardProps) {
  // Auto scraper is "enabled" if autoScrapeInterval is set (> 0)
  const isAutoEnabled = autoScrapeInterval != null && autoScrapeInterval > 0;
  
  // apiLogger.debug('SellerAutoScraperCard render:', { 
  //   sellerId, 
  //   sellerName, 
  //   autoScrapeInterval, 
  //   isAutoEnabled,
  //   isScheduled 
  // });
  return (
    <DashboardCard className={styles.card}>
      <div className="space-y-4">
        {/* Status Header - Theo theme design */}
        <div className={styles.cardHeader}>
          <div className="flex items-center gap-3">
            <FontAwesomeIcon 
              icon={faStore} 
              className="text-lg" 
              style={{ color: 'var(--brand-primary)' }}
            />
            <span 
              className="font-semibold font-['Poppins']"
              style={{ color: 'var(--text-primary)' }}
            >
              {sellerName}
            </span>
          </div>
          <AutoScraperStatusBadge 
            status={isRunning ? 'ACTIVE' : (isScheduled ? 'AVAILABLE' : 'CANCELLED')}
            nextRun={nextRun}
          />
        </div>

        {/* Auto Scraper Controls - New toggle-based style */}
        <div className="flex items-start lg:items-center flex-col lg:flex-row gap-6 pt-4 overflow-hidden" 
             style={{ borderColor: 'var(--border-color)' }}
             >
          <DashboardToggle
            label="Auto Scrape"
            isActive={isAutoEnabled}
            onChange={() => onToggle()}
            disabled={isLoading || isRunning}
          />

{/* Adjust Interval is disabled temporarily */}
        </div>
          {isAutoEnabled && (
            <div className="flex items-center gap-2 cursor-not-allowed w-full">
              <span className={styles.toggleLabel}>
                Interval:
              </span>
              <select
                value={autoScrapeInterval || 24}
                onChange={(e) => {
                  if (onIntervalChange) {
                    // console.log('Interval changed:', { sellerId, newInterval: Number(e.target.value) });
                    onIntervalChange(sellerId, Number(e.target.value));
                  }
                }}
                className={styles.selectInterval}
              >
                <option value={24}>Every 24 hours</option>
                {/* <option value={48}>Every 2 days</option>
                <option value={168}>Every Week</option> */}
              </select>
            </div>
          )}

        {/* Warning for no interval configured */}
        {isAutoEnabled && (!autoScrapeInterval || autoScrapeInterval <= 0) && (
          <div 
            className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 mt-2"
          >
            ⚠️ No interval configured - auto scraper won't work
          </div>
        )}

        {/* Schedule Information */}
        {isAutoEnabled && nextRun && (
          <div 
            className="text-sm font-['Poppins'] mt-3" 
            style={{ color: 'var(--text-primary-muted)' }}
          >
            <FontAwesomeIcon icon={faClock} className="mr-2" />
            Next run: {nextRun.toLocaleDateString()} {nextRun.toLocaleTimeString()}
          </div>
        )}
      </div>
    </DashboardCard>
  )
}