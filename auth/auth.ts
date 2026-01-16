import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { CustomPrismaAdapter } from './adapters/prisma-adapter-custom';

// Import callbacks
import { 
  signInCallback,
  sessionCallback,
  jwtCallback
} from './callbacks/index';

// Import events
import { 
  linkAccountEvent,
  createUserEvent 
} from './events/index';
export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  //kết nối nextauth với prisma (custom adapter không dùng WebAuthn) 
  adapter: CustomPrismaAdapter(), 

  // Events: Các handler được fired sau khi action hoàn thành
  events: {
    linkAccount: linkAccountEvent,
    // createUser: createUserEvent, // Tạo wishlist folder mặc định khi user mới được tạo (magic link)
  },

  // Callbacks: Các hàm xử lý logic tùy chỉnh (signIn, session, jwt)
  callbacks: {
    // Callback signIn để kiểm tra và xử lý đăng nhập
    signIn: signInCallback,

    // Callback session để tùy chỉnh session
    session: sessionCallback,

    // Callback jwt để quản lý JWT token
    jwt: jwtCallback,
  },
  // Session configuration
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7 // 1 week
  },
  // Secret used to encrypt session data
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Other NextAuth configuration options
  ...authConfig
});