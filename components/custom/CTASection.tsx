'use client';
import Link from 'next/link'

interface CTASectionProps{
    title: string;
    description: string;
    ctaLabel:string;
    ctaHref:string;
}
const CTASection = ({
    title,
    description,
    ctaLabel,
    ctaHref
}:CTASectionProps) => {
    return (
        <section className="cta-section">
            <div className="section-title">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            <Link href={ctaHref} className="cta-button">
                {ctaLabel}
            </Link>
        </section>
    )
}

export default CTASection
