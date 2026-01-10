import { AxiosError } from 'axios';
import { apiLogger } from '../../api-logger';

/**
 * Factory function để tạo error messages tự động cho các entity
 * Tóm tắt - Functions để sử dụng:
Sử dụng ở đâu      ||       Function            ||          Khi nào
Service Layer	        ErrorHandlers.{entity}()	    Tất cả business logic errors
API Routes	            handleAxiosError()	            External API calls
API Routes	            QuickErrorHandlers.*	        Common HTTP errors
Generic	                handleServiceError()	        Khi cần flexible entity type
Khuyến nghị: Sử dụng ErrorHandlers.{entity}() cho service layer và QuickErrorHandlers.* cho API routes vì chúng đơn giản, type-safe và cover hầu hết use cases
 */
export function createEntityErrorMessages(entityName: string, entityDisplayName: string) {
    return {
        GET: {
            DEFAULT: `Không thể tải thông tin ${entityDisplayName}`,
            401: `Không có quyền truy cập ${entityDisplayName} này`,
            403: `Bị từ chối truy cập ${entityDisplayName}`,
            404: `${entityDisplayName} không tồn tại hoặc đã bị xóa`,
            500: 'Lỗi server nội bộ, vui lòng thử lại sau'
        },
        CREATE: {
            DEFAULT: `Không thể tạo ${entityDisplayName}`,
            401: `Vui lòng đăng nhập để tạo ${entityDisplayName}`,
            403: `Bạn không có quyền tạo ${entityDisplayName}`,
            409: `${entityDisplayName} với tên này đã tồn tại`,
            413: 'File quá lớn, vui lòng chọn file nhỏ hơn'
        },
        UPDATE: {
            DEFAULT: `Không thể cập nhật ${entityDisplayName}`,
            401: `Vui lòng đăng nhập để cập nhật ${entityDisplayName}`,
            403: `Bạn không có quyền cập nhật ${entityDisplayName} này`,
            404: `${entityDisplayName} không tồn tại`,
            409: `${entityDisplayName} đã được cập nhật bởi người khác`
        },
        DELETE: {
            DEFAULT: `Không thể xóa ${entityDisplayName}`,
            401: `Vui lòng đăng nhập để xóa ${entityDisplayName}`,
            403: `Bạn không có quyền xóa ${entityDisplayName} này`,
            404: `${entityDisplayName} không tồn tại hoặc đã bị xóa`
        }
    };
}

/**
 * Registry mapping entity keys to display names
 */
export const ENTITY_DISPLAY_NAMES = {
    REVIEW: 'review',
    AI_TOOL: 'AI Tool',
    POST: 'bài viết',
    MEDIA: 'media',
    BOOKMARK: 'bookmark',
    PRODUCT: 'sản phẩm',
    CATEGORY: 'danh mục',
    USER: 'người dùng',
    COMMENT: 'bình luận',
    TAG: 'thẻ',
    CAMPAIGN: 'chiến dịch',
    NOTIFICATION: 'thông báo',
    PORTFOLIO: 'portfolio'
} as const;

/**
 * Auto-generated error messages cho tất cả entities
 */
export const ERROR_MESSAGES = Object.fromEntries(
    Object.entries(ENTITY_DISPLAY_NAMES).map(([key, displayName]) => [
        key,
        createEntityErrorMessages(key, displayName)
    ])
) as Record<keyof typeof ENTITY_DISPLAY_NAMES, ReturnType<typeof createEntityErrorMessages>>;

/**
 * Final ERROR_MESSAGES with network errors
 */
export const FINAL_ERROR_MESSAGES = {
    ...ERROR_MESSAGES,

    // Generic network errors
    NETWORK: {
        TIMEOUT: 'Yêu cầu quá thời gian chờ, vui lòng thử lại',
        CONNECTION: 'Không thể kết nối đến server, vui lòng kiểm tra kết nối mạng',
        UNKNOWN: 'Đã xảy ra lỗi không xác định'
    }
} as const;

/**
 * Type definitions
 */
export type OperationType = keyof typeof FINAL_ERROR_MESSAGES;
export type ActionType<T extends OperationType> = T extends 'NETWORK'
    ? keyof typeof FINAL_ERROR_MESSAGES.NETWORK
    : keyof ReturnType<typeof createEntityErrorMessages>;

/**
 * Interface cho error handling options
 */
