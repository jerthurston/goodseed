import { prisma } from "@/lib/prisma";
import { apiLogger } from "../../api-logger";

/**
 * Reset Rate Limit cho một email (Admin function)
 */
export async function resetMagicLinkRateLimit(email: string): Promise<void> {
  try {
    await prisma.magicLinkRateLimit.delete({
      where: { email }
    });
    
    apiLogger.info('[RATE_LIMIT] Rate limit reset', { email });
  } catch (error) {
    apiLogger.logError('[RATE_LIMIT] Error resetting rate limit', error as Error, { email });
  }
}