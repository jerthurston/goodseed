import bcrypt from 'bcryptjs';
import { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook"

import Credentials from "next-auth/providers/credentials";
import { type AuthUser } from './types/user';
import { getUserByEmail } from './lib/helpers/server/user';

import { LoginSchema } from './validations/auth';
import { apiLogger } from './lib/helpers/api-logger';
import Resend from "next-auth/providers/resend"

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // custom
      // Google requires "offline" access_type to provide a `refresh_token`
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
    
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      authorization: {
        params: {
          scope: "public_profile",
        },
      },
    }),
    // Resend({
    //     apiKey: process.env.AUTH_RESEND_API_KEY,
    // })
    // add more providers here such as: facebook, x...

    // Credentials({
    //   name: "Credentials",
    //   credentials: {
    //     email: { label: "Email", type: "text", placeholder: "email" },
    //     password: { label: "Password", type: "password" },
    //   },
    //   async authorize(credentials): Promise<AuthUser | null> {
    //     try {
    //       const validatedFields = LoginSchema.safeParse(credentials);

    //       if (!validatedFields.success) {
    //         apiLogger.info("Invalid credentials format");
    //         return null;
    //       }

    //       const { email, password } = validatedFields.data;

    //       // Make sure email is defined before calling getUserByEmail
    //       if (!email) {
    //         apiLogger.info("Email is required");
    //         return null;
    //       }

    //       const user = await getUserByEmail(email);
    //       if (!user || !user.password) {
    //         apiLogger.info("User not found or no password set");
    //         return null;
    //       }

    //       const passwordsMatch = await bcrypt.compare(
    //         password,
    //         user.password
    //       );

    //       if (passwordsMatch) {
    //         // Return the user as is - it should already match our updated AuthUser interface
    //         // since it comes directly from Prisma
    //         return user;
    //       }

    //       apiLogger.info("Password doesn't match");
    //       return null;
    //     } catch (error) {
    //       apiLogger.logError("Error in credentials authorization:", error as Error);
    //       return null;
    //     }
    //   }
    // }),
  ],
  debug: true, // Enable debug messages in the console
} satisfies NextAuthConfig;