import { useState } from 'react';
import { toast } from 'sonner';
import { useAutoScraper } from '@/hooks/admin/auto-scrape/useAutoScraper';
import { useBulkAutoScraperStatus } from '@/hooks/admin/auto-scrape/useAutoScraperStatus';
import { useJobStatistics } from '@/hooks/admin/auto-scrape/useJobStatistics';
import { SellerUI } from '@/types/seller.type';
import { 
  AutoScraperControlPanel, 
  AutoScraperOverview,
  SellerAutoScraperCard 
} from '@/components/custom/auto-scraper';
import { DashboardCard, DashboardCardHeader } from './DashboardCard';
import styles from './dashboardAdmin.module.css';
import { apiLogger } from '@/lib/helpers/api-logger';

interface AutoScraperTabContentProps {
  sellers: SellerUI[];
  refetchSellers: () => void;
}

export default function AutoScraperTabContent({ 
  sellers, 
  refetchSellers 
}: AutoScraperTabContentProps) {
  const {
    startAllAutoScraper,
    stopAllAutoScraper,
    updateSellerInterval,
    isLoading,
    isBulkOperationLoading,
  } = useAutoScraper();

  // Real-time status monitoring
  const { 
    status: autoScraperStatus, 
    isLoading: isStatusLoading,
    refreshAllStatus 
  } = useBulkAutoScraperStatus();

  // Real-time job statistics monitoring
  const { 
    jobStats, 
    isLoading: isJobStatsLoading,
    refreshJobStats 
  } = useJobStatistics();

  // --> Log result jobstats
  apiLogger.debug('[UI Component] Log result jobstats', { jobStats });

  // Calculate stats với real-time data or fallback to sellers data
  const autoScraperStats = {
    totalSellers: autoScraperStatus?.data?.totalSellers || sellers.length,
    activeSellers: autoScraperStatus?.data?.activeSellers || sellers.filter(s => s.isAutoEnabled).length,
    jobCounts: jobStats?.data?.jobCounts || {
      CREATED: 0,
      WAITING: 0,
      DELAYED: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
      SCHEDULED: 0
    },
    summary: jobStats?.data?.summary,
    lastRun: jobStats?.data?.lastRun ? new Date(jobStats.data.lastRun) : undefined,
    nextScheduledRun: jobStats?.data?.nextScheduledRun ? new Date(jobStats.data.nextScheduledRun) : undefined,
  };

  // Get number of active auto-scrapers from stats
  const activeAutoScrapers = jobStats?.data?.summary?.activeAutoScrapers || 0;

  // Extract seller statuses from bulk status data
  const sellerStatuses = autoScraperStatus?.data?.sellers || {};

  // Get active sellers list for control panel
  const activeSellers = sellers
    .filter(seller => seller.isAutoEnabled)
    .map(seller => seller.id);

  const handleBulkAction = async (action: 'start' | 'stop', startTime?: Date) => {
    try {
      // Check for eligible sellers before starting auto scraper: chỉ với những seller đủ điều kiện có active và autoScrapeInterval > 0
      if (action === 'start') {

        const eligibleSellers = sellers.filter(s => s.isActive && s.autoScrapeInterval && s.autoScrapeInterval > 0);
        
        if (eligibleSellers.length === 0) {
          toast.warning('⚠️ No sellers configured for auto scraping', {
            description: 'Please enable auto scraping for individual sellers first. Go to seller details to configure auto scrape intervals.',
            duration: 8000,
            action: {
              label: 'View Sellers',
              onClick: () => {
                // Could redirect to sellers page or scroll to seller management
                const element = document.querySelector('[data-testid="seller-management"]');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }
          });
          return; // Early return without proceeding
        }
        
        // Show custom start time if provided
        const timeInfo = startTime 
          ? ` starting at ${startTime.toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`
          : '';
          
        toast.info(`🚀 Starting auto scraper for ${eligibleSellers.length} eligible sellers${timeInfo}...`, {
          description: 'Previous auto jobs will be cancelled and rescheduled. This may temporarily increase cancelled job count.',
          duration: 4000
        });
        
        // Pass startTime to API
        await startAllAutoScraper.mutateAsync(startTime);
      } else {
        await stopAllAutoScraper.mutateAsync();
      }
      
      // Force multiple refreshes to ensure data consistency
      await Promise.all([
        refetchSellers(), // Refresh sellers data
        refreshAllStatus(), // Refresh auto scraper status  
        refreshJobStats() // Refresh job statistics
      ]);
      
      // Add a delayed refresh to handle potential race conditions
      setTimeout(() => {
        refetchSellers();
        refreshAllStatus();
        refreshJobStats();
      }, 1000);
      
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
      
      // Enhanced error handling with toast
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Failed to ${action} auto scraper`, {
        description: errorMessage,
        duration: 6000
      });
    }
  };

  const handleSellerToggle = async (sellerId: string) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller) return;
      
      // Determine new interval value
      const newInterval = seller.autoScrapeInterval && seller.autoScrapeInterval > 0 ? null : 24; // Default to 24 hours
      const action = newInterval ? 'enable' : 'disable';
      
      // Show loading toast
      const loadingToast = toast.loading(`${action === 'enable' ? 'Enabling' : 'Disabling'} auto scraper for ${seller.name}...`);
      
      // Update seller's autoScrapeInterval
      await updateSellerInterval.mutateAsync({ sellerId, interval: newInterval });
      
      // Refresh data
      refetchSellers();
      refreshAllStatus();
      refreshJobStats();
      
      // Success toast is handled by mutation's onSuccess
      toast.dismiss(loadingToast);
    } catch (error) {
      apiLogger.logError(`Seller toggle failed for ${sellerId}:`, error as Error);
      
      // Error toast is handled by mutation's onError
      const seller = sellers.find(s => s.id === sellerId);
      toast.error(`❌ Failed to ${seller?.autoScrapeInterval ? 'disable' : 'enable'} auto scraper for ${seller?.name || 'seller'}`, {
        duration: 6000
      });
    }
  };

  const handleIntervalChange = async (sellerId: string, interval: number) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller) return;

      // Use the actual API mutation
      await updateSellerInterval.mutateAsync({ sellerId, interval });

      // Refresh data
      refetchSellers();
      refreshAllStatus();
      refreshJobStats();
    } catch (error) {
      // Error already handled by mutation's onError
      apiLogger.logError('Interval change failed:', error as Error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Indicator */}
      {(isStatusLoading || isJobStatsLoading) && (
        <div className="text-center py-2">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1 text-sm font-['Poppins']"
            style={{ color: 'var(--text-primary-muted)' }}
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Updating auto scraper status...
          </div>
        </div>
      )}
      
      {/* Auto Scraper Overview */}
      <AutoScraperOverview 
        stats={autoScraperStats} 
        isLoading={isStatusLoading || isJobStatsLoading}
      />
      
      {/* Bulk Control Panel */}
      <AutoScraperControlPanel
        lastRun={autoScraperStats.lastRun}
        totalSellers={sellers.length}
        activeSellers={activeSellers}
        activeAutoScrapers={activeAutoScrapers}
        onBulkAction={handleBulkAction}
        isLoading={isBulkOperationLoading}
      />
      
      {/* Individual Seller Controls */}
      <DashboardCard className={styles.card} data-testid="seller-management">
        <DashboardCardHeader className={styles.cardHeader}>
         <div className='flex flex-col justify-start'>
           <h3 
            className="text-lg font-semibold font-['Poppins']"
            style={{ color: 'var(--text-primary)' }}
          >
            Individual Seller Configuration
          </h3>
          <p 
            className="text-sm font-['Poppins']"
            style={{ color: 'var(--text-primary-muted)' }}
          >
            Configure auto scraping for each seller individually. Enable auto scraping here to use the "Start All" feature above.
          </p>
         </div>
        </DashboardCardHeader>
        
        <div className={styles.cardBody}>
          <div className="grid grid-cols-1 gap-4">
            {sellers.map((seller) => {
              const sellerStatus = sellerStatuses[seller.id];
              
              return (
                <SellerAutoScraperCard
                  key={seller.id}
                  sellerId={seller.id}
                  sellerName={seller.name}
                  isScheduled={seller.autoScrapeInterval != null && seller.autoScrapeInterval > 0}
                  isRunning={sellerStatus?.isRunning || false}
                  nextRun={sellerStatus?.nextScheduledRun}
                  autoScrapeInterval={seller.autoScrapeInterval}
                  onToggle={() => handleSellerToggle(seller.id)}
                  onIntervalChange={handleIntervalChange}
                  isLoading={isLoading || isStatusLoading}
                />
              );
            })}
          </div>
          
          {sellers.length === 0 && (
            <div 
              className="text-center py-8 font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              No sellers found. Add sellers first to enable auto scraping.
            </div>
          )}
          
          {sellers.length > 0 && sellers.every(s => !s.autoScrapeInterval || s.autoScrapeInterval <= 0) && (
            <div 
              className="text-center py-6 px-4 rounded-lg border border-amber-200 bg-amber-50 mt-4"
            >
              <div className="text-amber-800 font-medium mb-2">
                ⚠️ Auto Scraping Not Configured
              </div>
              <div className="text-amber-700 text-sm">
                None of your sellers have auto scraping intervals configured. 
                Please go to individual seller detail pages to set up auto scraping schedules.
              </div>
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}