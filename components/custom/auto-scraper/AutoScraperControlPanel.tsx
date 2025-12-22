import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton';
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperControlPanelProps {
  totalSellers: number;
  activeSellers: string[];
  onBulkAction: (action: 'start' | 'stop') => void;
  isLoading: boolean;
}

export default function AutoScraperControlPanel({
  totalSellers,
  activeSellers,
  onBulkAction,
  isLoading
}: AutoScraperControlPanelProps) {
  return (
    <DashboardCard className={styles.card}>
      <div className="space-y-6">
        {/* Stats Overview - Theo theme design */}
        <div className="grid grid-cols-3 gap-4">
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
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-4 justify-center">
          <DashboardButton
            onClick={() => onBulkAction('start')}
            disabled={isLoading}
            variant="primary"
            className={styles.button}
          >
            <FontAwesomeIcon icon={faPlay} className="mr-2" />
            Start All Auto Scrapers
          </DashboardButton>
          
          <DashboardButton
            onClick={() => onBulkAction('stop')}
            disabled={isLoading}
            variant="danger"
            className={styles.button}
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            Stop All Auto Scrapers
          </DashboardButton>
        </div>
      </div>
    </DashboardCard>
  )
}