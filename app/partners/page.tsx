'use client';

import { faCheckCircle, faEnvelope, faHandshake, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';

export default function PartnersPage() {
    return (
        <main className="partner-page-main">
            <section className="partner-hero">
                <h1>Partner With GoodSeed</h1>
                <p className="subtext">Reach more growers. Get discovered. Grow your brand.</p>
            </section>

            <div className="partner-content-column">
                <section className="partner-content-section">
                    <p>
                        GoodSeed is a cannabis seed discovery platform designed to help users compare prices and find trusted sellers — quickly and easily.
                        We&apos;re building a transparent, user-first ecosystem. If you sell high-quality seeds or related products, we&apos;d love to work with you.
                    </p>
                </section>

                <section className="partner-content-section">
                    <h2><FontAwesomeIcon icon={faHandshake} /> Who We Work With</h2>
                    <ul>
                        <li>Seed Banks</li>
                        <li>Breeders</li>
                        <li>Online Retailers</li>
                        <li>Industry Partners & Advertisers</li>
                    </ul>
                </section>

                <section className="partner-content-section">
                    <h2><FontAwesomeIcon icon={faLightbulb} /> Opportunities to Collaborate</h2>
                    <ul>
                        <li>List your products on our search platform</li>
                        <li>Affiliate integrations (revenue share for referrals)</li>
                        <li>Sponsored placements for extra visibility</li>
                        <li>Email features (promotions, price alerts)</li>
                        <li>Custom collaborations — we&apos;re open to ideas</li>
                    </ul>
                </section>

                <section className="partner-content-section">
                    <h2><FontAwesomeIcon icon={faCheckCircle} /> What We Look For</h2>
                    <ul>
                        <li>A reliable, trustworthy seller</li>
                        <li>Legally compliant in your region</li>
                        <li>Clear product info and fair pricing</li>
                    </ul>
                    <div className="highlight-box">
                        <p>We aim to maintain a high-quality experience for users. Each listing or partnership request is reviewed before going live.</p>
                    </div>
                </section>

                <section className="partner-content-section text-center">
                    <h2><FontAwesomeIcon icon={faEnvelope} /> Ready to Connect?</h2>
                    <p>
                        Have something in mind? Want to explore options? <br />
                        Fill out our <Link href="/contact" className="email-link">contact form</Link> or reach us at <a href="mailto:partners@goodseed.ca" className="email-link">partners@goodseed.ca</a>.
                    </p>
                    <p className="final-cta">
                        Let&apos;s grow something great together.
                    </p>
                    <Link href="/contact" className="contact-cta-btn">Contact Us Now</Link>
                </section>
            </div>
        </main>
    );
}
