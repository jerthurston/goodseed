import Google from "next-auth/providers/google"

/**
 * Google OAuth Provider Configuration
 * 
 * Features:
 * - Offline access để nhận refresh_token
 * - Prompt consent để user luôn thấy màn hình đồng ý
 * - Response type code để tuân thủ OAuth 2.0 authorization code flow
 */
export const googleProvider = Google({
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
  // Google requires "offline" access_type to provide a `refresh_token`
  authorization: {
    params: {
      access_type: "offline",
      prompt: "consent",
      response_type: "code",
    },
  },
})
