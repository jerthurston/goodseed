import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

// Use database ScrapeJobStatus enum (sync with Bull Queue states)
type ScrapeJobStatus = 'CREATED' | 'WAITING' | 'DELAYED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface AutoScraperStatusBadgeProps {
  status: ScrapeJobStatus | 'AVAILABLE'; // Add SCHEDULED for auto sellers overview
  nextRun?: Date;
  size?: 'sm' | 'md' | 'lg';
}

function getStatusConfig(status: ScrapeJobStatus | 'AVAILABLE'): {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  label: string;
  shouldAnimate: boolean;
} {
  switch (status) {
    case 'ACTIVE':
      return {
        backgroundColor: 'var(--brand-primary)',
        textColor: 'var(--bg-main)',
        borderColor: 'var(--brand-primary)',
        label: 'Running',
        shouldAnimate: true
      };
    case 'COMPLETED':
      return {
        backgroundColor: '#10b981', // green-500
        textColor: 'white',
        borderColor: '#10b981',
        label: 'Completed',
        shouldAnimate: false
      };
    case 'FAILED':
      return {
        backgroundColor: '#ef4444', // red-500
        textColor: 'white',
        borderColor: '#ef4444',
        label: 'Failed',
        shouldAnimate: false
      };
    case 'CANCELLED':
      return {
        backgroundColor: '#6b7280', // gray-500
        textColor: 'white',
        borderColor: '#6b7280',
        label: 'Cancelled',
        shouldAnimate: false
      };
    case 'DELAYED':
    case 'AVAILABLE':
      return {
        backgroundColor: 'var(--accent-cta)',
        textColor: 'var(--text-primary)',
        borderColor: 'var(--border-color)',
        label: status === 'DELAYED' ? 'Delayed' : 'Available',
        shouldAnimate: false
      };
    case 'WAITING':
      return {
        backgroundColor: '#f59e0b', // amber-500
        textColor: 'white',
        borderColor: '#f59e0b',
        label: 'Waiting',
        shouldAnimate: true
      };
    case 'CREATED':
    default:
      return {
        backgroundColor: 'var(--bg-section)',
        textColor: 'var(--text-primary)',
        borderColor: 'var(--border-color)',
        label: 'Created',
        shouldAnimate: false
      };
  }
}

export default function AutoScraperStatusBadge({
  status,
  nextRun,
  size = 'md'
}: AutoScraperStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const statusConfig = getStatusConfig(status);

  const badgeStyle = {
    backgroundColor: statusConfig.backgroundColor,
    color: statusConfig.textColor,
    border: `2px solid ${statusConfig.borderColor}`,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600'
  };

  return (
    <span
      className={`${styles.badge} flex flex-row gap-2 ${sizeClasses[size]}`}
      style={badgeStyle}
    >
      {/* <div 
        className={`w-2 h-2 rounded-full ${statusConfig.shouldAnimate ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: statusConfig.textColor
        }} 
      /> */}
      <div className='flex flex-row items-center gap-2'>
        <div className={`${status === 'AVAILABLE' ? 'bg-green-500' : 'bg-white'} w-2 h-2 rounded-full relative`}>
          <span className={`${status === 'AVAILABLE' ? "bg-green-500 animate-ping w-2 h-2 rounded-full":"hidden"} absolute top-0 left-0`}></span>
        </div>
        <span>
          {statusConfig.label}
        </span>
      </div>

      {/* Show next run time for scheduled/delayed jobs */}
      {(status === 'AVAILABLE' || status === 'DELAYED') && nextRun && (
        <span className="text-xs opacity-75">
          ({nextRun.toLocaleTimeString()})
        </span>
      )}
    </span>
  )
}