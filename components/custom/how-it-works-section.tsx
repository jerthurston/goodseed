const steps = [
  {
    number: "1",
    title: "Search",
    description: "Find the exact seeds you're looking for with our powerful search tools and filters.",
  },
  {
    number: "2",
    title: "Compare",
    description: "Compare prices from trusted vendors side by side to help you find the best deal.",
  },
  {
    number: "3",
    title: "Grow",
    description: "Purchase with confidence and start your perfect grow today.",
  },
]

export function HowItWorksSection() {
  return (
    <section className="bg-[#38a169] py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-white text-center mb-4">HOW IT WORKS</h2>
        <p className="text-center text-white text-sm mb-12">
          Getting the perfect seeds for your next grow has never been easier
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="bg-[#3d4f3e] border-2 border-white p-8 text-center">
              <div className="inline-block bg-[#d4a11e] border-2 border-white px-4 py-2 mb-4">
                <span className="text-2xl font-bold text-[#2d2d2d]">{step.number}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-white text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
