import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { Account, User } from 'next-auth';

/**
 * Event handler khi OAuth account được liên kết với user
 * 
 * Flow:
 * 1. User đăng nhập bằng Google/Facebook
 * 2. PrismaAdapter tự động tạo Account record trong DB
 * 3. Event này được fired để cập nhật metadata
 * 4. Cập nhật emailVerified cho user (OAuth providers đã verify email)
 * 
 * ⚠️ LƯU Ý:
 * - KHÔNG tạo Account record ở đây (adapter đã làm)
 * - CHỈ cập nhật User metadata
 * - Event chạy AFTER action (không thể block)
 * 
 * @param user - User object từ database
 * @param account - Account object vừa được link
 */
export async function linkAccountEvent({
  user,
  account,
}: {
  user: User;
  account: Account;
}): Promise<void> {
  try {
    // Chỉ xử lý OAuth providers (Google, Facebook)
    const oauthProviders = ['google', 'facebook'];
    
    if (!oauthProviders.includes(account.provider)) {
      return;
    }

    apiLogger.info('OAuth account linked, updating emailVerified:', {
      userId: user.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });

    // ⚠️ QUAN TRỌNG: Chỉ verify email nếu KHÔNG phải temp email
    // Facebook có thể tạo temp email: facebook_123@temp.local
    // Temp email KHÔNG được mark là verified
    const isRealEmail = user.email && !user.email.includes('@temp.local');

    if (isRealEmail) {
      // Cập nhật emailVerified vì OAuth providers đã verify email thật
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          // Có thể thêm metadata khác nếu cần
          // lastLoginAt: new Date(),
          // loginCount: { increment: 1 },
        },
      });

      apiLogger.info('User emailVerified updated successfully', {
        userId: user.id,
      }
    );
    } else {
      apiLogger.warn('Skipped emailVerified update for temp email', {
        userId: user.id,
        email: user.email,
        provider: account.provider,
      });
    }
  } catch (error) {
    // Log error nhưng không throw (event không nên block flow)
    apiLogger.logError(
      'linkAccount.event',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: user.id,
        provider: account.provider,
      }
    );
  }
}
