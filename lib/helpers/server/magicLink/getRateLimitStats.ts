import { prisma } from "@/lib/prisma";
import { apiLogger } from "../../api-logger";

/**
 * Get rate limit stats (Admin dashboard)
 */
export async function getRateLimitStats() {
  try {
    const [totalRecords, activeCooldowns, last24h] = await Promise.all([
      prisma.magicLinkRateLimit.count(),
      prisma.magicLinkRateLimit.count({
        where: { cooldownUntil: { gt: new Date() } }
      }),
      prisma.magicLinkRateLimit.count({
        where: { 
          lastAttempt: { 
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
          } 
        }
      }),
    ]);

    return {
      totalRecords,
      activeCooldowns,
      requestsLast24h: last24h,
    };
  } catch (error) {
    apiLogger.logError('[RATE_LIMIT] Error getting stats', error as Error);
    return null;
  }
}