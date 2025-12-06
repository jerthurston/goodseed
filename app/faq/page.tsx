'use client';

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faBullhorn, faChevronDown, faComments, faLeaf, faShoppingCart, faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { useState } from 'react';

interface AccordionItemData {
    question: string;
    answer: string | React.ReactNode;
}

interface FAQSection {
    id: string;
    title: string;
    icon: IconDefinition;
    items: AccordionItemData[];
}

function AccordionItem({ question, answer }: AccordionItemData) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`accordion-item ${isOpen ? 'active' : ''}`}>
            <button
                className={`accordion-button ${isOpen ? 'active' : ''}`}
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
            >
                {question}
                <span className="accordion-icon">
                    <FontAwesomeIcon icon={faChevronDown} />
                </span>
            </button>
            <div className="accordion-content" style={{ maxHeight: isOpen ? '500px' : '0' }}>
                <p>{answer}</p>
            </div>
        </div>
    );
}

export default function FAQPage() {
    const faqSections: FAQSection[] = [
        {
            id: 'general-questions',
            title: 'General Questions',
            icon: faLeaf,
            items: [
                {
                    question: 'Does GoodSeed sell seeds?',
                    answer: 'No, GoodSeed does not sell seeds directly. We help users discover and compare seeds from trusted third-party sellers.'
                },
                {
                    question: 'Is GoodSeed free to use?',
                    answer: 'Yes — browsing, searching, and comparing seeds on GoodSeed is completely free.'
                },
                {
                    question: 'Is there an age restriction to use GoodSeed?',
                    answer: 'Yes. You must be 18 or older (or the legal age in your region) to use GoodSeed.'
                },
                {
                    question: 'Do I need an account to use the search?',
                    answer: 'Nope. You can search and compare freely. Some features like saving favorites or price alerts may require a login.'
                }
            ]
        },
        {
            id: 'buying-pricing',
            title: 'Buying & Pricing',
            icon: faShoppingCart,
            items: [
                {
                    question: 'Where do I buy the seeds I see on GoodSeed?',
                    answer: 'When you click a product, you\'re redirected to the seller\'s website, where you can view details or complete your purchase.'
                },
                {
                    question: 'Why do prices vary for the same strain?',
                    answer: 'Prices are set by individual seed banks or retailers. GoodSeed helps you compare them in one place.'
                },
                {
                    question: 'Are prices in USD or another currency?',
                    answer: 'Prices are displayed in USD to match most seed banks. We plan to add a currency selector soon so you can view listings in your preferred currency.'
                },
                {
                    question: 'How often are listings updated?',
                    answer: 'Listings and prices are refreshed regularly, but availability can change quickly — always double-check on the seller\'s site before purchasing.'
                }
            ]
        },
        {
            id: 'reviews-listings',
            title: 'Reviews & Listings',
            icon: faComments,
            items: [
                {
                    question: 'Can I leave reviews on seeds or sellers?',
                    answer: 'Not yet! We\'re working on features that let users share experiences and rate products.'
                },
                {
                    question: 'How do I get my seed company listed on GoodSeed?',
                    answer: (
                        <>
                            Visit our <Link href="/partners">Partner Page</Link> or <Link href="/contact">contact us</Link> — we&apos;d love to hear from you.
                        </>
                    )
                },
                {
                    question: 'Do you include every seed seller on the web?',
                    answer: 'No. We curate listings from trusted sources and may not include every seller. Our goal is to prioritize quality, trust, and transparency.'
                }
            ]
        },
        {
            id: 'favorites-alerts',
            title: 'Favorites & Alerts',
            icon: faStar,
            items: [
                {
                    question: 'How do favorites work?',
                    answer: 'If you\'re logged in, you can click the heart icon on a product to save it to your personal favorites list.'
                },
                {
                    question: 'What are price drop alerts?',
                    answer: 'If you favorite a product and opt into alerts, we\'ll notify you by email when its price drops on one of the sites we track.'
                }
            ]
        },
        {
            id: 'suggestions-support',
            title: 'Suggestions & Support',
            icon: faBullhorn,
            items: [
                {
                    question: 'Can I suggest a new feature or report a bug?',
                    answer: (
                        <>
                            Definitely — use our <Link href="/contact">contact form</Link> and let us know. We&apos;re always improving GoodSeed.
                        </>
                    )
                }
            ]
        }
    ];

    return (
        <main className="faq-page-main">
            <section className="faq-hero">
                <h1>Frequently Asked Questions</h1>
                <p className="subtext">Find answers to common questions about GoodSeed, our listings, and how we operate.</p>
            </section>

            <div className="faq-content-wrapper">
                {faqSections.map((section) => (
                    <section key={section.id} className="faq-section" id={section.id}>
                        <h2 className="faq-section-title">
                            <FontAwesomeIcon icon={section.icon} /> {section.title}
                        </h2>
                        <div className="accordion">
                            {section.items.map((item, index) => (
                                <AccordionItem key={index} question={item.question} answer={item.answer} />
                            ))}
                        </div>
                    </section>
                ))}

                <section className="still-need-help">
                    <p>Can&apos;t find the answer you&apos;re looking for?</p>
                    <Link href="/contact" className="contact-us-button">Contact Us</Link>
                </section>
            </div>
        </main>
    );
}
