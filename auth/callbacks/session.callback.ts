import { UserRole } from '@prisma/client';
import { apiLogger } from '../../lib/helpers/api-logger';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * Session Callback Handler
 * 
 * Xử lý logic mapping JWT token sang Session object
 * - Populate user data từ JWT token vào session
 * - Thêm custom fields (role, isOAuth, 2FA status, v.v.)
 * - Thêm accessToken và error vào session nếu có
 */
export async function sessionCallback(params: {
  session: Session;
  token: JWT;
  user?: any;
}) {
  const { session, token } = params;

  // Kiểm tra xem session.user có tồn tại hay không
  if (!session.user) return session;

  apiLogger.debug('🔍 Session Callback Debug:', {
    tokenRole: token.role,
    tokenEmail: token.email,
    sessionUserBefore: session.user.role
  });

  // Gán các thuộc tính cơ bản cho user
  session.user.id = token.sub || "";
  session.user.name = token.name;
  session.user.email = token.email as string;

  // Gán các thuộc tính phân quyền và xác thực
  session.user.role = token.role as UserRole;
  session.user.isOAuth = token.isOAuth as boolean;
  session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;
  session.user.is2FAVerified = token.is2FAVerified as boolean;

  apiLogger.debug('🔍 Session Final:', {
    sessionUserRole: session.user.role,
    sessionUserEmail: session.user.email
  });

  // Thêm access token vào session nếu có
  if (token.accessToken) {
    session.accessToken = token.accessToken as string;
  }

  // Thêm thông tin error nếu có lỗi khi refresh token
  if (token.error) {
    session.error = token.error as string;
  }

  return session;
}
