import CTASection from "@/components/custom/CTASection";
import FeaturesSection from "@/components/custom/FeaturesSection";
import HeroSection from "@/components/custom/HeroSection";
import HowItWorkSection from "@/components/custom/HowItWorkSection";


export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorkSection />
      <CTASection />
    </div>
  )
}
