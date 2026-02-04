/**
 * Send Price Alert Email Queue Module
 * 
 * Barrel export for send price alert email queue components
 * 
 * @module lib/queue/send-price-alert
 */

// Queue instance and utilities
export { 
  sendPriceAlertQueue,
  SEND_PRICE_ALERT_QUEUE_NAME,
  getSendPriceAlertQueueStats,
  closeSendPriceAlertQueue,
  default as defaultSendPriceAlertQueue,
} from './send-price-alert.queue';

// Processor function
export {
  processSendPriceAlertEmailJob,
  default as defaultProcessor,
} from './send-price-alert.processor';

// Job types and creators
export {
  type SendPriceAlertEmailJobData,
  createPriceAlertEmailJob,
  batchCreatePriceAlertEmailJobs,
} from './send-price-alert.jobs';
