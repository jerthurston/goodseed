import { prisma } from '../../lib/prisma';
import { apiLogger } from '../../lib/helpers/api-logger';
import type { Account, User, Profile } from 'next-auth';
import { getUserByEmail } from '@/lib/helpers/server/user';

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

    // RESEND HANDLING
    if (account.provider === "resend") {
      return await handleEmailSignIn(user, account);
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
 * Xử lý Google OAuth Sign-in. handleGoogleSignIn() dùng ở server action
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
  const userEmail = user.email 
  
  if(!userEmail) {
    apiLogger.logError('[AUTH] Facebook signin failed', new Error('No email provided'));
    return false;
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: userEmail // giải thích: userEmail! 
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

/**
 * Xử lý Magic Link Sign-in (Resend API)
 * 
 * Magic Link Authentication Flow:
 * 1. User nhập email → NextAuth tạo token + gửi magic link (sendVerificationRequest)
 * 2. User click link → NextAuth verify token tự động
 * 3. signIn callback (đây):
 *    - Nếu user chưa tồn tại → NextAuth sẽ tạo user mới sau callback
 *    - Nếu user đã tồn tại → Check banned status
 *    - Return true/false để cho phép hoặc block login
 * 4. NextAuth tự động set emailVerified = new Date()
 * 
 * Note: Magic link và token được NextAuth xử lý tự động
 * Callback này chỉ validate trước khi cho phép đăng nhập
 */
async function handleEmailSignIn(user: User, account: Account | null) {
  try {
    // Validate email
    if (!user.email) {
      apiLogger.logError('[AUTH] Magic link signin failed', new Error('No email provided'));
      throw new Error('Email is required for magic link authentication');
    }

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await getUserByEmail(user.email);

    if (existingUser) {
      // User đã tồn tại → Check banned status
      // TODO: Thêm field isBanned vào Prisma schema nếu cần
      // if (existingUser.isBanned) {
      //   apiLogger.warn(`[AUTH] Banned user blocked from magic link login: ${existingUser.email}`);
      //   return false; // Block login
      // }

      // Nếu user tồn tại với email

      apiLogger.info(`[AUTH] Existing user logging in via magic link: ${existingUser.email}`);
    } else {
      // User chưa tồn tại → NextAuth sẽ tạo mới sau khi return true
      // User mới sẽ có: email, emailVerified = new Date(), role = USER
      apiLogger.info(`[AUTH] New user will be created via magic link: ${user.email}`);
    }

    // Cho phép đăng nhập
    return true;

  } catch (error) {
    apiLogger.logError('[AUTH] Magic link signin error:', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    throw new Error(`emailSignInError=${encodeURIComponent(errorMessage)}`);
  }
}
