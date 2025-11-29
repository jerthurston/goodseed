import { Search, Shield, Heart } from "lucide-react"

const features = [
  {
    icon: Search,
    title: "Compare Prices",
    description: "Use prices from sellers side by side so you find the best deals on the seeds you want.",
  },
  {
    icon: Shield,
    title: "Trusted Sources",
    description: "We link only to trusted seed banks, so you can shop with confidence.",
  },
  {
    icon: Heart,
    title: "Save Favorites",
    description: "Create an account to save your favorite seeds and get notified when prices drop.",
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-[#d9d4c3] py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-[#38a169] text-center mb-4">WHY CHOOSE GOODSEED</h2>
        <p className="text-center text-[#2d2d2d] text-sm mb-12">
          We make it easy to find and compare plant seeds from multiple trusted sources.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="bg-[#e8dfc8] border-2 border-[#2d2d2d] p-8 text-center">
              <div className="flex justify-center mb-4">
                <feature.icon className="h-12 w-12 text-[#38a169]" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-[#38a169] mb-3">{feature.title}</h3>
              <p className="text-[#2d2d2d] text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
