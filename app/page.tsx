import { CTASection } from "@/components/custom/cta-section"
import { FeaturesSection } from "@/components/custom/features-section"
import { HeroSection } from "@/components/custom/hero-section"
import { HowItWorksSection } from "@/components/custom/how-it-works-section"

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
    </div>
  )
}
