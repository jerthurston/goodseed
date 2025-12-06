import Link from 'next/link'

const CTASection = () => {
    return (
        <section className="cta-section">
            <div className="section-title">
                <h2>Ready to Start Your next grow?</h2>
                <p>Join thousands of happy growers who found their perfect seeds with goodseed</p>
            </div>
            <Link href="/seeds" className="cta-button">
                Browse Seeds Now
            </Link>
        </section>
    )
}

export default CTASection
