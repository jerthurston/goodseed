/**
 * Error Processing Service
 * Categorizes scraper errors and provides recommended actions
 */

import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Scraper Error Types (classification enum)
 */
export enum ScraperErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',     // Connection timeout, DNS issues
  PARSE_ERROR = 'PARSE_ERROR',         // HTML parsing failed, selector not found
  SAVE_ERROR = 'SAVE_ERROR',           // Database save failed, validation errors
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',     // Scraper timeout, slow response
  SITE_CHANGED = 'SITE_CHANGED',       // Site structure changed, selectors outdated
  AUTH_ERROR = 'AUTH_ERROR',           // Access denied, rate limited, blocked
  WORKER_ERROR = 'WORKER_ERROR',       // Worker crashed, queue stalled
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'      // Unclassified error
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',         // Minor issues, retryable
  MEDIUM = 'MEDIUM',   // Significant issues, needs attention  
  HIGH = 'HIGH',       // Major issues, immediate action required
  CRITICAL = 'CRITICAL' // System-level issues, urgent response
}

/**
 * Recommended action for error types
 */
export interface ErrorRecommendation {
  action: string;
  description: string;
  priority: ErrorSeverity;
  autoRetryable: boolean;
  estimatedFixTime?: string;
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: ScraperErrorType;
  severity: ErrorSeverity;
  recommendation: ErrorRecommendation;
  confidence: number; // 0-1, how confident we are in classification
}

/**
 * Error Processing Service
 * Analyzes errors and provides actionable insights
 */
export class ErrorProcessorService {
  
