'use client';
import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { apiLogger } from "@/lib/helpers/api-logger";

export function useGoogleSignIn() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const googleSignIn = async (redirectTo: string = '/') => {
        setIsLoading(true)
        setError(null);

        try {
            const result = await signIn(
                "google",
                {
                    redirect: true,
                    redirectTo
                }
            )
            apiLogger.info("Sign-in initiated", result as any);
            setError(null);
            toast.success("Sign-in successful. Redirecting...");
        } catch (error) {
            apiLogger.logError("Sign-in failed", error as Error);
            toast.error("Sign-in failed");
            setError(error as Error);
            
        } finally {
            setIsLoading(false);
        }

    };

    return { googleSignIn, isLoading, error };

}