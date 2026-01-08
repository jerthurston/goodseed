import { prisma } from '../../lib/prisma';
import { apiLogger } from '../../lib/helpers/api-logger';
import type { Account, User, Profile } from 'next-auth';

/**
 * SignIn Callback Handler
 * 
 * Xử lý logic đăng nhập cho tất cả providers (Google, Facebook, Credentials)
 * - Google: Tạo user mới hoặc link account, yêu cầu email verified
 * - Facebook: Hỗ trợ email fallback, track acquisition source
 * - Credentials: Chỉ validate cơ bản
 */
export async function signInCallback(params: {
  user: User;
  account?: Account | null;
  profile?: Profile;
  email?: { verificationRequest?: boolean };
  credentials?: Record<string, any>;
}) {
  const { user, account } = params;
  
  try {
    // Kiểm tra xem account có tồn tại hay không
    if (!account) {
      throw new Error("Account not found");
    }

    // GOOGLE OAUTH HANDLING
    if (account.provider === "google") {
      return await handleGoogleSignIn(user, account);
    }

    // FACEBOOK OAUTH HANDLING
    if (account.provider === "facebook") {
      return await handleFacebookSignIn(user, account);
    }

    // CREDENTIALS PROVIDER
    if (account.provider === "credentials") {
      return true;
    }

    // Các provider khác thì không xử lý ở đây, return true để tiếp tục
    return true;

  } catch (error) {
    apiLogger.logError("Sign-in error:", error as Error);
    // Pass error message to error page
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`signInError=${encodeURIComponent(errorMessage)}`);
  }
}

/**
 * Xử lý Google OAuth Sign-in
 */
async function handleGoogleSignIn(user: User, account: Account) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: user.email!
    }
  });

  // Nếu user chưa tồn tại -> Tạo mới (Sign-up)
  if (!existingUser) {
    const newUser = await prisma.user.create({
      data: {
        email: user.email!,
        name: user.name!,
        emailVerified: new Date(), // Không cần verify email của Google
        image: user.image,
        role: "USER", // Role mặc định
      }
    });

    // Kiểm tra account đã tồn tại chưa
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: newUser?.id
      }
    });

    if (existingAccount) {
      return true; // Đã có tài khoản Google rồi
    }

    // Tạo account mới
    if (newUser?.id) {
      await prisma.account.create({
        data: {
          userId: newUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state ? String(account.session_state) : null,
        }
      });
    }
    return true;
  }

  // Nếu user tồn tại nhưng chưa verify email (đăng ký qua credentials trước đó)
  if (existingUser && !existingUser.emailVerified) {
    return "/auth/verify"; // Điều hướng đến trang xác minh
  }

  // Nếu user đã tồn tại, kiểm tra xem đã có Google account liên kết chưa
  if (existingUser) {
    const existingGoogleAccount = await prisma.account.findFirst({
      where: {
        userId: existingUser.id,
        provider: "google"
      }
    });

    // Nếu chưa có Google account, tạo liên kết mới
    if (!existingGoogleAccount) {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state ? String(account.session_state) : null,
        }
      });
      apiLogger.info(`[AUTH] Created Google account link for existing user: ${existingUser.email}`);
    }
  }

  return true;
}

/**
 * Xử lý Facebook OAuth Sign-in
 */
async function handleFacebookSignIn(user: User, account: Account) {
  // Facebook có thể không cung cấp email nếu chưa được duyệt
  const userEmail = user.email || `facebook_${account.providerAccountId}@temp.local`;

  const existingUser = await prisma.user.findUnique({
    where: {
      email: userEmail
    }
  });

  // Tạo user mới cho lần đăng nhập Facebook đầu tiên
  if (!existingUser) {
    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        name: user.name!,
        emailVerified: user.email ? new Date() : null, // Chỉ verify nếu có email thật
        image: user.image,
        role: "USER",
        acquisitionSource: "facebook_oauth", // Track nguồn acquisition
      }
    });

    // Tạo Facebook account link
    await prisma.account.create({
      data: {
        userId: newUser.id,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token,
        refresh_token: account.refresh_token || null, // Facebook có thể không cung cấp refresh_token
        expires_at: account.expires_at,
        token_type: account.token_type || "bearer",
        scope: account.scope || "public_profile",
        id_token: account.id_token || null, // Facebook không cung cấp id_token
        session_state: account.session_state ? String(account.session_state) : null,
      }
    });

    apiLogger.info(`[AUTH] Created new user from Facebook: ${newUser.email}`);
    return true;
  }

  // Xử lý user đã tồn tại + liên kết Facebook
  if (existingUser) {
    const existingFacebookAccount = await prisma.account.findFirst({
      where: {
        userId: existingUser.id,
        provider: "facebook"
      }
    });

    // Liên kết Facebook account nếu chưa có
    if (!existingFacebookAccount) {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token || null,
          expires_at: account.expires_at,
          token_type: account.token_type || "bearer",
          scope: account.scope || "public_profile",
          id_token: account.id_token || null,
          session_state: account.session_state ? String(account.session_state) : null,
        }
      });
      apiLogger.info(`[AUTH] Linked Facebook account for existing user: ${existingUser.email}`);
    }
  }

  return true;
}
