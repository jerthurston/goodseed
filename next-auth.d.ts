import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";
export type ExtendedUser = DefaultSession["user"] & {
    // extend some props for user in session of next-auth here
    id: string;
    name?: string | null;
    email: string;
    role: UserRole;
    isTwoFactorEnabled: boolean;
    isOAuth: boolean;
    is2FAVerified: boolean;
}

// after define type ExtendedUser, we will declare in module "next-auth" to interface Session with some new props
declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
        // custom
        accessToken?: string;
        error?: string;
        // refreshToken:string;
    }
};

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: UserRole;
        isOAuth?: boolean;
        isTwoFactorEnabled?: boolean;
        is2FAVerified?: boolean;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
        tokenType?: string;
        error?: string;
    }
}





