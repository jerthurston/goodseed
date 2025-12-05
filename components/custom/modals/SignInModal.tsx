'use client'

import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import React, { useState } from 'react'

interface SignInModalProps {
    isOpen: boolean
    onClose: () => void
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('')

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement email login logic
        console.log('Email login:', email)
        setEmail('')
    }

    const handleGoogleLogin = () => {
        // TODO: Implement Google OAuth logic
        console.log('Google login')
    }

    const handleFacebookLogin = () => {
        // TODO: Implement Facebook OAuth logic
        console.log('Facebook login')
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
                            onClick={handleGoogleLogin}
                            type="button"
                        >
                            <FontAwesomeIcon icon={faGoogle} /> Continue with Google
                        </button>

                        <button
                            className="social-login-btn facebook"
                            onClick={handleFacebookLogin}
                            type="button"
                        >
                            <FontAwesomeIcon icon={faFacebook} /> Continue with Facebook
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
