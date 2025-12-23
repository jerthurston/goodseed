import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton';
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperControlPanelProps {
  totalSellers: number;
  activeSellers: string[];
  activeAutoScrapers: number; // Number of currently scheduled auto-scrapers
  onBulkAction: (action: 'start' | 'stop') => void;
  isLoading: boolean;
}

export default function AutoScraperControlPanel({
  totalSellers,
  activeSellers,
  activeAutoScrapers,
  onBulkAction,
  isLoading
}: AutoScraperControlPanelProps) {
  // Logic for button states
  const hasScheduledJobs = activeAutoScrapers > 0;
  const canStartAll = !hasScheduledJobs && !isLoading;
  const canStopAll = hasScheduledJobs && !isLoading;
  return (
    <DashboardCard className={styles.card}>
      <div className="space-y-6">
        {/* Stats Overview - Theo theme design */}
        {/* <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div 
              className="text-2xl font-bold font-['Poppins']" 
              style={{ color: 'var(--text-primary)' }}
            >
              {totalSellers}
            </div>
            <div 
              className="text-sm font-['Poppins']" 
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Total Sellers
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold font-['Poppins']" 
              style={{ color: 'var(--brand-primary)' }}
            >
              {activeSellers.length}
            </div>
            <div 
              className="text-sm font-['Poppins']" 
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Auto Active
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold font-['Poppins']" 
              style={{ color: 'var(--accent-cta)' }}
            >
              {totalSellers - activeSellers.length}
            </div>
            <div 
              className="text-sm font-['Poppins']" 
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Manual Only
            </div>
          </div>
        </div> */}

        {/* Status Info */}
        {hasScheduledJobs && (
          <div 
            className="text-center p-3 rounded-lg border-2"
            style={{ 
              backgroundColor: 'var(--accent-cta)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            <div className="font-['Poppins'] font-semibold">
              ✅ Auto-Scrapers Active ({activeAutoScrapers} running)
            </div>
            <div 
              className="text-sm mt-1 font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Auto-scrapers are scheduled and running. Use "Stop All" to clear and reschedule.
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="flex gap-4 justify-center">
          <DashboardButton
            onClick={() => onBulkAction('start')}
            disabled={!canStartAll}
            variant="primary"
            className={styles.button}
            title={hasScheduledJobs 
              ? `Auto-scrapers already running (${activeAutoScrapers}). Stop All first to reschedule.` 
              : 'Start auto-scraping for all enabled sellers'
            }
          >
            <FontAwesomeIcon icon={faPlay} className="mr-2" />
            RUN
            {hasScheduledJobs && (
              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                {activeAutoScrapers} Running
              </span>
            )}
          </DashboardButton>
          
          <DashboardButton
            onClick={() => onBulkAction('stop')}
            disabled={!canStopAll}
            variant="danger"
            className={styles.button}
            title={hasScheduledJobs 
              ? `Stop ${activeAutoScrapers} running auto-scrapers` 
              : 'No auto-scrapers currently running'
            }
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            PAUSE
            {hasScheduledJobs && (
              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                {activeAutoScrapers}
              </span>
            )}
          </DashboardButton>
        </div>
      </div>
    </DashboardCard>
  )
}