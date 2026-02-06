interface LogContext {
    endpoint?: string;
    userId?: string;
    requestId?: string;
    duration?: number;
    [key: string]: unknown;
}

// Prisma error interface
interface PrismaError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    clientVersion?: string;
}

// Axios error interface  
interface AxiosError extends Error {
    response?: {
        data?: unknown;
        status?: number;
        config?: unknown;
        request?: unknown;
    };
    request?: unknown;
    config?: unknown;
}

/**
 * Global flag để tắt/bật console logs trong development
 * Có thể điều khiển qua environment variable: ENABLE_DEV_LOGGING
 * 
 * Priority:
 * 1. Environment variable: ENABLE_DEV_LOGGING=true/false
 * 2. Default: true (nếu không set)
 * 
 * @example
 * # .env.local - Tắt hoàn toàn dev logging
 * ENABLE_DEV_LOGGING=false
 * 
 * # .env.local - Bật dev logging (default)
 * ENABLE_DEV_LOGGING=true
 */
const getEnableDevLogging = (): boolean => {
    // Check environment variable first
    if (process.env.ENABLE_DEV_LOGGING !== undefined) {
        return process.env.ENABLE_DEV_LOGGING === 'true';
    }
    // Default: true for development
    return true;
};

/**
 * Kiểm tra xem có nên log hay không dựa trên environment và flag
 */
const shouldLog = (level: 'dev' | 'prod' = 'dev'): boolean => {
    if (level === 'prod') {
        return true; // Error logs luôn được log
    }

    return process.env.NODE_ENV === 'development' && getEnableDevLogging();
};

// Declare global interface để TypeScript hiểu
declare global {
    // eslint-disable-next-line no-var
    var ENABLE_DEV_LOGGING: boolean | undefined;
}

