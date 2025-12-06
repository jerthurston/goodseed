'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function CookieBanner() {
    // Lazy initialization - only runs once on mount
    const [shouldShow, setShouldShow] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const cookieConsent = localStorage.getItem('cookieConsent');
        return !cookieConsent;
    });

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setShouldShow(false);
        // TODO: Initialize analytics/tracking cookies here
        console.log('Cookies accepted');
    };

    const handleReject = () => {
        localStorage.setItem('cookieConsent', 'rejected');
        setShouldShow(false);
        // TODO: Disable non-essential cookies
        console.log('Cookies rejected');
    };

    if (!shouldShow) return null;

    return (
        <div className="cookie-consent-banner" id="cookieBanner">
            <div className="cookie-banner-content">
                <div className="cookie-banner-text">
                    <h3>Stay in the Grow with Cookies</h3>
                    <p>
                        We use cookies to personalize your experience, remember your preferences, and analyze our traffic.
                        Accepting helps us improve your journey. <Link href="/privacy-policy">Learn more</Link>.
                    </p>
                </div>
                <div className="cookie-banner-actions">
                    <button className="btn-styled primary" onClick={handleAccept}>
                        Accept All
                    </button>
                    <button className="btn-styled secondary" onClick={handleReject}>
                        No Thanks
                    </button>
                </div>
            </div>
        </div>
    );
}
