import { prisma } from "@/lib/prisma";
import { CONFIG } from "./constants";
import { apiLogger } from "../../api-logger";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remainingAttempts?: number;
  cooldownEndsAt?: Date;
  resetAt?: Date;
}

/**
 * Check Magic Link Rate Limit
 * 
 * @param email - User email
 * @param ipAddress - Optional IP address for extra tracking
 * @returns RateLimitResult
 */
export async function checkMagicLinkRateLimit(
  email: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    
    // 1. Tìm hoặc tạo rate limit record
    let record = await prisma.magicLinkRateLimit.findUnique({
      where: { email }
    });

    // 2. Check cooldown period
    if (record?.cooldownUntil && record.cooldownUntil > now) {
      apiLogger.warn('[RATE_LIMIT] User in cooldown period', { 
        email, 
        cooldownEndsAt: record.cooldownUntil 
      });
      
      return {
        allowed: false,
        reason: 'COOLDOWN_ACTIVE',
        cooldownEndsAt: record.cooldownUntil,
      };
    }

    // 3. Check nếu đã hết time window → Reset counter
    if (record) {
      const windowStart = new Date(now.getTime() - CONFIG.WINDOW_MINUTES * 60 * 1000);
      
      if (record.lastAttempt < windowStart) {
        // Reset counter - Time window đã hết
        record = await prisma.magicLinkRateLimit.update({
          where: { email },
          data: {
            attemptCount: 1,
            lastAttempt: now,
            cooldownUntil: null, // Clear cooldown
            ipAddress, // Update IP nếu có
          }
        });

        apiLogger.info('[RATE_LIMIT] Counter reset after window expired', { email });
        
        return {
          allowed: true,
          remainingAttempts: CONFIG.MAX_ATTEMPTS - 1,
          resetAt: new Date(now.getTime() + CONFIG.WINDOW_MINUTES * 60 * 1000),
        };
      }
    }

    // 4. Check rate limit
    if (record && record.attemptCount >= CONFIG.MAX_ATTEMPTS) {
      // Vượt quá limit → Set cooldown
      const cooldownUntil = new Date(now.getTime() + CONFIG.COOLDOWN_MINUTES * 60 * 1000);
      
      await prisma.magicLinkRateLimit.update({
        where: { email },
        data: { cooldownUntil }
      });

      apiLogger.warn('[RATE_LIMIT] Rate limit exceeded, cooldown activated', { 
        email, 
        attempts: record.attemptCount,
        cooldownUntil 
      });

      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        cooldownEndsAt: cooldownUntil,
      };
    }

    // 5. Increment counter hoặc tạo mới
    if (record) {
      // Update existing record
      record = await prisma.magicLinkRateLimit.update({
        where: { email },
        data: {
          attemptCount: { increment: 1 },
          lastAttempt: now,
          ipAddress,
        }
      });
    } else {
      // Tạo record mới
      record = await prisma.magicLinkRateLimit.create({
        data: {
          email,
          ipAddress,
          attemptCount: 1,
          lastAttempt: now,
        }
      });
    }

    const remaining = CONFIG.MAX_ATTEMPTS - record.attemptCount;

    apiLogger.info('[RATE_LIMIT] Magic link request allowed', { 
      email, 
      attempt: record.attemptCount,
      remaining 
    });

    return {
      allowed: true,
      remainingAttempts: remaining,
      resetAt: new Date(record.lastAttempt.getTime() + CONFIG.WINDOW_MINUTES * 60 * 1000),
    };

  } catch (error) {
    // Nếu có lỗi DB → Allow request (fail open)
    apiLogger.logError('[RATE_LIMIT] Error checking rate limit', error as Error, { email });
    return { allowed: true }; // Fail open để không block user khi có lỗi
  }
}