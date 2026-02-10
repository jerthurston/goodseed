/**
 * Memory Cleanup Utilities
 * 
 * Provides utilities for cleaning up memory after heavy operations like web scraping.
 * Helps prevent memory leaks in long-running worker processes.
 * 
 * USAGE:
 * ```typescript
 * // After completing a scraping job
 * await cleanupAfterJob('truenorthseedbank', productsArray);
 * ```
 */

import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Clean up memory after completing a job
 * 
 * @param jobName - Name of the job for logging
 * @param dataArrays - Arrays to clear (optional)
 */
export async function cleanupAfterJob(
    jobName: string,
    ...dataArrays: any[][]
): Promise<void> {
    try {
        const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Clear data arrays
        if (dataArrays && dataArrays.length > 0) {
            for (const arr of dataArrays) {
                if (Array.isArray(arr)) {
                    arr.length = 0; // Clear array
                }
            }
        }
        
        // Force garbage collection if available (requires --expose-gc flag)
        if (global.gc) {
            global.gc();
            
            const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
            const freed = memBefore - memAfter;
            
            apiLogger.debug(`[Memory Cleanup] Completed for ${jobName}`, {
                memoryBeforeMB: memBefore.toFixed(2),
                memoryAfterMB: memAfter.toFixed(2),
                freedMB: freed.toFixed(2),
            });
        } else {
            apiLogger.debug(`[Memory Cleanup] Arrays cleared for ${jobName} (GC not available)`);
        }
    } catch (error) {
        apiLogger.logError(
            `[Memory Cleanup] Failed for ${jobName}`,
            error instanceof Error ? error : new Error(String(error))
        );
    }
}

/**
 * Get current memory usage stats
 */
export function getMemoryStats() {
    const usage = process.memoryUsage();
    return {
        heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: (usage.rss / 1024 / 1024).toFixed(2),
        externalMB: (usage.external / 1024 / 1024).toFixed(2),
    };
}

/**
 * Log memory usage
 */
export function logMemoryUsage(label: string) {
    const stats = getMemoryStats();
    apiLogger.info(`[Memory Stats] ${label}`, stats);
}
