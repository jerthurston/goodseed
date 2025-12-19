
import
Bull, //Đây là hàm tạo của hàng đợi (Queue). Nó tạo ra một hàng đợi mới được lưu trữ trong Redis. Mỗi khi cùng một hàng đợi được khởi tạo, nó sẽ cố gắng xử lý tất cả các công việc cũ có thể còn tồn tại từ phiên làm việc chưa hoàn thành trước đó.
{
  Job,
  Queue,
  QueueOptions
} from 'bull';
import { apiLogger } from '../helpers/api-logger';
import { ScrapingSource } from '@prisma/client';
import { ScrapeJobConfig } from '@/types/scrapeJob.type';
import { config } from 'process';

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Ở dưới Bull cũng đã dùng Redis rồi, không cần tạo ra 1 instance redis nữa
// // Create Redis client for Bull
// const redisClient = new Redis({
//   host: REDIS_HOST,
//   port: REDIS_PORT,
//   password: REDIS_PASSWORD,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
// });



// Job data interface
export interface ScraperJobData {
  jobId: string; // ScrapeJob.jobId from database
  sellerId: string;
  scrapingSources: Array<{
    scrapingSourceUrl: string;
    scrapingSourceName: string;
    maxPage: number;
  }>;
  // scraper source: 'vancouverseedbank' | 'sunwestgenetics' | 'cropkingseeds'
  mode: 'batch' | 'auto' | 'manual' | 'test';
  config: ScrapeJobConfig;
}

// Queue options
/**
 * Giải thích: Các tùy chọn cho hàng đợi Bull
 * - redis: Cấu hình kết nối Redis
 * - defaultJobOptions: Tùy chọn cho các job mặc định
 * - limiter: Giới hạn cho các job trong hàng đợi
 * - jobId: ID của job
 * - priority: Độ ưu tiên của job
 */
const queueOptions: QueueOptions = {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    // Tối ưu connection
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
  defaultJobOptions: {
    attempts: 3, // Số lần thử lại nếu thất bại
    backoff: { // Cài đặt lùi thời gian để tự động thử lại nếu tác vụ thất bại
      type: 'exponential', // Tăng thời gian chờ giữa các lần thử
      delay: 5000, // Start with 5 seconds, double each retry
    },
    removeOnComplete: false, // Một biến boolean, nếu là true, sẽ xóa công việc khi nó hoàn thành thành công. Nếu là một số, nó sẽ chỉ định số lượng công việc cần giữ lại. Hành vi mặc định là giữ công việc trong tập hợp các công việc đã hoàn thành
    removeOnFail: false, // Một biến boolean, nếu là true, sẽ xóa công việc khi nó thất bại sau tất cả các lần thử. Khi là một số, nó chỉ định số lượng công việc cần giữ lại. Hành vi mặc định là giữ công việc trong tập hợp các công việc thất bại
  },
  limiter: {
    max: 30,        // Tối đa 30 jobs/phút (có thể điều chỉnh per seller nếu cần)
    duration: 60000, // 1 phút
  },
};

// Create Bull queue instance
// Giải thích: Tạo một hàng đợi Bull mới với tên 'scraper-queue' và các tùy chọn đã định nghĩa ở trên. Những gì sẽ chứa trong hàng đợi queue này? : Các công việc (jobs) sẽ được thêm vào hàng đợi này để xử lý các tác vụ scraping.

export const scraperQueue: Queue<ScraperJobData> = new Bull('scraper-queue', queueOptions);

// Event handlers - Queue event listeners
// Giải thích các handler?: Các handler này sẽ xử lý các sự kiện xảy ra trong hàng đợi, chẳng hạn như khi có lỗi, khi một công việc thất bại hoặc khi một công việc hoàn thành.
scraperQueue.on('error', (error) => {
  apiLogger.logError('[Scraper Queue] Error:', { error });
});

scraperQueue.on('stalled', (job) => {
  apiLogger.logError(`[Scraper Queue] Job ${job.id} stalled – worker may have crashed. Manual intervention may be needed.`, {
    jobData: job.data,
  });
});

scraperQueue.on('failed', (job, error) => {
  apiLogger.logError(`[Scraper Queue] Job ${job.id} failed:`, { error });
});

scraperQueue.on('completed', (job) => {
  apiLogger.info(`[Scraper Queue] Job ${job.id} completed successfully`);
});

scraperQueue.on('active', (job) => {
  apiLogger.info(`[Scraper Queue] Job ${job.id} started processing`);
});

/**
 * Thêm Job vào hàng đợi queue, sau khi khởi tạo queue với các tùy chọn ở trên
 * Trả về một Promise chứa Bull Job instance để theo dõi
 */
