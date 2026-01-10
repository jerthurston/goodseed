'use client'

import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-regular-svg-icons'
import { Icons } from '@/components/ui/icons'
import { useMagicLinkSignIn } from '@/hooks/auth/useMagicLinkSignIn'

/**
 * EmailVerificationForm - Self-contained email verification form component
 * 
 * This component manages its own state and handles email verification flow.
 * It can be reused in different contexts (SignIn, Verify Email, etc.)
 * 
 * @example
 * // Basic usage (Sign In)
 * <EmailVerificationForm redirectTo="/dashboard" />
 * 
 * @example
 * // With customization (Verify Email)
 * <EmailVerificationForm
 *   initialEmail="user@example.com"
 *   redirectTo="/dashboard/user/settings"
 *   buttonText="Send Verification Link"
 *   loadingText="Sending verification link..."
 *   showCloseButton={true}
 *   onClose={handleClose}
 * />
 */
interface EmailVerificationFormProps {
    initialEmail?: string // Email khởi tạo (optional)
    redirectTo?: string // Redirect URL sau khi sign in (default: '/')
    buttonText?: string // Custom text cho button (default: "Continue with Email")
    loadingText?: string // Custom text khi loading (default: "Sending magic link...")
    successTitle?: string // Custom title cho success message
    successMessage?: string // Custom message cho success
    showCloseButton?: boolean // Hiển thị nút Close trong success state
    onClose?: () => void // Callback khi click Close
}

export const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({
    initialEmail = '',
    redirectTo = '/',
    buttonText = "Continue with Email",
    loadingText = "Sending magic link...",
    successTitle = "Check your email!",
    successMessage = "We sent a magic link to",
    showCloseButton = false,
    onClose
}) => {
    const [email, setEmail] = useState(initialEmail)
    const { magicLinkSignIn, isEmailLoading, emailSent } = useMagicLinkSignIn()

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await magicLinkSignIn(email, redirectTo)
    }
    return (
        <>
            {!emailSent ? (
                <form 
                    className="email-form" 
                    onSubmit={handleEmailSubmit}
                >
                    <input
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isEmailLoading}
                        aria-label="Email address"
                    />
                    <button
                        type="submit"
                        disabled={isEmailLoading || !email}
                        className="email-submit-btn"
                    >
                        {isEmailLoading ? (
                            <div className="flex flex-row items-center justify-center gap-2">
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                <span>{loadingText}</span>
                            </div>
                        ) : (
                            <span>{buttonText}</span>
                        )}
                    </button>
                </form>
            ) : (
                <div className="email-sent-success">
                    <FontAwesomeIcon 
                        icon={faCheckCircle} 
                        className="text-(--brand-primary) text-2xl"
                    />
                    <h3 className="text-lg font-semibold mb-2">{successTitle}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                        {successMessage} <strong className="underline">{email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Click the link to sign in. It expires in 24 hours.
                    </p>
                    {showCloseButton && onClose && (
                        <button
                            className="btn-styled ghost mt-4"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    )}
                </div>
            )}
        </>
    )
}
