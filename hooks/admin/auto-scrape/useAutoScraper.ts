import { AutoScraperService } from '@/lib/services/auto-scraper/frontend/auto-scraper.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAutoScraper() {
  const queryClient = useQueryClient();

  const startAllAutoScraper = useMutation({
    mutationFn: AutoScraperService.startAllAutoScraper,
    onSuccess: (data) => {
      const { scheduled, failed, totalProcessed } = data.data;
      
      if (failed > 0) {
        toast.warning(`⚠️ Auto scraper started for ${scheduled}/${totalProcessed} sellers. ${failed} failed.`, {
          description: 'Some sellers có thể chưa configure autoScrapeInterval hoặc thiếu scraping sources.'
        });
      } else {
        toast.success(`✅ Auto scraper started for ${scheduled} sellers`, {
          description: 'All eligible sellers đã được scheduled successfully.'
        });
      }
      
      // Invalidate relevant queries để refresh data
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['auto-scraper-health'] });
    },
    onError: (error) => {
      toast.error('❌ Failed to start auto scraper for all sellers', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      console.error('Start all auto scraper error:', error);
    },
  });

  const stopAllAutoScraper = useMutation({
    mutationFn: AutoScraperService.stopAllAutoScraper,
    onSuccess: (data) => {
      const { stopped, failed, totalProcessed } = data.data;
      
      if (failed > 0) {
        toast.warning(`⚠️ Auto scraper stopped for ${stopped}/${totalProcessed} sellers. ${failed} failed.`, {
          description: 'Some auto scraper jobs có thể đã stopped hoặc không tồn tại.'
        });
      } else {
        toast.success(`🛑 Auto scraper stopped for ${stopped} sellers`, {
          description: 'All auto scraper jobs đã được cleaned up successfully.'
        });
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['auto-scraper-health'] });
    },
    onError: (error) => {
      toast.error('❌ Failed to stop auto scraper for all sellers', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      console.error('Stop all auto scraper error:', error);
    },
  });

  const startSellerAutoScraper = useMutation({
    mutationFn: (sellerId: string) => AutoScraperService.startSellerAutoScraper(sellerId),
    onSuccess: (data) => {
      const { sellerId, status, cronPattern } = data.data;
      
      toast.success(`✅ Auto scraper started for seller`, {
        description: `Scheduled với pattern: ${cronPattern}. Next run sẽ theo schedule.`
      });
      
      // Invalidate specific seller queries
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['seller', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['auto-scraper-health'] });
    },
    onError: (error) => {
      toast.error('❌ Failed to start auto scraper for seller', {
        description: error instanceof Error ? error.message : 'Check seller configuration and try again'
      });
      console.error('Start seller auto scraper error:', error);
    },
  });

  const stopSellerAutoScraper = useMutation({
    mutationFn: (sellerId: string) => AutoScraperService.stopSellerAutoScraper(sellerId),
    onSuccess: (data) => {
      const { sellerId, status } = data.data;
      
      toast.success(`🛑 Auto scraper stopped for seller`, {
        description: 'Auto scraping job đã được removed khỏi queue.'
      });
      
      // Invalidate specific seller queries
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['seller', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['auto-scraper-health'] });
    },
    onError: (error) => {
      toast.error('❌ Failed to stop auto scraper for seller', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      console.error('Stop seller auto scraper error:', error);
    },
  });

  return {
    // Mutations
    startAllAutoScraper,
    stopAllAutoScraper,
    startSellerAutoScraper,
    stopSellerAutoScraper,
    
    // Loading states
    isStartingAll: startAllAutoScraper.isPending,
    isStoppingAll: stopAllAutoScraper.isPending,
    isStartingSeller: startSellerAutoScraper.isPending,
    isStoppingSeller: stopSellerAutoScraper.isPending,
    
    // Helper computed states
    isLoading: startAllAutoScraper.isPending || 
               stopAllAutoScraper.isPending || 
               startSellerAutoScraper.isPending || 
               stopSellerAutoScraper.isPending,
               
    isBulkOperationLoading: startAllAutoScraper.isPending || stopAllAutoScraper.isPending,
    isSellerOperationLoading: startSellerAutoScraper.isPending || stopSellerAutoScraper.isPending,
    
    // Error states
    startAllError: startAllAutoScraper.error,
    stopAllError: stopAllAutoScraper.error,
    startSellerError: startSellerAutoScraper.error,
    stopSellerError: stopSellerAutoScraper.error,
  };
}