  /**
   * Categorize error based on message and context
   */
  static categorizeError(error: Error | string, context?: any): ScraperErrorType {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? '' : (error.stack || '');
    const lowerMessage = errorMessage.toLowerCase();
    const lowerStack = errorStack.toLowerCase();

    try {
      // Network-related errors
      if (this.isNetworkError(lowerMessage, lowerStack)) {
        return ScraperErrorType.NETWORK_ERROR;
      }

      // Parsing/selector errors  
      if (this.isParseError(lowerMessage, lowerStack)) {
        return ScraperErrorType.PARSE_ERROR;
      }

      // Database/save errors
      if (this.isSaveError(lowerMessage, lowerStack)) {
        return ScraperErrorType.SAVE_ERROR;
      }

      // Timeout errors
      if (this.isTimeoutError(lowerMessage, lowerStack)) {
        return ScraperErrorType.TIMEOUT_ERROR;
      }

      // Authentication/access errors
      if (this.isAuthError(lowerMessage, lowerStack)) {
        return ScraperErrorType.AUTH_ERROR;
      }

      // Worker/queue errors
      if (this.isWorkerError(lowerMessage, lowerStack, context)) {
        return ScraperErrorType.WORKER_ERROR;
      }

      // Site structure changed (multiple parse failures)
      if (this.isSiteChangedError(lowerMessage, context)) {
        return ScraperErrorType.SITE_CHANGED;
      }

      return ScraperErrorType.UNKNOWN_ERROR;

    } catch (classificationError) {
      apiLogger.logError('[ErrorProcessor] Classification failed', classificationError as Error, {
        originalError: errorMessage,
        context
      });
      return ScraperErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * Determine if error should trigger immediate alert
   */
  static shouldAlert(errorType: ScraperErrorType, frequency: number): boolean {
    const criticalTypes = [
      ScraperErrorType.SITE_CHANGED,
      ScraperErrorType.WORKER_ERROR
    ];

    const highFrequencyThreshold = 3; // 3+ errors in timeframe

    return criticalTypes.includes(errorType) || frequency >= highFrequencyThreshold;
  }

  /**
   * Get recommended action for error type
   */
  static getRecommendedAction(errorType: ScraperErrorType): ErrorRecommendation {
    const recommendations: Record<ScraperErrorType, ErrorRecommendation> = {
      [ScraperErrorType.NETWORK_ERROR]: {
        action: 'Retry scraping',
        description: 'Network connectivity issue. Usually resolves automatically.',
        priority: ErrorSeverity.MEDIUM,
        autoRetryable: true,
        estimatedFixTime: '5-10 minutes'
      },
      
      [ScraperErrorType.PARSE_ERROR]: {
        action: 'Check selectors',
        description: 'HTML parsing failed. May indicate site structure changes.',
        priority: ErrorSeverity.HIGH,
        autoRetryable: false,
        estimatedFixTime: '1-2 hours'
      },

      [ScraperErrorType.SAVE_ERROR]: {
        action: 'Check database',
        description: 'Database save operation failed. Check logs for details.',
        priority: ErrorSeverity.HIGH,
        autoRetryable: true,
        estimatedFixTime: '15-30 minutes'
      },

      [ScraperErrorType.TIMEOUT_ERROR]: {
        action: 'Retry with longer timeout',
        description: 'Site response too slow. Consider increasing timeout settings.',
        priority: ErrorSeverity.MEDIUM,
        autoRetryable: true,
        estimatedFixTime: '10-15 minutes'
      },

      [ScraperErrorType.SITE_CHANGED]: {
        action: 'Update scraper code',
        description: 'Target site structure changed. Developer intervention required.',
        priority: ErrorSeverity.CRITICAL,
        autoRetryable: false,
        estimatedFixTime: '2-4 hours'
      },

      [ScraperErrorType.AUTH_ERROR]: {
        action: 'Check access permissions',
        description: 'Access denied or rate limited. May need to rotate IPs or wait.',
        priority: ErrorSeverity.HIGH,
        autoRetryable: false,
        estimatedFixTime: '30-60 minutes'
      },

      [ScraperErrorType.WORKER_ERROR]: {
        action: 'Restart worker process',
        description: 'Worker crashed or stalled. System-level issue.',
        priority: ErrorSeverity.CRITICAL,
        autoRetryable: true,
        estimatedFixTime: '5-15 minutes'
      },

      [ScraperErrorType.UNKNOWN_ERROR]: {
        action: 'Manual investigation',
        description: 'Unclassified error. Requires manual review of logs.',
        priority: ErrorSeverity.MEDIUM,
        autoRetryable: false,
        estimatedFixTime: '30-60 minutes'
      }
    };

    return recommendations[errorType];
  }

  /**
   * Get full error classification with severity and recommendations
   */
  static classifyError(error: Error | string, context?: any): ErrorClassification {
    const type = this.categorizeError(error, context);
    const recommendation = this.getRecommendedAction(type);
    const severity = recommendation.priority;
    
    // Calculate confidence based on error message patterns
    const confidence = this.calculateConfidence(error, type);

    return {
      type,
      severity,
      recommendation,
      confidence
    };
  }

  // Private helper methods for error detection

  private static isNetworkError(message: string, stack: string): boolean {
    const networkPatterns = [
      'connection', 'timeout', 'network', 'dns', 'socket', 'econnrefused',
      'enotfound', 'ehostunreach', 'etimedout', 'fetch failed'
    ];
    
    return networkPatterns.some(pattern => 
      message.includes(pattern) || stack.includes(pattern)
    );
  }

  private static isParseError(message: string, stack: string): boolean {
    const parsePatterns = [
      'parse', 'selector', 'element not found', 'cannot read property',
      'undefined property', 'cheerio', 'dom', 'html'
    ];
    
    return parsePatterns.some(pattern => 
      message.includes(pattern) || stack.includes(pattern)
    );
  }

  private static isSaveError(message: string, stack: string): boolean {
    const savePatterns = [
      'database', 'prisma', 'sql', 'constraint', 'duplicate', 'validation',
      'save failed', 'insert failed', 'update failed'
    ];
    
    return savePatterns.some(pattern => 
      message.includes(pattern) || stack.includes(pattern)
    );
  }

  private static isTimeoutError(message: string, stack: string): boolean {
    const timeoutPatterns = [
      'timeout', 'slow', 'exceeded', 'time limit', 'deadline'
    ];
    
    return timeoutPatterns.some(pattern => 
      message.includes(pattern) || stack.includes(pattern)
    );
  }

  private static isAuthError(message: string, stack: string): boolean {
    const authPatterns = [
      'access denied', 'unauthorized', 'forbidden', 'rate limit',
      '401', '403', '429', 'blocked', 'captcha'
    ];
    
    return authPatterns.some(pattern => 
      message.includes(pattern) || stack.includes(pattern)
    );
  }

  private static isWorkerError(message: string, stack: string, context?: any): boolean {
    const workerPatterns = [
      'worker', 'stalled', 'crashed', 'queue', 'bull', 'process'
    ];
    
    const hasWorkerPattern = workerPatterns.some(pattern => 
      message.includes(pattern) || stack.includes(pattern)
    );

    // Check context for worker-related info
    const isWorkerContext = context?.source === 'worker' || context?.jobId;
    
    return hasWorkerPattern || isWorkerContext;
  }

  private static isSiteChangedError(message: string, context?: any): boolean {
    // Site changed usually indicated by multiple parse errors
    const parseErrorIndicators = ['selector', 'element not found', 'parse'];
    const hasParsePattern = parseErrorIndicators.some(pattern => message.includes(pattern));
    
    // Could enhance with frequency check from context
    const highFrequency = context?.frequency && context.frequency > 2;
    
    return hasParsePattern && highFrequency;
  }

  private static calculateConfidence(error: Error | string, type: ScraperErrorType): number {
    const message = typeof error === 'string' ? error : error.message;
    
    // High confidence patterns
    const highConfidencePatterns: Record<ScraperErrorType, string[]> = {
      [ScraperErrorType.NETWORK_ERROR]: ['econnrefused', 'etimedout', 'dns'],
      [ScraperErrorType.PARSE_ERROR]: ['cheerio', 'selector not found'],
      [ScraperErrorType.SAVE_ERROR]: ['prisma', 'database constraint'],
      [ScraperErrorType.TIMEOUT_ERROR]: ['timeout exceeded'],
      [ScraperErrorType.AUTH_ERROR]: ['401', '403', 'access denied'],
      [ScraperErrorType.WORKER_ERROR]: ['worker crashed', 'job stalled'],
      [ScraperErrorType.SITE_CHANGED]: [],
      [ScraperErrorType.UNKNOWN_ERROR]: []
    };

    const patterns = highConfidencePatterns[type] || [];
    const hasHighConfidencePattern = patterns.some(pattern => 
      message.toLowerCase().includes(pattern)
    );

    return hasHighConfidencePattern ? 0.9 : 0.6; // 90% or 60% confidence
  }
}