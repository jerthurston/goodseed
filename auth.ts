import NextAuth from 'next-auth';
import { UserRole } from '@prisma/client';
import { prisma } from './lib/prisma';
import { PrismaAdapter } from "@auth/prisma-adapter";

import { getUserById } from './lib/helpers/server/user';
import {getAccountByUserId} from './lib/helpers/server/account'
import { getTwoFactorConfirmationByUserId } from './lib/helpers/server/2fa';
import { refreshAccessToken } from './lib/helpers/server/token';
import authConfig from './auth.config';
import { apiLogger } from './lib/helpers/api-logger';

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  adapter: PrismaAdapter(prisma), //kết nối nextauth với prisma 
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    // Add explicit 2FA page to avoid any potential redirects during 2FA flow
    verifyRequest: '/auth/2fa'
  }, //pages: định nghĩa custom page cho đăng nhập và trả lỗi 
  events: {
    async linkAccount({ user, account }) {
      console.log("Linking account:", { user, account });
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      });
      // Verify Account record is created
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      });
      if (!existingAccount && user.id) {
        await prisma.account.create({
          data: {
            userId: user.id,
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
          },
        });
      }
    }
  },
  //events.linkAccount khi liên kết tài khoản OAuth, cập nhật emailVerified và đảm bảo tạo account được đúng 
  callbacks: {
    // Callback signIn để kiểm tra và xử lý đăng nhập. 
    //Lưu ý: với cùng một callback signIn trong next-auth sẽ gộp chung  xử lý 2 quy trình là sign-in google nếu existingUser tồn tại(tức đã đăng ký và xác thực tài khoản trước đó) và nếu chưa đăng ký thì sẽ thực hiện quy trình sign-up google )
    async signIn({ user, account }) {
      try {
        // kiểm tra xem account có tồn tại hay không? th này hiếm xảy ra nhưng để hạn chế lỗi runtime không xây ra
        if (!account) {
          throw new Error("Account not found");
        }
       // Check provider
        if (account.provider === "google") {
          const existingUser = await prisma.user.findUnique({
            where: {
              email: user.email! 
            }
          });
          //existing không tồn tại function signIn sẽ thực hiện Sign-up
          if (!existingUser) {
            // create new user for first time google sign in 
            // Tạo user mới với role mặc định USER
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name!,
                emailVerified: new Date(), // không cần verify email của provide google
                image: user.image,
                role: "USER", // Role mặc định, có thể thay đổi sau trong admin panel
              }
            });


            // Tiếp theo thực hiện, create account gắn liền với userId === với id của user, thể hiện mối quan hệ giữa 2 tables user và account
            // check account.providrer === google này đã tồn tại hay chưa
            const existingAccount = await prisma.account.findFirst({
              where: {
                userId: newUser?.id //kiểm tra đối chiếu userId of account với id của newUser vừa được tạo 
              }
            })

            if (existingAccount) {
              return true; // đã có tài khoản google rồi thì cho phép đăng nhập
            }
            //gán account mới tương ứng vào bảng  
            if (newUser?.id) await prisma.account.create({
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
            })
          }
          if (existingUser && !existingUser.emailVerified) {
            // bắt buộc người dùng phải xác minh email nếu đã đăng ký qua credentials trước đó, tránh trường hợp chưa xác minh nhưng được duyệt 
            return "/auth/verify"; //điều hướng dến trang new-verification và thực hiện thông báo kiểm tra email nếu token không đúng 
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

          // Nếu người dùng đã xác minh email, cho phép đăng nhập
          return true;

        }
        /* CREDENTIALS PROVIDER
        Callback signIn của NextAuth chỉ nên dùng để kiểm tra cuối cùng (ví dụ: user đã xác thực email, đã xác thực 2FA, v.v.), hoặc để reject đăng nhập nếu cần.
Nếu bạn đã xử lý toàn bộ logic xác thực (email, 2FA, trạng thái user...) trong loginUser (ví dụ: khi submit form login), thì ở callback signIn chỉ cần return true là đủ.
*/
        if (account.provider === "credentials") {
          return true;
        }
        //Các provider khác google thì không xử lý ở đây, giao quyền cho loginUser và chỉ return true để tiếp tục 
        return true;

      } catch (error) {
        apiLogger.logError("Sign-in error:", error as Error);
        // Pass error message to error page
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`signInError=${encodeURIComponent(errorMessage)}`);
      }
    },

    // Callback session để tùy chỉnh session
    async session({ token, session }) {
      //kiểm tra xem session.user có tồn tại hay không? nếu không thì trả về session mặc định
      if (!session.user) return session;

      apiLogger.debug('🔍 Session Callback Debug:', {
        tokenRole: token.role,
        tokenEmail: token.email,
        sessionUserBefore: session.user.role
      });

      // Gán các thuộc tính cơ bản cho user
      session.user.id = token.sub || "";
      session.user.name = token.name;
      session.user.email = token.email as string;      // Gán các thuộc tính phân quyền và xác thực
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
    },

    // Callback jwt để quản lý JWT token
    async jwt({ token, account, trigger, session }) {
      // Cập nhật token khi có thay đổi từ session
      if (trigger === "update" && session) {
        // Xử lý khi client gọi update session
        return { ...token, ...session };
      }

      // Lưu trữ access_token và refresh_token khi đăng nhập
      if (account && account.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.tokenType = account.token_type;
      }

      // ✅ DI CHUYỂN LOGIC POPULATE USER DATA LÊN ĐẦU
      // Xử lý dữ liệu người dùng TRƯỚC KHI check token expiry
      if (token.sub) {
        const existingUser = await getUserById(token.sub);
        console.log('🔍 JWT Callback Debug:', {
          tokenSub: token.sub,
          existingUser: existingUser ? {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            name: existingUser.name
          } : null,
          currentTokenRole: token.role
        });
        
        if (existingUser) {
          const existingAccount = await getAccountByUserId(existingUser.id);

          // Check for two-factor confirmation
          const twoFactorConfirmation = existingUser.isTwoFactorEnabled
            ? await getTwoFactorConfirmationByUserId(existingUser.id)
            : null;

          token.isOAuth = !!existingAccount;
          token.name = existingUser.name;
          token.email = existingUser.email;
          token.role = existingUser.role; // ✅ QUAN TRỌNG: Set role từ DB
          token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;
          token.is2FAVerified = !!twoFactorConfirmation;
          
          console.log('🔍 JWT Token Updated:', {
            newTokenRole: token.role,
            userDbRole: existingUser.role,
            roleMatch: token.role === existingUser.role
          });
        }
      }

      // Kiểm tra token hết hạn và refresh nếu cần
      if (token.expiresAt && typeof token.expiresAt === 'number' &&
        Date.now() < token.expiresAt * 1000 - 60000) {
        // Token còn hạn, trả về token hiện tại (ĐÃ POPULATE USER DATA)
        // 60000ms = 1 phút, refresh trước khi hết hạn 1 phút
        console.log("Access token còn hiệu lực, thời gian còn lại:",
          Math.round((token.expiresAt * 1000 - Date.now()) / 1000 / 60), "phút");

        return token;
      } else if (token.refreshToken) {
        try {
          const refreshedTokens = await refreshAccessToken(token.refreshToken as string);
          return {
            ...token,
            accessToken: refreshedTokens.access_token,
            refreshToken: refreshedTokens.refresh_token || token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
          };
        } catch (error) {
          console.error("Detailed error context:", {
            userId: token.sub,
            errorMessage: error instanceof Error ? error.message : String(error)
          });
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }

      return token;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7 // 1 week
  },
  secret: process.env.AUTH_SECRET,
  ...authConfig
});