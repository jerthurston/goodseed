import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperStatusBadgeProps {
  isScheduled: boolean;
  isRunning?: boolean;
  nextRun?: Date;
  size?: 'sm' | 'md' | 'lg';
}

export default function AutoScraperStatusBadge({
  isScheduled,
  isRunning = false,
  nextRun,
  size = 'md'
}: AutoScraperStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm', 
    lg: 'px-4 py-2 text-base'
  }

  // Determine status and style based on running state
  const getStatusConfig = () => {
    if (isRunning) {
      return {
        backgroundColor: 'var(--status-warning-bg)',
        color: 'var(--status-warning-text)', 
        dotColor: 'var(--status-warning-text)',
        text: 'Running...',
        animate: true
      };
    } else if (isScheduled) {
      return {
        backgroundColor: 'var(--brand-primary)',
        color: 'var(--bg-main)',
        dotColor: 'var(--bg-main)', 
        text: 'Auto Active',
        animate: false
      };
    } else {
      return {
        backgroundColor: 'var(--bg-section)',
        color: 'var(--text-primary)',
        dotColor: 'var(--text-primary-muted)',
        text: 'Manual Only',
        animate: false
      };
    }
  };

  const statusConfig = getStatusConfig();

  const badgeStyle = {
    backgroundColor: statusConfig.backgroundColor,
    color: statusConfig.color,
    border: '2px solid var(--border-color)',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600'
  };

  return (
    <span 
      className={`${styles.badge} inline-flex items-center gap-2 ${sizeClasses[size]}`}
      style={badgeStyle}
    >
      <div 
        className={`w-2 h-2 rounded-full ${statusConfig.animate ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: statusConfig.dotColor
        }} 
      />
      {statusConfig.text}
    </span>
  )
}