export async function addScraperJob(data: ScraperJobData): Promise<Job<ScraperJobData>> {
  // Validate and sanitize all config values
  if (!Array.isArray(data.scrapingSources) || data.scrapingSources.length === 0) {
    // apiLogger.logError(`[Scraper Queue] Invalid scrapingSourceUrl: ${typeof data.config.scrapingSourceUrl}`, {})
    throw new Error('scrapingSourceUrl must be a non-empty array of URLs');
  }

  // Sanitize & normalize input: Để đảm bảo rằng tất cả các giá trị cấu hình đều hợp lệ và đã được làm sạch trước khi thêm vào hàng đợi.
  const cleanData: ScraperJobData = {
    sellerId: String(data.sellerId),
    jobId: String(data.jobId),
    scrapingSources: data.scrapingSources.map(source => ({
      scrapingSourceUrl: String(source.scrapingSourceUrl.trim()),
      scrapingSourceName: String(source.scrapingSourceName).trim(),
      maxPage: Number(source.maxPage)
    })),
    mode: data.mode,
    config: {
      //mode ===  'batch' | 'test' | 'manual'
      startPage: data.config.startPage ? Number(data.config.startPage) : undefined,
      endPage: data.config.endPage ? Number(data.config.endPage) : undefined,
      //mode ===  'auto'
      fullSiteCrawl: Boolean(data.config.fullSiteCrawl),
    }
  };

  const job = await scraperQueue.add(cleanData, {
    jobId: data.jobId, // Use our jobId as Bull job ID for easy tracking
    priority: data.mode === 'manual' ? 10 : 5, // Manual jobs get higher priority
  });

  apiLogger.info(`[Scraper Queue] Added job ${job.id}`, {
    sellerId: cleanData.sellerId,
    mode: cleanData.mode,
    urlsCount: cleanData.scrapingSources.length,
    config: cleanData.config
  });

  //TODO:  Xem xét để chỉ trả về jobId và message – không expose full Job object
  // return {
  //   jobId: job.id,
  //   message: 'Job queued successfully',
  // };

  return job; 
  // sau khi thêm thông tin job vào hàng đợt queue bull, worker sẽ lấy job này để xử lý.
}

/**
 * Get job by ID from queue.
 * Giải thích chi tiết: Hàm này sẽ lấy một job từ hàng đợi dựa trên ID của nó. Nếu job tồn tại, nó sẽ trả về job đó, ngược lại sẽ trả về null.
 */
export async function getJob(jobId: string): Promise<Job<ScraperJobData> | null> {
  return await scraperQueue.getJob(jobId);
}

/**
 * Pause the queue
 * Giải thích chi tiết: Hàm này sẽ tạm dừng hàng đợi, ngăn không cho các job mới được xử lý cho đến khi hàng đợi được tiếp tục.
 */
export async function pauseQueue(): Promise<void> {
  await scraperQueue.pause();
  apiLogger.info('[Scraper Queue] Queue paused by admin');
}

/**
 * Resume the queue
 * Giải thích chi tiết: Hàm này sẽ tiếp tục xử lý các job trong hàng đợi sau khi đã tạm dừng.
 */
export async function resumeQueue(): Promise<void> {
  await scraperQueue.resume();
  apiLogger.info('[Scraper Queue] Queue resumed by admin');
}

/**
 * Remove job from queue (cancel).
 * Giải thích chi tiết: Hàm này sẽ xóa một job khỏi hàng đợi dựa trên ID của nó. Nếu job tồn tại, nó sẽ bị xóa khỏi hàng đợi.
 */
export async function removeJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (job) {
    await job.remove();
    apiLogger.info(`[Scraper Queue] Removed/cancelled job ${jobId}`);
  }
}

/**
 * Get queue statistics
 * Giải thích chi tiết: Hàm này sẽ lấy thông tin thống kê về trạng thái của hàng đợi, bao gồm số lượng job đang chờ, đang hoạt động, đã hoàn thành, đã thất bại và bị trì hoãn.
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount(),
    scraperQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean old jobs from queue
 * @param grace - Keep jobs completed/failed within this time (ms)
 * Giải thích chi tiết: Hàm này sẽ xóa các job cũ khỏi hàng đợi, chỉ giữ lại các job đã hoàn thành hoặc thất bại trong khoảng thời gian nhất định (grace period). Ví dụ : grace: number = 24 * 60 * 60 * 1000 sẽ là 24 giờ.
 */
export async function cleanQueue(
  graceMs: number = 24 * 60 * 60 * 1000,
  types: ('completed' | 'failed' | 'wait' | 'active' | 'delayed')[] = ['completed', 'failed']
) {
  for (const type of types) {
    await scraperQueue.clean(graceMs, type);
  }
  apiLogger.info(`[Scraper Queue] Cleaned old jobs (grace: ${graceMs}ms, types: ${types.join(', ')})`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  apiLogger.info('[Scraper Queue] Closing queue...');
  await scraperQueue.close();
});

process.on('SIGINT', async () => {
  apiLogger.info('[Scraper Queue] Received SIGINT – closing queue gracefully...');
  await scraperQueue.close();
});

export default scraperQueue;
