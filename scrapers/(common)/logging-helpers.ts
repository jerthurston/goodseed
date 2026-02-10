/**
 * Progress Logger for Scraping Operations
 * 
 * Provides progress-based logging to prevent memory leaks from excessive console.log
 * Logs at 10% intervals instead of per-product to reduce log buffer accumulation
 * 
 * @example
 * const progressLogger = new ProgressLogger(1479, 'True North');
 * 
 * // In scraper loop
 * if (progressLogger.shouldLog(products.length)) {
 *   apiLogger.crawl('Progress', progressLogger.getMetadata(products.length, startTime));
 * }
 */

import { getWorkerMemoryConfig } from '@/lib/config/worker-memory.config';

export class ProgressLogger {
    private lastLoggedMilestone = 0;
    private readonly milestoneInterval = 10; // Log every 10%
    
    /**
     * @param totalItems - Total number of items to process
     * @param loggerName - Name for identification (e.g., 'True North', 'Canuk Seeds')
     */
    constructor(
        private readonly totalItems: number,
        private readonly loggerName?: string
    ) {}
    
    /**
     * Check if we should log at current progress
     * Returns true at 10%, 20%, 30%, ... 100% milestones
     */
    shouldLog(currentCount: number): boolean {
        const currentProgress = Math.floor((currentCount / this.totalItems) * 100);
        
        if (currentProgress >= this.lastLoggedMilestone + this.milestoneInterval 
            && currentProgress <= 100) {
            this.lastLoggedMilestone = currentProgress;
            return true;
        }
        return false;
    }
    
    /**
     * Get progress metadata for logging
     * Includes: progress %, scraped count, memory usage, duration
     */
    getMetadata(currentCount: number, startTime: number): Record<string, string | number> {
        const memoryUsage = process.memoryUsage();
        
        return {
            progress: `${Math.floor((currentCount / this.totalItems) * 100)}%`,
            scraped: currentCount,
            total: this.totalItems,
            memoryUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
            ...(this.loggerName ? { scraper: this.loggerName } : {})
        };
    }
    
    /**
     * Get current progress percentage
     */
    getProgress(currentCount: number): number {
        return Math.floor((currentCount / this.totalItems) * 100);
    }
    
    /**
     * Reset milestone tracking (useful for restart scenarios)
     */
    reset(): void {
        this.lastLoggedMilestone = 0;
    }
}

/**
 * Memory Monitor - Track memory usage and warn if approaching limits
 * 
 * Automatically reads configuration from environment variables:
 * - WORKER_MEMORY_LIMIT_MB
 * - WORKER_MEMORY_WARNING_THRESHOLD
 * - WORKER_MEMORY_CRITICAL_THRESHOLD
 * 
 * @example
 * // Uses environment configuration
 * const memoryMonitor = MemoryMonitor.fromEnv();
 * 
 * // Or specify custom limits
 * const memoryMonitor = new MemoryMonitor(1536, 0.80, 0.90);
 */
export class MemoryMonitor {
    private readonly heapLimitMB: number;
    private readonly warningThreshold: number;
    private readonly criticalThreshold: number;
    private readonly warningThresholdMB: number;
    private readonly criticalThresholdMB: number;
    private hasWarned = false;
    
    /**
     * Create memory monitor from environment variables
     * @returns MemoryMonitor instance configured from env
     */
    static fromEnv(): MemoryMonitor {
        const config = getWorkerMemoryConfig();
        return new MemoryMonitor(
            config.limitMB,
            config.warningThreshold,
            config.criticalThreshold
        );
    }
    
    /**
     * @param heapLimitMB - Heap limit in MB (e.g., 1536 for 1.5GB limit)
     * @param warningThreshold - Warn at this % of limit (e.g., 0.80 = 80%)
     * @param criticalThreshold - Critical at this % of limit (e.g., 0.90 = 90%)
     */
    constructor(
        heapLimitMB: number,
        warningThreshold = 0.80,
        criticalThreshold = 0.90
    ) {
        this.heapLimitMB = heapLimitMB;
        this.warningThreshold = warningThreshold;
        this.criticalThreshold = criticalThreshold;
        this.warningThresholdMB = heapLimitMB * warningThreshold;
        this.criticalThresholdMB = heapLimitMB * criticalThreshold;
    }
    
    /**
     * Check current memory usage and return status
     */
    check(): { status: 'ok' | 'warning' | 'critical', usedMB: number, percentUsed: number } {
        const usedMB = process.memoryUsage().heapUsed / 1024 / 1024;
        const percentUsed = (usedMB / this.heapLimitMB) * 100;
        
        if (usedMB >= this.criticalThresholdMB) {
            return { status: 'critical', usedMB, percentUsed };
        }
        if (usedMB >= this.warningThresholdMB) {
            if (!this.hasWarned) {
                this.hasWarned = true;
            }
            return { status: 'warning', usedMB, percentUsed };
        }
        return { status: 'ok', usedMB, percentUsed };
    }
    
    /**
     * Get formatted memory status string
     */
    getStatus(): string {
        const { status, usedMB, percentUsed } = this.check();
        return `${status.toUpperCase()}: ${usedMB.toFixed(2)}MB (${percentUsed.toFixed(1)}%)`;
    }
    
    /**
     * Get memory configuration info
     */
    getConfig() {
        return {
            limitMB: this.heapLimitMB,
            warningMB: this.warningThresholdMB,
            criticalMB: this.criticalThresholdMB,
            warningPercent: this.warningThreshold * 100,
            criticalPercent: this.criticalThreshold * 100,
        };
    }
}

/**
 * Helper to calculate estimated time remaining
 */
export function estimateTimeRemaining(
    itemsProcessed: number,
    totalItems: number,
    startTime: number
): string {
    if (itemsProcessed === 0) return 'Calculating...';
    
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / itemsProcessed;
    const itemsRemaining = totalItems - itemsProcessed;
    const estimatedMs = avgTimePerItem * itemsRemaining;
    
    const minutes = Math.floor(estimatedMs / 60000);
    const seconds = Math.floor((estimatedMs % 60000) / 1000);
    
    return `~${minutes}m ${seconds}s`;
}