export const apiLogger = {
    /**
     * Log API requests (development only, có thể tắt bằng flag)
     */
    logRequest: (endpoint: string, params: Record<string, unknown>) => {
        if (shouldLog('dev')) {
            console.log(`[${endpoint}] Request:`, {
                timestamp: new Date().toISOString(),
                params: apiLogger.sanitizeData(params)
            });
        }
    },

    /**
     * Log API responses (development only, có thể tắt bằng flag) 
     * Với support cho custom metrics để show chi tiết hơn
     */
    logResponse: (endpoint: string, data: Record<string, unknown>, customMetrics?: Record<string, unknown>) => {
        if (shouldLog('dev')) {
            // Nếu có custom metrics, sử dụng chúng
            if (customMetrics) {
                console.log(`[${endpoint}] Response:`, {
                    timestamp: new Date().toISOString(),
                    ...customMetrics
                });
            } else {
                // Fallback về format cũ cho backward compatibility
                console.log(`[${endpoint}] Response:`, {
                    timestamp: new Date().toISOString(),
                    count: Array.isArray(data?.data) ? data.data.length : 'N/A',
                    total: data?.total || 'N/A'
                });
            }
        }
    },

    /**
     * Log errors (luôn được logged, nhưng sanitized cho production)
     */
    logError: (endpoint: string, error: Error | Record<string, unknown>, context?: LogContext) => {
        // Xác định loại lỗi để xử lý phù hợp
        const errorType = apiLogger.identifyErrorType(error);

        const errorInfo = {
            endpoint,
            timestamp: new Date().toISOString(),
            errorType,
            error: process.env.NODE_ENV === 'development'
                ? error
                : apiLogger.sanitizeErrorForProduction(error),
            context: apiLogger.sanitizeData(context),
            severity: apiLogger.getErrorSeverity(error)
        };

        // Error logs luôn hiển thị (không bị ảnh hưởng bởi ENABLE_DEV_LOGGING)
        console.error(`[${endpoint}] ${errorType} Error:`, errorInfo);

        // Production: Send to external error tracking với priority dựa trên severity
        if (process.env.NODE_ENV === 'production') {
            // TODO: Implement Sentry, LogRocket, or similar
            // const severity = errorInfo.severity;
            // Sentry.captureException(error, { 
            //   tags: { endpoint, errorType, severity }, 
            //   extra: context,
            //   level: severity === 'critical' ? 'error' : 'warning'
            // });
        }
    },

    /**
     * Development-only debug logging (có thể tắt bằng flag)
     */
    debug: (message: string, data?: Record<string, unknown>) => {
        if (shouldLog('dev')) {
            console.log(`[DEBUG] ${message}`, data ? apiLogger.sanitizeData(data) : '');
        }
    },

    /**
     * Info logging (development only, có thể tắt bằng flag)
     */
    info: (message: string, data?: Record<string, unknown>) => {
        if (shouldLog('dev')) {
            console.info(`[INFO] ${message}`, data ? apiLogger.sanitizeData(data) : '');
        }
    },

    /**
     * Warning logging (development only, có thể tắt bằng flag)
     */
    warn: (message: string, data?: Record<string, unknown>) => {
        if (shouldLog('dev')) {
            console.warn(`[WARN] ${message}`, data ? apiLogger.sanitizeData(data) : '');
        }
    },

    /**
     * Sanitize sensitive data for logging
     */
    sanitizeData: (data: Record<string, unknown> | unknown): Record<string, unknown> | unknown => {
        if (!data) return data;

        const sensitiveFields = ['password', 'apiKey', 'secret', 'token', 'authorization'];

        if (typeof data === 'object' && data !== null) {
            const sanitized = { ...data as Record<string, unknown> };

            // Remove or mask sensitive fields
            for (const field of sensitiveFields) {
                if (field in sanitized) {
                    sanitized[field] = '***REDACTED***';
                }
            }

            return sanitized;
        }

        return data;
    },

    /**
     * Identify error type for better categorization
     */
    identifyErrorType: (error: Error | Record<string, unknown>): string => {
        if (error instanceof Error) {
            // Prisma errors - Type guard để kiểm tra có code property
            if ('code' in error && typeof error.code === 'string') {
                const prismaError = error as PrismaError;
                const code = prismaError.code;
                switch (code) {
                    case 'P1017': return 'DATABASE_CONNECTION';
                    case 'P2002': return 'UNIQUE_CONSTRAINT';
                    case 'P2003': return 'FOREIGN_KEY_CONSTRAINT';
                    case 'P2025': return 'RECORD_NOT_FOUND';
                    case 'P1001': return 'DATABASE_UNREACHABLE';
                    case 'P1008': return 'DATABASE_TIMEOUT';
                    default: return code.startsWith('P') ? 'DATABASE_ERROR' : 'APPLICATION_ERROR';
                }
            }

            // Network errors
            if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                return 'NETWORK_ERROR';
            }

            // Validation errors
            if (error.name === 'ZodError') {
                return 'VALIDATION_ERROR';
            }

            return 'APPLICATION_ERROR';
        }

        // Object errors (axios, etc.)
        if (typeof error === 'object' && error !== null) {
            if ('response' in error && 'config' in error) {
                const axiosError = error as unknown as AxiosError;
                if (axiosError.response?.status) {
                    const status = axiosError.response.status;
                    if (status >= 500) return 'SERVER_ERROR';
                    if (status >= 400) return 'CLIENT_ERROR';
                }
                return 'HTTP_ERROR';
            }
            if ('code' in error) return 'SYSTEM_ERROR';
        }

        return 'UNKNOWN_ERROR';
    },

    /**
     * Get error severity level
     */
    getErrorSeverity: (error: Error | Record<string, unknown>): 'low' | 'medium' | 'high' | 'critical' => {
        if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
            const prismaError = error as PrismaError;
            const code = prismaError.code;
            switch (code) {
                case 'P1017': // Database connection closed
                case 'P1001': // Database unreachable
                case 'P1008': // Database timeout
                    return 'critical';
                case 'P2003': // Foreign key constraint
                case 'P2002': // Unique constraint
                    return 'high';
                case 'P2025': // Record not found
                    return 'medium';
                default:
                    return code.startsWith('P') ? 'high' : 'medium';
            }
        }

        if (error instanceof Error) {
            if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
                return 'critical';
            }
            if (error.name === 'ZodError') {
                return 'low';
            }
        }

        // Check axios errors
        if (typeof error === 'object' && error !== null && 'response' in error && 'config' in error) {
            const axiosError = error as unknown as AxiosError;
            if (axiosError.response?.status) {
                const status = axiosError.response.status;
                if (status >= 500) return 'critical';
                if (status === 401 || status === 403) return 'high';
                if (status >= 400) return 'medium';
            }
            return 'medium';
        }

        return 'medium';
    },

    /**
     * Sanitize error for production logging
     */
    sanitizeErrorForProduction: (error: Error | Record<string, unknown>) => {
        if (error instanceof Error) {
            const sanitized: Record<string, unknown> = {
                message: error.message,
                name: error.name,
                stack: error.stack?.split('\n').slice(0, 3).join('\n') // Only first 3 lines of stack
            };

            // Include Prisma error code if available
            if ('code' in error && typeof error.code === 'string') {
                const prismaError = error as PrismaError;
                sanitized.code = prismaError.code;
                sanitized.meta = prismaError.meta;
            }

            return sanitized;
        }

        if (typeof error === 'object' && error !== null) {
            const sanitized = { ...error as Record<string, unknown> };

            // Remove potentially sensitive fields for axios errors
            delete sanitized.config;
            delete sanitized.request;

            // Safely handle response object
            if ('response' in sanitized && typeof sanitized.response === 'object' && sanitized.response !== null) {
                const response = sanitized.response as Record<string, unknown>;
                delete response.config;
                delete response.request;
            }

            return sanitized;
        }

        return { message: String(error) };
    },

    /**
     * Performance monitoring (development và production)
     */
    logPerformance: (operation: string, duration: number, context?: LogContext) => {
        const performanceLog = {
            operation,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            context: apiLogger.sanitizeData(context)
        };

        if (shouldLog('dev')) {
            console.log(`[PERFORMANCE] ${operation}:`, performanceLog);
        }

        // Production: Send to analytics service nếu operation chậm
        if (process.env.NODE_ENV === 'production' && duration > 1000) {
            // TODO: Send slow operations to monitoring service
            // analytics.track('slow_operation', performanceLog);
        }
    },

    /**
     * Utility để thay đổi flag logging trong runtime
     * Chỉ hoạt động trong development
     * Note: Thay đổi này chỉ tồn tại trong runtime, không persist
     */
    toggleDevLogging: () => {
        if (process.env.NODE_ENV === 'development') {
            const currentState = getEnableDevLogging();
            // Toggle environment variable
            process.env.ENABLE_DEV_LOGGING = (!currentState).toString();
            const newState = getEnableDevLogging();
            console.log(`[API-LOGGER] Development logging ${newState ? 'ENABLED' : 'DISABLED'}`);
            return newState;
        } else {
            console.warn('[API-LOGGER] Toggle logging only available in development mode');
            return false;
        }
    },

    /**
     * Get current logging configuration status
     */
    getLoggingStatus: () => {
        return {
            environment: process.env.NODE_ENV,
            enableDevLogging: getEnableDevLogging(),
            shouldLogDev: shouldLog('dev'),
            shouldLogProd: shouldLog('prod')
        };
    },

    /**
     * ============================================================================
     * SCRAPER-SPECIFIC AGGREGATE LOGGING METHODS
     * ============================================================================
     * These methods reduce log spam in scrapers by aggregating repetitive logs
     * 
     * In Development:
     * - Summary logs + detailed verbose logs (samples, URLs, etc.)
     * 
     * In Production:
     * - Summary logs only (clean, essential information)
     * - No verbose details (reduces log volume and costs)
     */

    /**
     * Check if verbose mode is enabled (for detailed logs)
     * 
     * Verbose logs include:
     * - Product samples (first 3)
     * - URL lists (first 5)
     * - Crawl delays
     * - Debug details
     * 
     * Summary logs (always shown):
     * - Page progress counts
     * - Batch operation results
     * - Error logs
     * 
     * Verbose mode is ONLY enabled in development with ENABLE_DEV_LOGGING
     * Production logs show summaries only (cleaner, less noise)
     */
    isVerbose: (): boolean => {
        // Only enable verbose mode in development
        return getEnableDevLogging() && process.env.NODE_ENV === 'development';
    },

    /**
     * Log URL filtering summary instead of individual URLs
     * Reduces 100+ individual logs to 1 summary log
     * 
     * @example
     * // Instead of:
     * urls.forEach(url => console.log(`Skipping: ${url}`)); // 100+ logs
     * 
     * // Use:
     * apiLogger.logUrlFiltering({
     *   totalUrls: 150,
     *   validUrls: 120,
     *   invalidUrls: ['url1', 'url2', ...],
     *   context: 'Canuk Seeds'
     * }); // 1 log
     */
    logUrlFiltering: (params: {
        totalUrls: number;
        validUrls: number;
        invalidUrls: string[];
        context: string;
    }) => {
        const { totalUrls, validUrls, invalidUrls, context } = params;
        
        // Always log summary
        console.log(
            `🔍 [${context}] URL Filtering: ${validUrls} valid / ${totalUrls} total (${invalidUrls.length} skipped)`
        );

        // Only log details in verbose mode
        if (apiLogger.isVerbose() && invalidUrls.length > 0) {
            console.log(`   Skipped URLs (showing first 5):`);
            invalidUrls.slice(0, 5).forEach((url, i) => {
                console.log(`   ${i + 1}. ${url}`);
            });
            if (invalidUrls.length > 5) {
                console.log(`   ... and ${invalidUrls.length - 5} more`);
            }
        }
    },

    /**
     * Log page processing progress with aggregated metrics
     * Shows progress through pagination without spamming logs
     * 
     * @example
     * apiLogger.logPageProgress({
     *   page: 154,
     *   totalPages: 154,
     *   productsFound: 87,
     *   totalProductsSoFar: 13398,
     *   url: 'https://...'
     * });
     * // Output: 📊 Page 154/154: Found 87 products. Total: 13,398
     */
    logPageProgress: (params: {
        page: number;
        totalPages: number;
        productsFound: number;
        totalProductsSoFar: number;
        url: string;
    }) => {
        const { page, totalPages, productsFound, totalProductsSoFar, url } = params;
        
        // Always show page progress (important for monitoring)
        console.log(
            `📊 Page ${page}/${totalPages}: Found ${productsFound} products. Total: ${totalProductsSoFar.toLocaleString()}`
        );

        // Only show URL in verbose mode
        if (apiLogger.isVerbose()) {
            console.log(`   URL: ${url}`);
        }
    },

    /**
     * Log product extraction with sampling
     * Supports both string URLs and product objects
     * 
     * @example
     * apiLogger.logProductExtraction({
     *   products: [{ name: 'Product 1' }, ...],
     *   context: 'Canuk Seeds',
     *   additionalInfo: { category: 'Feminized' }
     * });
     */
    logProductExtraction: (params: {
        products: string[] | any[];
        context: string;
        additionalInfo?: Record<string, any>;
    }) => {
        const { products, context, additionalInfo } = params;
        
        // Always log count
        console.log(`✅ [${context}] Extracted ${products.length} products`);

        // Log additional info if provided
        if (additionalInfo && Object.keys(additionalInfo).length > 0) {
            console.log(`   Additional Info:`, JSON.stringify(additionalInfo, null, 2));
        }

        // Only log samples in verbose mode
        if (apiLogger.isVerbose() && products.length > 0) {
            console.log(`   Sample products (first 3):`);
            products.slice(0, 3).forEach((product, i) => {
                // Handle both string URLs and objects
                const displayValue = typeof product === 'string' 
                    ? product 
                    : product.name || product.url || JSON.stringify(product).substring(0, 100);
                console.log(`   ${i + 1}. ${displayValue}`);
            });
            if (products.length > 3) {
                console.log(`   ... and ${products.length - 3} more`);
            }
        }
    },

    /**
     * Log batch operation summary
     * Useful for save/update operations
     * 
     * @example
     * apiLogger.logBatchSummary({
     *   operation: 'Save Products',
     *   total: 150,
     *   successful: 145,
     *   failed: 5,
     *   duration: 12500
     * });
     * // Output: 📦 [Save Products] Completed: 145/150 successful, 5 failed in 12.5s
     */
    logBatchSummary: (params: {
        operation: string;
        total: number;
        successful: number;
        failed: number;
        duration?: number;
    }) => {
        const { operation, total, successful, failed, duration } = params;
        
        const durationStr = duration ? ` in ${(duration / 1000).toFixed(1)}s` : '';
        console.log(
            `📦 [${operation}] Completed: ${successful}/${total} successful, ${failed} failed${durationStr}`
        );
    },

    /**
     * Log crawl delay application
     * Only shown in verbose mode
     */
    logCrawlDelay: (delayMs: number, reason: string) => {
        if (apiLogger.isVerbose()) {
            console.log(`⏱️ [Crawl Delay] Waiting ${delayMs}ms (${reason})`);
        }
    }
};

/**
 * Utility for measuring operation time
 */
export const withPerformanceLogging = async <T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
): Promise<T> => {
    const startTime = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - startTime;
        apiLogger.logPerformance(operation, duration, context);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        // Type guard để đảm bảo error có đúng type
        const errorToLog = error instanceof Error ? error : new Error(String(error));
        apiLogger.logError(operation, errorToLog, { ...context, duration });
        throw error;
    }
};