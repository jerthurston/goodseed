import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { prisma } from '../lib/prisma';
import { CustomPrismaAdapter } from './adapters/prisma-adapter-custom';

import { 
  signInCallback,
  sessionCallback,
  jwtCallback
} from './callbacks/index'

import { apiLogger } from '../lib/helpers/api-logger';
export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  adapter: CustomPrismaAdapter(), //kết nối nextauth với prisma (custom adapter không dùng WebAuthn) 
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    // Add explicit 2FA page to avoid any potential redirects during 2FA flow
    verifyRequest: '/auth/2fa'
  }, //pages: định nghĩa custom page cho đăng nhập và trả lỗi 
  events: {
    async linkAccount({ user, account }) {
      // ✅ CHỈ cập nhật emailVerified, KHÔNG tạo Account
      // Lý do: PrismaAdapter đã tự động tạo Account record
      // Tạo thêm ở đây sẽ gây duplicate records
      if (account.provider === "google" || account.provider === "facebook") {
        apiLogger.info("OAuth account linked, updating emailVerified:", { 
          userId: user.id, 
          provider: account.provider 
        });
        
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() }
        });
      }
    }
  },
  // callbacks: Các hàm xử lý logic tùy chỉnh (signIn, session, jwt)
  callbacks: {
    // Callback signIn để kiểm tra và xử lý đăng nhập
    signIn: signInCallback,

    // Callback session để tùy chỉnh session
    session: sessionCallback,

    // Callback jwt để quản lý JWT token
    jwt: jwtCallback,
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7 // 1 week
  },
  secret: process.env.AUTH_SECRET,
  ...authConfig
});