import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperOverviewProps {
  stats: {
    totalSellers: number;
    activeSellers: number;
    pendingJobs: number;
    lastRun?: Date;
  };
}

export default function AutoScraperOverview({ stats }: AutoScraperOverviewProps) {
  return (
    <DashboardCard className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 
          className="text-lg font-semibold font-['Poppins']" 
          style={{ color: 'var(--text-primary)' }}
        >
          Auto Scraper Overview
        </h3>
      </div>
      
      <div className={styles.cardBody}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stats Cards với theme colors */}
          <div 
            className="text-center p-4"
            style={{ 
              backgroundColor: 'var(--bg-section)',
              border: '3px solid var(--border-color)',
              boxShadow: '4px 4px 0 var(--border-color)'
            }}
          >
            <div 
              className="text-2xl font-bold font-['Poppins']"
              style={{ color: 'var(--text-primary)' }}
            >
              {stats.totalSellers}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Total Sellers
            </div>
          </div>
          
          <div 
            className="text-center p-4"
            style={{ 
              backgroundColor: 'var(--brand-primary)',
              border: '3px solid var(--border-color)',
              boxShadow: '4px 4px 0 var(--border-color)'
            }}
          >
            <div 
              className="text-2xl font-bold font-['Poppins']"
              style={{ color: 'var(--bg-main)' }}
            >
              {stats.activeSellers}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--bg-main)' }}
            >
              Auto Active
            </div>
          </div>
          
          <div 
            className="text-center p-4"
            style={{ 
              backgroundColor: 'var(--accent-cta)',
              border: '3px solid var(--border-color)',
              boxShadow: '4px 4px 0 var(--border-color)'
            }}
          >
            <div 
              className="text-2xl font-bold font-['Poppins']"
              style={{ color: 'var(--text-primary)' }}
            >
              {stats.pendingJobs}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary)' }}
            >
              Pending Jobs
            </div>
          </div>
          
          <div 
            className="text-center p-4"
            style={{ 
              backgroundColor: 'var(--bg-section)',
              border: '3px solid var(--border-color)',
              boxShadow: '4px 4px 0 var(--border-color)'
            }}
          >
            <div 
              className="text-2xl font-bold font-['Poppins']"
              style={{ color: 'var(--text-primary)' }}
            >
              {stats.totalSellers - stats.activeSellers}
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Manual Only
            </div>
          </div>
        </div>
        
        {stats.lastRun && (
          <div 
            className="text-sm text-center mt-4 font-['Poppins']"
            style={{ color: 'var(--text-primary-muted)' }}
          >
            Last auto scrape run: {stats.lastRun.toLocaleDateString()} at {stats.lastRun.toLocaleTimeString()}
          </div>
        )}
      </div>
    </DashboardCard>
  )
}