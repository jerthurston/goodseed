import { render } from "@react-email/render";
import Resend from "next-auth/providers/resend";
import { Resend as ResendClient } from 'resend';
import { MagicLinkEmail } from "../email-template/MagicLinkEmail";
import { apiLogger } from "@/lib/helpers/api-logger";
import { checkMagicLinkRateLimit } from "@/lib/helpers/server/magicLink/index";


const resendClient = new ResendClient(process.env.RESEND_API_KEY!);

export const resendProvider = Resend({
    from: process.env.RESEND_FROM_EMAIL!,

    async sendVerificationRequest({
        identifier: email, 
        url, 
        provider,
        request, // NextAuth request object
    }) {
        try {
            // ========================================
            // RATE LIMIT CHECK
            // ========================================
            const ipAddress = request?.headers?.get('x-forwarded-for')?.split(',')[0] 
                           || request?.headers?.get('x-real-ip') 
                           || 'unknown';

            const rateLimitResult = await checkMagicLinkRateLimit(email, ipAddress);

            if (!rateLimitResult.allowed) {
                // Format cooldown time
                const cooldownMinutes = rateLimitResult.cooldownEndsAt 
                    ? Math.ceil((rateLimitResult.cooldownEndsAt.getTime() - Date.now()) / 60000)
                    : 30;

                // Unified error message for UI detection
                // UI checks: errorMessage.includes('Rate limit exceeded')
                const errorMessage = `Rate limit exceeded. ${
                    rateLimitResult.reason === 'COOLDOWN_ACTIVE'
                        ? 'Your account is in cooldown period.'
                        : 'Too many attempts detected.'
                }`;

                apiLogger.warn('[AUTH] Magic link blocked by rate limiter', { 
                    email, 
                    ipAddress,
                    reason: rateLimitResult.reason,
                    cooldownEndsAt: rateLimitResult.cooldownEndsAt,
                    cooldownMinutes
                });
                apiLogger.debug('[AUTH] Magic link rate limit check', {errorMessage});
                // Throw error để NextAuth hiển thị message cho user
                throw new Error(errorMessage);
            }

            // ========================================
            // SEND EMAIL
            // ========================================
            const emailHtml = await render(MagicLinkEmail({ url, email }));

            const result = await resendClient.emails.send({
                from: provider.from as string,
                to: email,
                subject: `Sign in to Goodseed`,
                html: emailHtml
            });

            apiLogger.info('[AUTH] Magic link email sent', {
                email,
                ipAddress,
                emailId: result.data?.id,
                remainingAttempts: rateLimitResult.remainingAttempts,
                resetAt: rateLimitResult.resetAt,
            });

        } catch (error) {
            apiLogger.logError('[AUTH] resend.sendVerificationRequest', error as Error, { email });
            throw error; // Re-throw để NextAuth handle
        }
    }
});