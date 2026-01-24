'use client'
import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import React from 'react'
import { Icons } from "@/components/ui/icons"
import { useGoogleSignIn } from "@/hooks/auth/useGoogleSignIn"
import { useFacebookSignIn } from "@/hooks/auth/useFacebookSignIn"
import { EmailVerificationForm } from "@/components/custom/forms/EmailVerificationForm"
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'

interface SignInModalProps {
    isOpen: boolean
    onClose: () => void
    onLoginSuccess?: () => void
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const pathname = usePathname();
    
    const { googleSignIn, isLoading: isGoogleLoading } = useGoogleSignIn();
    const { facebookSignIn, isLoading: isFacebookLoading } = useFacebookSignIn();

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    const modalContent = (
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
                        {/* Google Authentication */}
                        <button
                            className="social-login-btn google"
                            onClick={() => googleSignIn(`${pathname}`)}
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

                        {/* Facebook Authentication */}
                        <button
                            className="social-login-btn facebook"
                            onClick={() => facebookSignIn('/dashboard/user/settings')}
                            disabled={isFacebookLoading}
                            type="button"
                        >
                            {
                                isFacebookLoading ? (
                                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faFacebook} />
                                        <span className='ml-1'>
                                            Continue with Facebook
                                        </span>
                                    </>
                                )
                            }
                        </button>

                        <div className="divider-or">
                            <span>OR</span>
                        </div>

                        {/* Email Authentication - Resend verification email */}
                        <EmailVerificationForm
                            redirectTo="/dashboard/user/settings"
                        />
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

    // Render modal through portal to document.body
    return typeof document !== 'undefined' 
        ? createPortal(modalContent, document.body)
        : null
}

export default SignInModal
