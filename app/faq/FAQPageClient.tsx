'use client';

import { BeatLoaderSpinner } from '@/components/custom/loading';
import { useFaqContent } from '@/hooks/content';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBullhorn,
  faChevronDown,
  faComments,
  faLeaf,
  faShoppingCart,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { useState } from 'react';

// Icon mapping from string names to FontAwesome icons
const iconMap: Record<string, IconDefinition> = {
  faLeaf,
  faShoppingCart,
  faComments,
  faStar,
  faBullhorn,
};

interface AccordionItemData {
  question: string;
  answer: string | React.ReactNode;
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

export default function FAQPageClient() {
  const { data: content, isLoading, error } = useFaqContent();

  // Loading state
  if (isLoading) {
    return (
      <main className="faq-page-main">
        <section className="faq-hero">
          <div className='inset-0 fixed top-0 left-0 bg-(--bg-main) z-50 flex items-center justify-center'>
            <BeatLoaderSpinner />
          </div>
        </section>
      </main>
    );
  }

  // Error or no content - render default
  if (error || !content) {
    return (
      <main className="faq-page-main">
        <section className="faq-hero">
          <h1>Frequently Asked Questions</h1>
          <p className="subtext">Find answers to the most common questions about our services.</p>
        </section>
        <div className="faq-content-wrapper">
          <section className="still-need-help">
            <p>Can&apos;t find the answer you&apos;re looking for?</p>
            <Link href="/contact" className="contact-us-button">
              Contact Us
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const { settings, categories } = content;

  return (
    <main className="faq-page-main">
      <section className="faq-hero">
        <h1>{settings.title}</h1>
        <p className="subtext">{settings.description}</p>
      </section>

      <div className="faq-content-wrapper">
        {categories
          .filter((category) => category.isVisible)
          .map((section) => {
            const icon = iconMap[section.icon] || faLeaf;
            const visibleItems = section.items.filter((item) => item.isVisible);

            // Don't render category if no visible items
            if (visibleItems.length === 0) return null;

            return (
              <section key={section.id} className="faq-section" id={section.id}>
                <h2 className="faq-section-title">
                  <FontAwesomeIcon icon={icon} className='mr-[9px]'/> {section.name}
                </h2>
                <div className="accordion">
                  {visibleItems.map((item, index) => (
                    <AccordionItem key={item.id || index} question={item.question} answer={item.answer} />
                  ))}
                </div>
              </section>
            );
          })}

        <section className="still-need-help">
          <p>{settings.noAnswerMessage}</p>
          <Link href={settings.contactHref} className="contact-us-button">
            {settings.contactLabel}
          </Link>
        </section>
      </div>
    </main>
  );
}
