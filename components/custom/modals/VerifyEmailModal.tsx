'use client'
import React from 'react'
import { EmailVerificationForm } from "@/components/custom/forms/EmailVerificationForm"

interface VerifyEmailModalProps {
    isOpen: boolean
    onClose: () => void
    currentEmail?: string // Pre-fill với email hiện tại của user
}

const VerifyEmailModal: React.FC<VerifyEmailModalProps> = ({ 
    isOpen, 
    onClose, 
    currentEmail 
}) => {
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
            id="verifyEmailModal"
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

                    <h2 className="login-modal-title">Verify Your Email</h2>
                    <p className="login-modal-subtitle">
                        We'll send you a verification link to confirm your email address.
                    </p>

                    <div className="login-options">
                        {/* Email Verification Form */}
                        <EmailVerificationForm
                            initialEmail={currentEmail}
                            redirectTo="/dashboard/user/settings"
                            buttonText="Send Verification Link"
                            loadingText="Sending verification link..."
                            successTitle="Check your email!"
                            successMessage="We sent a verification link to"
                            showCloseButton={true}
                            onClose={onClose}
                        />
                    </div>

                    <p className="login-modal-footer text-sm text-muted-foreground">
                        Haven't received the email? Check your spam folder or try again in a few minutes.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default VerifyEmailModal
