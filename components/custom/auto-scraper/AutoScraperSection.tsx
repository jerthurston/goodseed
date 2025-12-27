import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faClock, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton';
import { SellerAutoScraperCard, AutoScraperStatusBadge } from '@/components/custom/auto-scraper';
import { useAutoScraper } from '@/hooks/admin/auto-scrape/useAutoScraper';
import { useSellerAutoScraperStatus } from '@/hooks/admin/auto-scrape/useAutoScraperStatus';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';

interface AutoScraperSectionProps {
  seller: {
    id: string;
    name: string;
    isAutoEnabled: boolean;
    autoScrapeInterval: number | null;
  };
  onRefresh?: () => void;
}

export default function AutoScraperSection({ seller, onRefresh }: AutoScraperSectionProps) {
  const {
    startSellerAutoScraper,
    stopSellerAutoScraper,
    isLoading,
  } = useAutoScraper();

  // Real-time status monitoring for this specific seller
  const { 
    status: sellerStatus, 
    isLoading: isStatusLoading,
    refreshStatus 
  } = useSellerAutoScraperStatus(seller.id);

  const handleToggle = async () => {
    try {
      const action = seller.isAutoEnabled ? 'stop' : 'start';
      
      if (action === 'start') {
        await startSellerAutoScraper.mutateAsync(seller.id);
        toast.success(`Auto scraper started for ${seller.name}`);
      } else {
        await stopSellerAutoScraper.mutateAsync(seller.id);
        toast.success(`Auto scraper stopped for ${seller.name}`);
      }
      onRefresh?.();
      refreshStatus(); // Refresh real-time status
    } catch (error) {
      console.error(`Auto scraper toggle failed:`, error);
      toast.error(`Failed to ${seller.isAutoEnabled ? 'stop' : 'start'} auto scraper`);
    }
  };

  return (
    <DashboardCard className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faRobot} className="text-xl" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="font-['Archivo_Black'] text-xl uppercase" style={{ color: 'var(--text-primary)' }}>
              Auto Scraper Schedule Information
            </h2>
          </div>
          <p className="text-sm font-['Poppins'] mt-1" style={{ color: 'var(--text-primary-muted)' }}>
            Advanced auto scraping configuration and control
          </p>
        </div>
        <AutoScraperStatusBadge 
          status={seller.isAutoEnabled ? 'SCHEDULED' : 'CANCELLED'}
          size="lg"
        />
      </div>
      
      <div className={styles.cardBody}>
        {/* Real-time Status Indicator */}
        {isStatusLoading && (
          <div className="mb-4 text-center py-2">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Refreshing status...
            </div>
          </div>
        )}
        
        {/* Enhanced Seller Auto Scraper Card
        <SellerAutoScraperCard
          sellerId={seller.id}
          sellerName={seller.name}
          isScheduled={seller.isAutoEnabled}
          isRunning={sellerStatus?.data?.isRunning || false}
          nextRun={sellerStatus?.data?.nextScheduledRun ? new Date(sellerStatus.data.nextScheduledRun) : undefined}
          onToggle={handleToggle}
          isLoading={isLoading || isStatusLoading}
        /> */}
        
        {/* Additional Configuration Panel */}
        <div 
          className="mt-6 p-4 border-[3px]"
          style={{ 
            backgroundColor: 'var(--bg-section)',
            borderColor: 'var(--border-color)',
            boxShadow: '4px 4px 0 var(--border-color)'
          }}
        >
          <h4 className="font-['Poppins'] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Configuration Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="font-['Poppins'] text-sm" style={{ color: 'var(--text-primary-muted)' }}>
                Current Status
              </div>
              <div 
                className={`font-['Poppins'] font-semibold text-lg`}
                style={{ 
                  color: sellerStatus?.data?.isRunning 
                    ? 'var(--status-warning-text)' 
                    : seller.isAutoEnabled 
                      ? 'var(--brand-primary)' 
                      : 'var(--text-primary-muted)' 
                }}
              >
                {sellerStatus?.data?.isRunning 
                  ? 'Running' 
                  : seller.isAutoEnabled 
                    ? 'Active' 
                    : 'Inactive'
                }
              </div>
            </div>
            
            <div className="text-center p-3 border-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="font-['Poppins'] text-sm" style={{ color: 'var(--text-primary-muted)' }}>
                Interval
              </div>
              <div className="font-['Poppins'] font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {seller.autoScrapeInterval ? `${seller.autoScrapeInterval}h` : 'Not set'}
              </div>
            </div>
            
            <div className="text-center p-3 border-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="font-['Poppins'] text-sm" style={{ color: 'var(--text-primary-muted)' }}>
                Next Run
              </div>
              <div className="font-['Poppins'] font-semibold text-lg" style={{ color: 'var(--accent-cta)' }}>
                {sellerStatus?.data?.nextScheduledRun 
                  ? new Date(sellerStatus.data.nextScheduledRun).toLocaleString()
                  : 'TBD'
                }
              </div>
            </div>
          </div>
          
          {seller.isAutoEnabled && (
            <div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="text-green-600" />
                <span className="text-sm font-['Poppins'] text-green-800">
                  Auto scraper is active and will run every {seller.autoScrapeInterval} hours
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}