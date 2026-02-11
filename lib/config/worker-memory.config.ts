/**
 * Worker Memory Configuration
 * 
 * Centralized memory configuration for worker processes.
 * Reads from environment variables to support different deployment environments.
 * 
 * USAGE:
 * - Production (Render Standard): 2GB RAM → 1536MB limit
 * - Development (Docker local): 512MB RAM → 384MB limit
 * 
 * ENVIRONMENT VARIABLES:
 * - WORKER_MEMORY_LIMIT_MB: Heap memory limit in MB (default: 1536)
 * - WORKER_MEMORY_WARNING_THRESHOLD: Warning at X% of limit (default: 0.80)
 * - WORKER_MEMORY_CRITICAL_THRESHOLD: Critical at X% of limit (default: 0.90)
 */

import { apiLogger } from '@/lib/helpers/api-logger';

export interface WorkerMemoryConfig {
    /** Heap memory limit in MB */
    limitMB: number;
    /** Warning threshold (0.0 to 1.0) */
    warningThreshold: number;
    /** Critical threshold (0.0 to 1.0) */
    criticalThreshold: number;
}

/**
 * Get worker memory configuration from environment variables
 */
export function getWorkerMemoryConfig(): WorkerMemoryConfig {
    const limitMB = parseInt(
        process.env.WORKER_MEMORY_LIMIT_MB || '1536',
        10
    );
    
    const warningThreshold = parseFloat(
        process.env.WORKER_MEMORY_WARNING_THRESHOLD || '0.80'
    );
    
    const criticalThreshold = parseFloat(
        process.env.WORKER_MEMORY_CRITICAL_THRESHOLD || '0.90'
    );
    
    // Validation
    if (isNaN(limitMB) || limitMB <= 0) {
        throw new Error(`Invalid WORKER_MEMORY_LIMIT_MB: ${process.env.WORKER_MEMORY_LIMIT_MB}`);
    }
    
    if (isNaN(warningThreshold) || warningThreshold <= 0 || warningThreshold > 1) {
        throw new Error(`Invalid WORKER_MEMORY_WARNING_THRESHOLD: ${process.env.WORKER_MEMORY_WARNING_THRESHOLD}`);
    }
    
    if (isNaN(criticalThreshold) || criticalThreshold <= 0 || criticalThreshold > 1) {
        throw new Error(`Invalid WORKER_MEMORY_CRITICAL_THRESHOLD: ${process.env.WORKER_MEMORY_CRITICAL_THRESHOLD}`);
    }
    
    if (warningThreshold >= criticalThreshold) {
        throw new Error(
            `Warning threshold (${warningThreshold}) must be less than critical threshold (${criticalThreshold})`
        );
    }
    
    return {
        limitMB,
        warningThreshold,
        criticalThreshold,
    };
}

/**
 * Log current memory configuration (useful for debugging)
 */
export function logWorkerMemoryConfig(): void {
    const config = getWorkerMemoryConfig();
    
    apiLogger.crawl('🧠 Worker Memory Configuration', {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        limitMB: config.limitMB,
        warningMB: Math.floor(config.limitMB * config.warningThreshold),
        criticalMB: Math.floor(config.limitMB * config.criticalThreshold),
        warningThreshold: `${(config.warningThreshold * 100).toFixed(0)}%`,
        criticalThreshold: `${(config.criticalThreshold * 100).toFixed(0)}%`,
        crawleeAvailableMemoryRatio: process.env.CRAWLEE_AVAILABLE_MEMORY_RATIO || 'NOT SET',
        workerConcurrency: process.env.WORKER_CONCURRENCY || 'NOT SET',
        systemMemory: {
            totalMB: Math.floor(require('os').totalmem() / 1024 / 1024),
            freeMB: Math.floor(require('os').freemem() / 1024 / 1024),
        }
    });
}
