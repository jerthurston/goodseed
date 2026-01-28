import { getUserById } from '../../lib/helpers/server/user';
import { getAccountByUserId } from '../../lib/helpers/server/account';
import { getTwoFactorConfirmationByUserId } from '../../lib/helpers/server/2fa';
import { refreshAccessToken } from '../../lib/helpers/server/token';
import { apiLogger } from '../../lib/helpers/api-logger';
import type { JWT } from 'next-auth/jwt';
import type { Account, User, Profile } from 'next-auth';

/**
 * JWT Callback Handler
 * 
 * Xử lý logic quản lý JWT token trong NextAuth
 * - Lưu trữ OAuth tokens (access_token, refresh_token) khi đăng nhập
 * - Populate user data từ database vào token
 * - Refresh access token khi hết hạn
 * - Handle session update từ client
 */
export async function jwtCallback(params: {
  token: JWT;
  user?: User;
  account?: Account | null;
  profile?: Profile;
  trigger?: "signIn" | "signUp" | "update";
  session?: any;
  isNewUser?: boolean;
}) {
  const { token, account, trigger, session } = params;

  // 1. Handle session update từ client
  if (trigger === "update" && session) {
    return { ...token, ...session };
  }

  // 2. Lưu trữ OAuth tokens khi đăng nhập
  if (account && account.access_token) {
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
    token.expiresAt = account.expires_at;
    token.tokenType = account.token_type;
  }

  // 3. Populate user data từ database
  if (token.sub) {
    await populateUserData(token);
  }

  // 4. Check token expiry và refresh nếu cần
  return await handleTokenRefresh(token);
}

/**
 * Populate user data từ database vào token
 */
async function populateUserData(token: JWT): Promise<void> {
  const existingUser = await getUserById(token.sub!);
  
  apiLogger.info('🔍 JWT Callback Debug:', {
    tokenSub: token.sub,
    existingUser: existingUser ? {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
      name: existingUser.name
    } : null,
    currentTokenRole: token.role
  });

  if (!existingUser) return;

  // Get account info (OAuth or Credentials)
  const existingAccount = await getAccountByUserId(existingUser.id);

  // Check two-factor confirmation
  const twoFactorConfirmation = existingUser.isTwoFactorEnabled
    ? await getTwoFactorConfirmationByUserId(existingUser.id)
    : null;

  // Populate token with user data
  token.isOAuth = !!existingAccount;
  token.name = existingUser.name;
  token.email = existingUser.email;
  token.role = existingUser.role; // QUAN TRỌNG: Set role từ DB
  token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;
  token.is2FAVerified = !!twoFactorConfirmation;

  apiLogger.info('🔍 JWT Token Updated:', {
    newTokenRole: token.role,
    userDbRole: existingUser.role,
    roleMatch: token.role === existingUser.role
  });
}

/**
 * Kiểm tra token expiry và refresh nếu cần
 */
async function handleTokenRefresh(token: JWT): Promise<JWT> {
  // Check nếu token còn hiệu lực (còn hơn 1 phút)
  if (
    token.expiresAt &&
    typeof token.expiresAt === 'number' &&
    Date.now() < token.expiresAt * 1000 - 60000
  ) {
    // Token còn hạn, trả về token hiện tại (ĐÃ POPULATE USER DATA)
    apiLogger.info("Access token còn hiệu lực, thời gian còn lại", {
      minutesLeft: Math.round((token.expiresAt * 1000 - Date.now()) / 1000 / 60)
    });
    return token;
  }

  // Token hết hạn, thử refresh
  if (token.refreshToken) {
    try {
      const refreshedTokens = await refreshAccessToken(token.refreshToken as string);
      
      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token || token.refreshToken,
        expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      };
    } catch (error) {
      apiLogger.logError("Token refresh error:", {
        userId: token.sub,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      // Mark token với error để session callback có thể handle
      return { ...token, error: "RefreshAccessTokenError" };
    }
  }

  // Không có refresh token hoặc không cần refresh
  return token;
}
