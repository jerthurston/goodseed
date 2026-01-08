import { NextAuthConfig } from "next-auth";
import { googleProvider } from './providers/google.provider';
import { facebookProvider } from './providers/facebook.provider';
import { credentialsProvider } from './providers/credentials.provider';
import Resend from "next-auth/providers/resend"

export default {
  providers: [
    googleProvider,
    facebookProvider,
    // credentialsProvider,
    // Resend({
    //     apiKey: process.env.AUTH_RESEND_API_KEY,
    // })
    // add more providers here such as: facebook, x...

    
  ],
  debug: true, // Enable debug messages in the console
} satisfies NextAuthConfig;