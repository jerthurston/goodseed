import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

export class AutoScraperService {
  /**
   * Start auto scraping cho tất cả eligible sellers
   * @param startTime - Optional custom start time for the first run
   */
  static async startAllAutoScraper(startTime?: Date) {
    try {
      apiLogger.info('[AutoScraperService] Starting all auto scrapers', { 
        startTime: startTime?.toISOString() 
      });
      
      const response = await api.post('/admin/scraper/schedule-all', {
        startTime: startTime?.toISOString() // Send as ISO string
      });
      
      apiLogger.info('[AutoScraperService] Start all auto scrapers completed', {
        totalProcessed: response.data.data.totalProcessed,
        scheduled: response.data.data.scheduled,
        failed: response.data.data.failed,
        startTime: startTime?.toISOString()
      });
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to start all auto scrapers', error as Error);
      throw error;
    }
  }

  /**
   * Stop auto scraping cho tất cả sellers
   */
  static async stopAllAutoScraper() {
    try {
      apiLogger.info('[AutoScraperService] Stopping all auto scrapers');
      
      const response = await api.delete('/admin/scraper/schedule-all');
      
      apiLogger.info('[AutoScraperService] Stop all auto scrapers completed', {
        totalProcessed: response.data.data.totalProcessed,
        stopped: response.data.data.stopped
      });
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to stop all auto scrapers', error as Error);
      throw error;
    }
  }

  /**
   * Start auto scraping cho seller cụ thể
   */
  static async startSellerAutoScraper(sellerId: string) {
    try {
      apiLogger.info('[AutoScraperService] Starting auto scraper for seller', { sellerId });
      
      const response = await api.post(`/admin/sellers/${sellerId}/scraper/schedule`);
      
      apiLogger.info('[AutoScraperService] Seller auto scraper started', {
        sellerId,
        jobId: response.data.data.jobId,
        cronPattern: response.data.data.cronPattern
      });
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to start seller auto scraper', error as Error, { sellerId });
      throw error;
    }
  }

  /**
   * Stop auto scraping cho seller cụ thể  
   */
  static async stopSellerAutoScraper(sellerId: string) {
    try {
      apiLogger.info('[AutoScraperService] Stopping auto scraper for seller', { sellerId });
      
      const response = await api.delete(`/admin/sellers/${sellerId}/scraper/schedule`);
      
      apiLogger.info('[AutoScraperService] Seller auto scraper stopped', { sellerId });
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to stop seller auto scraper', error as Error, { sellerId });
      throw error;
    }
  }

  /**
   * Get auto scraper status cho seller cụ thể
   */
  static async getSellerAutoScraperStatus(sellerId: string) {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/scraper/schedule`);
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to get seller auto scraper status', error as Error, { sellerId });
      throw error;
    }
  }

  /**
   * Get health status của auto scraper system
   */
  static async getAutoScraperHealth() {
    try {
      const response = await api.get('/admin/scraper/schedule-all');
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to get auto scraper health', error as Error);
      throw error;
    }
  }

  /**
   * Get job statistics for auto scraper overview
   */
  static async getJobStatistics() {
    try {
      apiLogger.info('[AutoScraperService] Fetching job statistics');
      
      const response = await api.get('/admin/scraper/stats');
      
      apiLogger.info('[AutoScraperService] Job statistics fetched successfully');
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to get job statistics', error as Error);
      throw error;
    }
  }

  /**
   * Update seller auto scrape interval
   */
  static async updateSellerInterval(sellerId: string, interval: number | null) {
    try {
      apiLogger.info('[AutoScraperService] Updating seller auto scrape interval', { sellerId, interval });
      
      const response = await api.patch(`/admin/sellers/${sellerId}`, {
        autoScrapeInterval: interval
      });
      
      apiLogger.info('[AutoScraperService] Seller interval updated successfully', { 
        sellerId, 
        interval,
        sellerName: response.data.data?.name 
      });
      
      return response.data;
    } catch (error) {
      apiLogger.logError('[AutoScraperService] Failed to update seller interval', error as Error, { sellerId, interval });
      throw error;
    }
  }
}