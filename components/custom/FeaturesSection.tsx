import { faHeart, faSearchDollar, faShieldAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const FeaturesSection = () => {
    return (
        <section className="features" id="features">
            <div className="section-title">
                <h2>Why Choose goodseed</h2>
                <p>We make it easy to find and compare plant seeds from multiple trusted sources</p>
            </div>
            <div className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon">
                        <FontAwesomeIcon icon={faSearchDollar} />
                    </div>
                    <h3>Compare Prices</h3>
                    <p>See prices from sellers side by side to find the best deals on the seeds you want.</p>
                </div>
                <div className="feature-card">
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
                </div>
            </div>
        </section>
    )
}

export default FeaturesSection
