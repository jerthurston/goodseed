import Facebook from "next-auth/providers/facebook";
// Facebook OAuth Provider Configuration
/**
 * Facebook OAuth Provider Configuration
 * 
 * Features:
 * - Response type code để tuân thủ OAuth 2.0 authorization code flow
 */

export const facebookProvider = Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      authorization: {
        params: {
          scope: "email public_profile", // Remove email scope temporarily
        },
      },
      // Custom profile mapping for consistency
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email || null, // Email might not be available
          image: profile.picture?.data?.url,
        }
      },
    });