interface ErrorHandlingOptions {
    /** Context để log error (service name, method name) */
    context?: string;
    /** Additional data để log */
    metadata?: Record<string, unknown>;
    /** Có log error không (default: true) */
    shouldLog?: boolean;
}

/**
 * Generic utility function để handle Axios errors với message mapping
 * 
 * @param error - Error object từ try/catch
 * @param operationType - Loại operation (REVIEW, AI_TOOL, etc.)
 * @param actionType - Loại action (LIKE, UPDATE, DELETE, GET)
 * @param options - Additional options cho logging và context
 * @returns User-friendly error message
 */
export function handleAxiosError<
    T extends OperationType,
    A extends ActionType<T>
>(
    error: unknown,
    operationType: T,
    actionType: A,
    options: ErrorHandlingOptions = {}
): string {
    const { context = 'Unknown', metadata = {}, shouldLog = true } = options;

    // Get error messages for this operation and action
    const errorMap = FINAL_ERROR_MESSAGES[operationType]?.[actionType as unknown as keyof typeof FINAL_ERROR_MESSAGES[T]];

    if (!errorMap || typeof errorMap !== 'object') {
        if (shouldLog) {
            apiLogger.logError(`Invalid error mapping: ${operationType}.${String(actionType)}`, {
                context,
                operationType,
                actionType,
                metadata
            });
        }
        return 'Đã xảy ra lỗi không xác định';
    }

    let errorMessage = (errorMap as Record<string, string>).DEFAULT;

    // Handle Axios errors
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        const responseError = error.response?.data?.error;

        // Map status code to specific message
        if (status && errorMap[status as keyof typeof errorMap]) {
            errorMessage = (errorMap as Record<string, string>)[status];
        } else if (responseError) {
            errorMessage = responseError;
        }

        // Log error với context đầy đủ
        if (shouldLog) {
            apiLogger.logError(`${context} - Axios Error`, {
                operationType,
                actionType,
                status,
                responseError,
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
                metadata
            });
        }
    }
    // Handle generic errors
    else if (error instanceof Error) {
        if (shouldLog) {
            apiLogger.logError(`${context} - Generic Error`, {
                operationType,
                actionType,
                errorMessage: error.message,
                errorName: error.name,
                metadata
            });
        }

        // Handle network errors
        if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
            errorMessage = FINAL_ERROR_MESSAGES.NETWORK.CONNECTION;
        } else if (error.message.includes('timeout')) {
            errorMessage = FINAL_ERROR_MESSAGES.NETWORK.TIMEOUT;
        }
    }
    // Handle unknown errors
    else {
        if (shouldLog) {
            apiLogger.logError(`${context} - Unknown Error`, {
                operationType,
                actionType,
                error: String(error),
                metadata
            });
        }
        errorMessage = FINAL_ERROR_MESSAGES.NETWORK.UNKNOWN;
    }

    return errorMessage;
}

/**
 * Enhanced utility function với operation type parameter
 * Thay thế các specialized functions cũ
 * 
 * @param error - Error object
 * @param operationType - Operation type (REVIEW, AI_TOOL, POST, MEDIA, etc.)
 * @param action - Action type  
 * @param context - Context string for logging
 * @param metadata - Additional metadata
 * @returns User-friendly error message
 */
export function handleServiceError<T extends OperationType>(
    error: unknown,
    operationType: T,
    action: ActionType<T>,
    context: string,
    metadata?: Record<string, unknown>
): string {
    return handleAxiosError(error, operationType, action, { context, metadata });
}

/**
 * Dynamic entity error handler - tự động detect entity type
 */
export function handleEntityError(
    error: unknown,
    entityType: keyof typeof ENTITY_DISPLAY_NAMES,
    action: string,
    context: string,
    metadata?: Record<string, unknown>
): string {
    // Validate action exists for entity
    const validActions = Object.keys(FINAL_ERROR_MESSAGES[entityType] || {});

    if (!validActions.includes(action.toUpperCase())) {
        apiLogger.logError(`Invalid action for entity: ${entityType}.${action}`, {
            entityType,
            action,
            validActions,
            context
        });
        return `Không thể thực hiện thao tác ${action} cho ${ENTITY_DISPLAY_NAMES[entityType]}`;
    }

    return handleServiceError(
        error,
        entityType,
        action.toUpperCase() as ActionType<typeof entityType>,
        context,
        metadata
    );
}

