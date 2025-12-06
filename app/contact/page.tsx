'use client';

import { faHandshake, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        category: '',
        message: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // TODO: Implement actual form submission logic
        console.log('Form submitted:', formData);

        // Show confirmation message
        setIsSubmitted(true);

        // Reset form
        setFormData({
            name: '',
            email: '',
            category: '',
            message: ''
        });

        // Hide confirmation after 5 seconds
        setTimeout(() => {
            setIsSubmitted(false);
        }, 5000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <main className="contact-page-main">
            <section className="contact-hero">
                <h1>Get in Touch with GoodSeed</h1>
                <p>Questions? Feedback? Interested in listing your seeds? We&apos;d love to hear from you.</p>
            </section>

            <div className="contact-content-wrapper">
                <section className="faq-prompt-box">
                    <h3><FontAwesomeIcon icon={faSearch} /> Need help fast?</h3>
                    <p>
                        Our <Link href="/faq">FAQ page</Link> answers the most common questions about how GoodSeed works, seed listings, legality, and more.
                        Still need support? Just fill out the form below.
                    </p>
                </section>

                <section className="contact-form-container" id="contactFormContainer">
                    <form id="goodseedContactForm" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="contactName">Name</label>
                            <input
                                type="text"
                                id="contactName"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactEmail">Email</label>
                            <input
                                type="email"
                                id="contactEmail"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactCategory">Category</label>
                            <select
                                id="contactCategory"
                                name="category"
                                className="form-select"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Select a category...</option>
                                <option value="general">General Question</option>
                                <option value="bug">Bug Report</option>
                                <option value="feedback">Feedback</option>
                                <option value="business">Business / Seller Inquiry</option>
                                <option value="other">Something Else</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactMessage">Message</label>
                            <textarea
                                id="contactMessage"
                                name="message"
                                className="form-textarea"
                                rows={6}
                                value={formData.message}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <div className="cf-turnstile" data-sitekey="YOUR_SITE_KEY" data-theme="light"></div>
                            {/* TODO: Replace YOUR_SITE_KEY with actual Cloudflare Turnstile Site Key */}
                        </div>

                        <button type="submit" className="submit-btn">Send Message</button>
                    </form>

                    <div
                        id="formConfirmationMessage"
                        className={`confirmation-message ${isSubmitted ? '' : 'hidden'}`}
                    >
                        <p>✅ Thanks for reaching out — we&apos;ve received your message and will get back to you as soon as we can.</p>
                    </div>
                </section>

                <section className="business-inquiries-box">
                    <h3><FontAwesomeIcon icon={faHandshake} /> List Your Seeds on GoodSeed</h3>
                    <p>
                        Are you a seed vendor or breeder? We&apos;d love to feature your products and connect you with our community of passionate growers.
                        Learn how to partner with us or promote your catalog.
                    </p>
                    <p>
                        Reach out directly to our partnerships team at:{' '}
                        <a href="mailto:partners@goodseed.ca" className="email-link">partners@goodseed.ca</a>
                    </p>
                    <Link href="/partners" className="partner-cta-btn">
                        Learn More About Partnering &rarr;
                    </Link>
                </section>

                <section className="privacy-note">
                    <p>
                        This form collects your name and email solely for the purpose of responding to your inquiry.
                        Please review our <Link href="/privacy-policy">Privacy Policy</Link> for more information.
                    </p>
                </section>
            </div>
        </main>
    );
}
