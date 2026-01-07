'use client'
import { signIn } from "next-auth/react"
import { apiLogger } from '@/lib/helpers/api-logger'
import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Icons } from "@/components/ui/icons"

interface SignInModalProps {
    isOpen: boolean
    onClose: () => void
    onLoginSuccess?: () => void
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState('')
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true)
        try {
            const result = await signIn(
                "google",
                {
                    redirect: true,
                    redirectTo: "/"
                }
            )
            apiLogger.info("Sign-in initiated", result as any);
        } catch (error) {
            apiLogger.logError("Sign-in failed", error as Error);
            toast.error("Sign-in failed");
            setIsGoogleLoading(false)
        }
    }

    const handleEmailSubmit = () => {
        // TODO: Implement Google OAuth logic
        console.log('Google login')
        // Simulate successful login
        if (onLoginSuccess) {
            onLoginSuccess()
        }
    }

    const handleFacebookLogin = () => {
        // TODO: Implement Facebook OAuth logic
        console.log('Facebook login')
        // Simulate successful login
        if (onLoginSuccess) {
            onLoginSuccess()
        }
    }

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className={`login-modal-overlay 
                ${isOpen ? 'active' : ''}
                `}
            id="loginModal"
            onClick={handleOverlayClick}
        >
            <div className="login-modal-content">
                <div className='h-full'>
                    <button
                        className="login-modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>

                    <h2 className="login-modal-title">Login or Create Account</h2>
                    <p className="login-modal-subtitle">
                        Join our community to save favorites and compare seeds easily.
                    </p>

                    <div className="login-options">
                        <button
                            className="social-login-btn google"
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading}
                            type="button"
                        >
                            {
                                isGoogleLoading ? (
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faGoogle} />
                                        <span className='ml-1'>
                                            Continue with Google
                                        </span>
                                    </>
                                )
                            }

                        </button>

                        <button
                            className="social-login-btn facebook"
                            onClick={handleFacebookLogin}
                            type="button"
                        >
                            <FontAwesomeIcon icon={faFacebook} />
                            <span className='ml-1'>
                                Continue with Facebook
                            </span>
                        </button>

                        <div className="divider-or">
                            <span>OR</span>
                        </div>

                        <form className="email-form" onSubmit={handleEmailSubmit}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                required
                                className="email-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="Email address"
                            />
                            <button type="submit" className="email-submit-btn">
                                Continue with Email
                            </button>
                        </form>
                    </div>

                    <p className="login-modal-footer">
                        By continuing, you agree to our{' '}
                        <Link href="/terms-of-service">Terms of Service</Link> and{' '}
                        <Link href="/privacy-policy">Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SignInModal