/**
 * Factory để tạo error handler cho một entity cụ thể
 */
export function createEntityErrorHandler<T extends keyof typeof ENTITY_DISPLAY_NAMES>(
    entityType: T
) {
    return (
        error: unknown,
        action: ActionType<T>,
        context: string,
        metadata?: Record<string, unknown>
    ): string => {
        return handleServiceError(error, entityType, action, context, metadata);
    };
}

/**
 * Pre-built error handlers cho common entities
 */
export const ErrorHandlers = {
    // Dynamic entity handlers
    review: createEntityErrorHandler('REVIEW'),
    aiTool: createEntityErrorHandler('AI_TOOL'),
    post: createEntityErrorHandler('POST'),
    media: createEntityErrorHandler('MEDIA'),
    bookmark: createEntityErrorHandler('BOOKMARK'),
    product: createEntityErrorHandler('PRODUCT'),
    category: createEntityErrorHandler('CATEGORY'),
    user: createEntityErrorHandler('USER'),
    comment: createEntityErrorHandler('COMMENT'),
    tag: createEntityErrorHandler('TAG'),
    campaign: createEntityErrorHandler('CAMPAIGN'),
    notification: createEntityErrorHandler('NOTIFICATION'),
    portfolio: createEntityErrorHandler('PORTFOLIO'),

    // Generic entity handler
    entity: handleEntityError
};

/**
 * Helper function để format validation errors từ API response
 */
export function formatValidationErrors(validationErrors: Record<string, string[]>): string {
    const fieldErrors = Object.entries(validationErrors)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('; ');

    return `Lỗi validation: ${fieldErrors}`;
}

/**
 * Utility để add entity mới vào runtime
 */
export function addEntityErrorMessages(
    entityKey: string,
    displayName: string,
    customMessages?: Partial<ReturnType<typeof createEntityErrorMessages>>
) {
    const autoGenerated = createEntityErrorMessages(entityKey, displayName);
    const finalMessages = { ...autoGenerated, ...customMessages };

    // Add to runtime registry
    (FINAL_ERROR_MESSAGES as Record<string, unknown>)[entityKey] = finalMessages;
    (ENTITY_DISPLAY_NAMES as Record<string, unknown>)[entityKey] = displayName;

    // Create and add error handler
    (ErrorHandlers as Record<string, unknown>)[entityKey.toLowerCase()] = createEntityErrorHandler(entityKey as keyof typeof ENTITY_DISPLAY_NAMES);

    return finalMessages;
}

/**
 * Quick utilities cho common error scenarios
 */
export const QuickErrorHandlers = {
    /**
     * Handle 401 Unauthorized errors
     */
    unauthorized: (context?: string): string => {
        if (context) {
            apiLogger.warn(`Unauthorized access attempt: ${context}`);
        }
        return 'Vui lòng đăng nhập để tiếp tục';
    },

    /**
     * Handle 403 Forbidden errors
     */
    forbidden: (resource?: string, context?: string): string => {
        if (context) {
            apiLogger.warn(`Forbidden access attempt: ${context}`, { resource });
        }
        return resource
            ? `Bạn không có quyền truy cập ${resource}`
            : 'Bạn không có quyền thực hiện thao tác này';
    },

    /**
     * Handle 404 Not Found errors
     */
    notFound: (resource?: string, context?: string): string => {
        if (context) {
            apiLogger.warn(`Resource not found: ${context}`, { resource });
        }
        return resource
            ? `${resource} không tồn tại hoặc đã bị xóa`
            : 'Không tìm thấy tài nguyên yêu cầu';
    },

    /**
     * Handle 500 Server errors
     */
    serverError: (context?: string): string => {
        if (context) {
            apiLogger.warn(`Server error: ${context}`);
        }
        return 'Lỗi server nội bộ, vui lòng thử lại sau';
    },

    /**
     * Handle network errors
     */
    networkError: (error: Error, context?: string): string => {
        if (context) {
            apiLogger.warn(`Network error: ${context}`, { error: error.message });
        }

        if (error.message.includes('timeout')) {
            return 'Yêu cầu quá thời gian chờ, vui lòng thử lại';
        }

        if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
            return 'Không thể kết nối đến server, vui lòng kiểm tra kết nối mạng';
        }

        return 'Đã xảy ra lỗi kết nối, vui lòng thử lại';
    }
};
