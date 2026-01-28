import { LoginSchema } from "@/validations/auth";
import Credentials from "next-auth/providers/credentials";
import { type AuthUser } from "@/types/auth";
import { apiLogger } from "@/lib/helpers/api-logger";
import { getUserByEmail } from "@/lib/helpers/server/user";
import bcrypt from "bcryptjs";

export const credentialsProvider = Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email" },
        password: { label: "Password", type: "password" },
      },
      
      async authorize(credentials): Promise<AuthUser | null> {
        try {
          const validatedFields = LoginSchema.safeParse(credentials);

          if (!validatedFields.success) {
            apiLogger.info("Invalid credentials format");
            return null;
          }

          const { email, password } = validatedFields.data;

          // Make sure email is defined before calling getUserByEmail
          if (!email) {
            apiLogger.info("Email is required");
            return null;
          }

          const user = await getUserByEmail(email);
          if (!user || !user.password) {
            apiLogger.info("User not found or no password set");
            return null;
          }

          const passwordsMatch = await bcrypt.compare(
            password,
            user.password
          );

          if (passwordsMatch) {
            // Return the user as is - it should already match our updated AuthUser interface
            // since it comes directly from Prisma
            return user;
          }

          apiLogger.info("Password doesn't match");
          return null;
        } catch (error) {
          apiLogger.logError("Error in credentials authorization:", error as Error);
          return null;
        }
      }
    })