'use client'

import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import React, { useState } from 'react'

const Footer = () => {
    const [email, setEmail] = useState('')
    const currentYear = new Date().getFullYear()

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement newsletter subscription logic
        console.log('Newsletter subscription:', email)
        setEmail('')
    }

    return (
        <footer className="main-footer">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* Brand Column */}
                    <div className="footer-column">
                        <h3 className="logo-text">goodseed</h3>
                        <p>Connecting you to trusted seed vendors since 2023.</p>
                    </div>

                    {/* Navigate Column */}
                    <div className="footer-column">
                        <h4 className="footer-section-title">Navigate</h4>
                        <ul className="footer-links">
                            <li>
                                <Link href="/">Home</Link>
                            </li>
                            <li>
                                <Link href="/#features">About</Link>
                            </li>
                            <li>
                                <Link href="/seeds">Browse</Link>
                            </li>
                            <li>
                                <Link href="/favorites">Favorites</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support Column */}
                    <div className="footer-column">
                        <h4 className="footer-section-title">Support</h4>
                        <ul className="footer-links">
                            <li>
                                <Link href="/contact">Contact</Link>
                            </li>
                            <li>
                                <Link href="/faq">FAQs</Link>
                            </li>
                            <li>
                                <Link href="/partners">Partners</Link>
                            </li>
                            <li>
                                <Link href="/privacy-policy">Privacy</Link>
                            </li>
                            <li>
                                <Link href="/terms-of-service">Terms</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Stay Connected Column */}
                    <div className="footer-column">
                        <h4 className="footer-section-title">Stay Connected</h4>
                        <div className="social-icons">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Facebook"
                                aria-label="Visit our Facebook page"
                            >
                                <FontAwesomeIcon icon={faFacebookF} />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Twitter"
                                aria-label="Visit our Twitter page"
                            >
                                <FontAwesomeIcon icon={faTwitter} />
                            </a>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Instagram"
                                aria-label="Visit our Instagram page"
                            >
                                <FontAwesomeIcon icon={faInstagram} />
                            </a>
                        </div>
                        <p className="footer-newsletter-prompt">Subscribe to our newsletter:</p>
                        <form className="footer-newsletter-form" onSubmit={handleNewsletterSubmit}>
                            <input
                                type="email"
                                placeholder="Your email"
                                className="newsletter-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                aria-label="Email address"
                            />
                            <button
                                type="submit"
                                className="newsletter-button"
                                aria-label="Subscribe to Newsletter"
                            >
                                <FontAwesomeIcon icon={faPaperPlane} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Copyright */}
                <div className="copyright">
                    <p>© {currentYear} goodseed. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
