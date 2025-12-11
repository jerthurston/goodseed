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
 * Set thành false để tắt hoàn toàn console logs ngay cả trong development
 */
const ENABLE_DEV_LOGGING = true;

/**
 * Kiểm tra xem có nên log hay không dựa trên environment và flag
 */
const shouldLog = (level: 'dev' | 'prod' = 'dev'): boolean => {
    if (level === 'prod') {
        return true; // Error logs luôn được log
    }

    return process.env.NODE_ENV === 'development' && ENABLE_DEV_LOGGING;
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
     */
    toggleDevLogging: () => {
        if (process.env.NODE_ENV === 'development') {
            globalThis.ENABLE_DEV_LOGGING = !globalThis.ENABLE_DEV_LOGGING;
            const newState = globalThis.ENABLE_DEV_LOGGING;
            console.log(`[API-LOGGER] Development logging ${newState ? 'ENABLED' : 'DISABLED'}`);
            return newState;
        } else {
            console.warn('[API-LOGGER] Toggle logging only available in development mode');
            return false;
        }
    },

    /**
     * Kiểm tra trạng thái logging hiện tại
     */
    getLoggingStatus: () => {
        return {
            environment: process.env.NODE_ENV,
            devLoggingEnabled: ENABLE_DEV_LOGGING,
            shouldLogDev: shouldLog('dev'),
            shouldLogProd: shouldLog('prod')
        };
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