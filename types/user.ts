import { UserRole } from "@prisma/client";

// interface AuthUser need to aligment in schema.prisma
export interface AuthUser {
    id: string;
    name?: string | null;   // Nullable to match schema
    email?: string | null;  // Nullable to match schema
    emailVerified?: Date | null;
    image?: string | null;  // Added to match schema
    password?: string | null; // Nullable to match schema
    role: UserRole;
    isTwoFactorEnabled: boolean;
}