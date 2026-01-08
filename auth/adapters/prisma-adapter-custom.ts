import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { Adapter } from "next-auth/adapters"

/**
 * Custom Prisma Adapter wrapper
 * Loại bỏ các method authenticator vì không sử dụng WebAuthn
 */
export function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma)
  
  // Loại bỏ các method authenticator không cần thiết
  const {
    createAuthenticator,
    getAuthenticator,
    listAuthenticatorsByUserId,
    updateAuthenticatorCounter,
    ...adapterWithoutAuthenticator
  } = baseAdapter as any

  return adapterWithoutAuthenticator as Adapter
}
