// Auto Scraper Status Types cho real-time monitoring

export interface AutoScraperSellerStatus {
  sellerId: string;
  sellerName: string;
  isScheduled: boolean;
  isActive: boolean;
  cronPattern?: string;
  nextRun?: Date;
  lastRun?: Date;
  jobId?: string;
  interval: number; // hours
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastError?: string;
}

export interface AutoScraperBulkStatus {
  totalSellers: number;
  scheduledSellers: number;
  activeSellers: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastBulkRun?: Date;
  nextScheduledRun?: Date;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  averageSuccessRate: number;
  sellers: AutoScraperSellerStatus[];
}

export interface AutoScraperJobStatus {
  jobId: string;
  sellerId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  productsScraped?: number;
  errorMessage?: string;
  progress?: number; // 0-100
}

// Real-time notification types
export interface AutoScraperNotification {
  type: 'job_started' | 'job_completed' | 'job_failed' | 'schedule_changed' | 'system_alert';
  sellerId?: string;
  sellerName?: string;
  jobId?: string;
  message: string;
  timestamp: Date;
  severity: 'info' | 'success' | 'warning' | 'error';
}