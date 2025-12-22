import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faClock, faPlay, faStop, faCog } from '@fortawesome/free-solid-svg-icons';
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import AutoScraperStatusBadge from './AutoScraperStatusBadge';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface SellerAutoScraperCardProps {
  sellerId: string;
  sellerName: string;
  isScheduled: boolean;
  isRunning?: boolean;
  nextRun?: Date;
  onToggle: () => void;
  isLoading: boolean;
}

export default function SellerAutoScraperCard({
  sellerId,
  sellerName,
  isScheduled,
  isRunning = false,
  nextRun,
  onToggle,
  isLoading
}: SellerAutoScraperCardProps) {
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
            isScheduled={isScheduled}
            isRunning={isRunning}
            nextRun={nextRun}
          />
        </div>

        {/* Schedule Information */}
        {isScheduled && nextRun && (
          <div 
            className="text-sm font-['Poppins']" 
            style={{ color: 'var(--text-primary-muted)' }}
          >
            <FontAwesomeIcon icon={faClock} className="mr-2" />
            Next run: {nextRun.toLocaleDateString()} {nextRun.toLocaleTimeString()}
          </div>
        )}

        {/* Controls - Sử dụng dashboard button styles */}
        <div className={styles.cardFooter}>
          {isScheduled ? (
            <DashboardButton
              onClick={onToggle}
              disabled={isLoading || isRunning}
              variant="danger"
              className={styles.button}
            >
              <FontAwesomeIcon icon={faStop} className="mr-2" />
              {isRunning ? 'Running...' : 'Stop Auto'}
            </DashboardButton>
          ) : (
            <DashboardButton
              onClick={onToggle}
              disabled={isLoading || isRunning}
              variant="primary"
              className={styles.button}
            >
              <FontAwesomeIcon icon={faPlay} className="mr-2" />
              Start Auto
            </DashboardButton>
          )}
          
          <DashboardButton
            variant="outline"
            className={styles.button}
            onClick={() => {/* TODO: Open schedule config modal */}}
          >
            <FontAwesomeIcon icon={faCog} className="mr-2" />
            Configure
          </DashboardButton>
        </div>
      </div>
    </DashboardCard>
  )
}