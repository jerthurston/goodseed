/**
 * Price Change Alert Queue Module
 * 
 * Barrel export cho tất cả price alert queue components
 */

// Queue instance and utilities
export { 
  priceAlertQueue,
  getPriceAlertQueueStats,
  closePriceAlertQueue,
  default as defaultPriceAlertQueue,
} from './price-change-alert.queue';

// Processor function
export {
  processPriceAlertJob,
  default as defaultProcessor,
} from './price-change-alert.processor';

// Job types and creators (gộp chung trong 1 file)
export {
  // Types
  PRICE_ALERT_JOB_TYPES,
  type PriceAlertJobData,
  type PriceAlertEmailJobData,
  type DetectPriceChangesJobData,
  
  // Creators
  createDetectPriceChangesJob,
  createPriceAlertEmailJob,
  batchCreateEmailJobs,
} from './price-change-alert.jobs';

