import { prisma } from "@/lib/prisma";
import { apiLogger } from "../../api-logger";

/**
 * Cleanup old rate limit records (Chạy định kỳ bằng cron)
 */
export async function cleanupOldRateLimitRecords(): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - CONFIG.CLEANUP_DAYS * 24 * 60 * 60 * 1000);
    
    const result = await prisma.magicLinkRateLimit.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    apiLogger.info('[RATE_LIMIT] Cleanup completed', { deletedCount: result.count });
    return result.count;
    
  } catch (error) {
    apiLogger.logError('[RATE_LIMIT] Cleanup error', error as Error);
    return 0;
  }
}