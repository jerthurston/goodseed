import { useState } from 'react';
import { useAutoScraper } from '@/hooks/admin/auto-scrape/useAutoScraper';
import { useBulkAutoScraperStatus } from '@/hooks/admin/auto-scrape/useAutoScraperStatus';
import { SellerUI } from '@/types/seller.type';
import { 
  AutoScraperControlPanel, 
  AutoScraperOverview,
  SellerAutoScraperCard 
} from '@/components/custom/auto-scraper';
import { DashboardCard, DashboardCardHeader } from './DashboardCard';
import styles from './dashboardAdmin.module.css';

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
    startSellerAutoScraper,
    stopSellerAutoScraper,
    isLoading,
    isBulkOperationLoading,
  } = useAutoScraper();

  // Real-time status monitoring
  const { 
    status: autoScraperStatus, 
    isLoading: isStatusLoading,
    refreshAllStatus 
  } = useBulkAutoScraperStatus();

  // Calculate stats với real-time data or fallback to sellers data
  const autoScraperStats = {
    totalSellers: autoScraperStatus?.data?.totalSellers || sellers.length,
    activeSellers: autoScraperStatus?.data?.activeSellers || sellers.filter(s => s.isAutoEnabled).length,
    pendingJobs: autoScraperStatus?.data?.pendingJobs || 0,
    lastRun: autoScraperStatus?.data?.lastBulkRun ? new Date(autoScraperStatus.data.lastBulkRun) : undefined,
  };

  // Extract seller statuses from bulk status data
  const sellerStatuses = autoScraperStatus?.data?.sellers || {};

  // Get active sellers list for control panel
  const activeSellers = sellers
    .filter(seller => seller.isAutoEnabled)
    .map(seller => seller.id);

  const handleBulkAction = async (action: 'start' | 'stop') => {
    try {
      if (action === 'start') {
        await startAllAutoScraper.mutateAsync();
      } else {
        await stopAllAutoScraper.mutateAsync();
      }
      
      // Force multiple refreshes to ensure data consistency
      await Promise.all([
        refetchSellers(), // Refresh sellers data
        refreshAllStatus() // Refresh auto scraper status  
      ]);
      
      // Add a delayed refresh to handle potential race conditions
      setTimeout(() => {
        refetchSellers();
        refreshAllStatus();
      }, 1000);
      
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    }
  };

  const handleSellerToggle = async (sellerId: string) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller) return;
      
      const action = seller.isAutoEnabled ? 'stop' : 'start';
      
      if (action === 'start') {
        await startSellerAutoScraper.mutateAsync(sellerId);
      } else {
        await stopSellerAutoScraper.mutateAsync(sellerId);
      }
      refetchSellers(); // Refresh sellers data  
      refreshAllStatus(); // Refresh auto scraper status
    } catch (error) {
      console.error(`Seller toggle failed for ${sellerId}:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Indicator */}
      {isStatusLoading && (
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
      <AutoScraperOverview stats={autoScraperStats} />
      
      {/* Bulk Control Panel */}
      <AutoScraperControlPanel
        totalSellers={sellers.length}
        activeSellers={activeSellers}
        onBulkAction={handleBulkAction}
        isLoading={isBulkOperationLoading}
      />
      
      {/* Individual Seller Controls */}
      <DashboardCard className={styles.card}>
        <DashboardCardHeader className={styles.cardHeader}>
          <h3 
            className="text-lg font-semibold font-['Poppins']"
            style={{ color: 'var(--text-primary)' }}
          >
            Individual Seller Management
          </h3>
          <p 
            className="text-sm font-['Poppins']"
            style={{ color: 'var(--text-primary-muted)' }}
          >
            Configure auto scraping for each seller individually
          </p>
        </DashboardCardHeader>
        
        <div className={styles.cardBody}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sellers.map((seller) => {
              const sellerStatus = sellerStatuses[seller.id];
              return (
                <SellerAutoScraperCard
                  key={seller.id}
                  sellerId={seller.id}
                  sellerName={seller.name}
                  isScheduled={seller.isAutoEnabled || false}
                  isRunning={sellerStatus?.isRunning || false}
                  nextRun={sellerStatus?.nextScheduledRun}
                  onToggle={() => handleSellerToggle(seller.id)}
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
        </div>
      </DashboardCard>
    </div>
  );
}