'use client';

import { faHandshake, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { FormEvent, useState, useEffect } from 'react';
import { useContactSubmission } from '@/hooks/submission-contact/useContactSubmission';
import { contactCategories, ContactSubmissionInput } from '@/schemas/contact-submission.schema';
import { z } from 'zod';
import { contactSubmissionSchema } from '@/schemas/contact-submission.schema';
import { useFetchCurrentUser } from '@/hooks/client-user/useFetchCurrentUser';
import { apiLogger } from '@/lib/helpers/api-logger';

export default function ContactPage() {
    const [formData, setFormData] = useState<ContactSubmissionInput>({
        name: '',
        email: '',
        category: 'general',
        message: ''
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    
    const { mutate, isPending, isSuccess, error } = useContactSubmission();
    const { data: user, isLoading: isLoadingUser } = useFetchCurrentUser();

    // Auto-fill user info if authenticated
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
            }));
        }
    }, [user]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidationErrors({});

        try {
            // Validate form data with Zod before submission
            const validatedData = contactSubmissionSchema.parse(formData);

            // Submit form using TanStack Query mutation
            mutate(validatedData, {
                onSuccess: (response) => {
                    apiLogger.info('✅ Form submitted successfully:');
                    
                    // Reset only message and category, keep user info
                    setFormData(prev => ({
                        ...prev,
                        category: 'general',
                        message: ''
                    }));
                },
                onError: (error) => {
                    apiLogger.logError('❌ Form submission failed:', error);
                }
            });
        } catch (err) {
            // Handle Zod validation errors
            if (err instanceof z.ZodError) {
                const errors: Record<string, string> = {};
                err.issues.forEach((issue) => {
                    const field = issue.path[0] as string;
                    errors[field] = issue.message;
                });
                setValidationErrors(errors);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear validation error for this field when user types
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
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
                                disabled={isPending}
                            />
                            {validationErrors.name && (
                                <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
                            )}
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
                                disabled={isPending}
                            />
                            {validationErrors.email && (
                                <p className="text-red-600 text-sm mt-1">{validationErrors.email}</p>
                            )}
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
                                disabled={isPending}
                            >
                                {contactCategories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.category && (
                                <p className="text-red-600 text-sm mt-1">{validationErrors.category}</p>
                            )}
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
                                disabled={isPending}
                            />
                            {validationErrors.message && (
                                <p className="text-red-600 text-sm mt-1">{validationErrors.message}</p>
                            )}
                        </div>

                        <button type="submit" className="submit-btn" disabled={isPending}>
                            {isPending ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>

                    {/* Success Message */}
                    {isSuccess && (
                        <div id="formConfirmationMessage" className="confirmation-message">
                            <p>✅ Thanks for reaching out — we&apos;ve received your message and will get back to you as soon as we can.</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="confirmation-message" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
                            <p>❌ {error.message}</p>
                        </div>
                    )}
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
