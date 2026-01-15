'use client';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faHeart, faSearchDollar, faShieldAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'




interface FeaturesSectionProps {
    title: string;
    description: string;
    features: {
        icon: IconProp;
        title: string;
        description: string;
    }[];
}
const FeaturesSection = ({ title, description, features }: FeaturesSectionProps) => {
    return (
        <section className="features" id="features">
            <div className="section-title">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            <div className="features-grid">
                {
                    features.map((feature, index) => (
                        <div 
                        key={index}
                        className="feature-card">
                            <div className="feature-icon">
                                <FontAwesomeIcon icon={feature.icon} />
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))
                }
                {/* <div className="feature-card">
                    <div className="feature-icon">
                        <FontAwesomeIcon icon={faShieldAlt} />
                    </div>
                    <h3>Trusted Sources</h3>
                    <p>We link only to trusted seed banks, so you can shop with confidence.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">
                        <FontAwesomeIcon icon={faHeart} />
                    </div>
                    <h3>Save Favorites</h3>
                    <p>Create an account to save your favorite seeds and get notified when prices drop.</p>
                </div> */}
            </div>
        </section>
    )
}

export default FeaturesSection
