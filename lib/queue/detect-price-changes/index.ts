/**
 * Detect Price Changes Queue Module
 * 
 * Barrel export for detect price changes queue components
 * 
 * @module lib/queue/detect-price-changes
 */

// Queue instance and utilities
export { 
  detectPriceChangesQueue,
  DETECT_PRICE_CHANGES_QUEUE_NAME,
  getDetectPriceChangesQueueStats,
  closeDetectPriceChangesQueue,
  default as defaultDetectPriceChangesQueue,
} from './detect-price-changes.queue';

// Processor function
export {
  processDetectPriceChangesJob,
  default as defaultProcessor,
} from './detect-price-changes.processor';

// Job types and creators
export {
  type DetectPriceChangesJobData,
  createDetectPriceChangesJob,
} from './detect-price-changes.jobs';
