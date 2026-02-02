/**
 * Marketing Queue Configuration
 * 
 * Handles email campaigns, newsletters, and user notifications
 */

import Queue from 'bull';
import ioredis from '../redis';

export interface EmailCampaignJob {
  type: 'welcome' | 'newsletter' | 'promotion' | 'notification';
  recipients: string[]; // Email addresses
  subject: string;
  template: string;
  data: Record<string, any>;
  scheduledAt?: Date;
}

export const marketingQueue = new Queue<EmailCampaignJob>('marketing-jobs', {
  redis: ioredis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
});

// Job event handlers
marketingQueue.on('completed', (job) => {
  console.log(`[Marketing Queue] Job ${job.id} completed`);
});

marketingQueue.on('failed', (job, err) => {
  console.error(`[Marketing Queue] Job ${job?.id} failed:`, err);
});

marketingQueue.on('stalled', (job) => {
  console.warn(`[Marketing Queue] Job ${job.id} stalled`);
});

export default marketingQueue;
