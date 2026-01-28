'use client';
import { apiLogger } from "@/lib/helpers/api-logger";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function useFacebookSignIn() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const facebookSignIn = async (redirectTo: string) => {
        setIsLoading(true);
        try {
            const result = await signIn("facebook", {
                redirect: true,
                redirectTo,
            });
            apiLogger.info("Facebook sign-in initiated", result as any);
        } catch (error) {
            apiLogger.logError("Facebook sign-in failed", error as Error);
            setError(error as Error);
        } finally {
            setIsLoading(false);
        }
    };

    return { facebookSignIn, isLoading, error };
}