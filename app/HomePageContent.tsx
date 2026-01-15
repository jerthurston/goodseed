'use client';

import { useHomepageContent } from '@/hooks/content';
import CTASection from "@/components/custom/CTASection";
import FeaturesSection from "@/components/custom/FeaturesSection";
import HeroSection from "@/components/custom/HeroSection";
import HowItWorkSection from "@/components/custom/HowItWorkSection";
import { 
  faSearchDollar, 
  faShieldAlt, 
  faHeart 
} from "@fortawesome/free-solid-svg-icons";

// Icon mapping from string to FontAwesome icon
const iconMap: Record<string, any> = {
  faSearchDollar,
  faShieldAlt,
  faHeart,
};

export default function HomePageContent() {
  const { data: content, isLoading, error } = useHomepageContent();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state - fallback to default content
  if (error || !content) {
    console.error('Failed to load homepage content:', error);
    // Fallback to default content if API fails
    return (
      <div className="min-h-screen">
        <HeroSection 
          title="Find the best cannabis seeds at the best price"
          description="Search top seed banks, compare strains, and find the best prices."
        />
        <FeaturesSection 
          title="Why Choose goodseed"
          description="We make it easy to find and compare plant seeds from multiple trusted sources"
          features={[
            { icon: faSearchDollar, title: "Compare Prices", description: "See prices from sellers side by side to find the best deals on the seeds you want." },
            { icon: faShieldAlt, title: "Trusted Sources", description: "We link only to trusted seed banks, so you can shop with confidence." },
            { icon: faHeart, title: "Save Favorites", description: "Create an account to save your favorite seeds and get notified when prices drop." },
          ]}
        />
        <HowItWorkSection 
          title="How It Works"
          description="Getting the perfect seeds for your next grow has never been easier"
          steps={[
            { title: "Search", description: "Find the exact seeds you're looking for with our powerful search tools and filters." },
            { title: "Compare", description: "Compare prices from trusted vendors side by side to help you find the best deal." },
            { title: "Grow", description: "Purchase with confidence and start your perfect grow today." },
          ]}
        />
        <CTASection 
          title="Ready to Start Your next grow?"
          description="Join thousands of happy growers who found their perfect seeds with goodseed"
          ctaLabel="Browse Seeds Now"
          ctaHref="/seeds"
        />
      </div>
    );
  }

  // Map icon strings to FontAwesome icons
  const featuresWithIcons = content.features.features.map(feature => ({
    ...feature,
    icon: iconMap[feature.icon] || faSearchDollar, // Fallback to faSearchDollar if icon not found
  }));

  return (
    <div className="min-h-screen">
      <HeroSection {...content.hero} />
      <FeaturesSection 
        title={content.features.title}
        description={content.features.description}
        features={featuresWithIcons}
      />
      <HowItWorkSection {...content.howItWorks} />
      <CTASection {...content.cta} />
    </div>
  );
}
