/**
 *   const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email');
            return;
        }

        setIsEmailLoading(true);

        try {
            const result = await signIn('resend', {
                email,
                redirect: false,
                callbackUrl: '/',
            });

            if (result?.error) {
                toast.error('Failed to send magic link');
                apiLogger.logError('email.signIn', new Error(result.error), { email });
            } else {
                setEmailSent(true);
                toast.success('Check your email for the magic link!');
                apiLogger.info('Magic link requested', { email });
            }

        } catch (error) {
            toast.error('An error occurred');
            apiLogger.logError('email.signIn', error as Error, { email });
        } finally {
            setIsEmailLoading(false);
        }

    };
 */

import { apiLogger } from "@/lib/helpers/api-logger";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

    export function useMagicLinkSignIn() {
        const [isEmailLoading, setIsEmailLoading] = useState(false);
        const [emailSent, setEmailSent] = useState(false);

        const magicLinkSignIn = async (email: string, redirectTo: string) => {
            if (!email || !email.includes('@')) {
                toast.error('Please enter a valid email');
                return;
            }

            setIsEmailLoading(true);

            try {
                const result = await signIn('resend', {
                    email,
                    redirect: false,
                    redirectTo,
                });

                if (result?.error) {
                    toast.error('Failed to send magic link');
                    apiLogger.logError('email.signIn', new Error(result.error), { email });
                } else {
                    setEmailSent(true);
                    toast.success('Check your email for the magic link!');
                    apiLogger.info('Magic link requested', { email });
                }

            } catch (error) {
                toast.error('An error occurred');
                apiLogger.logError('email.signIn', error as Error, { email });
            } finally {
                setIsEmailLoading(false);
            }
        };

        return {
            magicLinkSignIn,
            isEmailLoading,
            emailSent
        };
    }
