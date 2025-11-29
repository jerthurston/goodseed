import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="bg-[#e8dfc8] border-b-2 border-[#2d2d2d] py-16">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-[#38a169] mb-8 leading-tight">
          FIND THE BEST
          <br />
          CANNABIS SEEDS AT
          <br />
          THE BEST PRICE
        </h1>

        <div className="max-w-2xl mx-auto mb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search for seeds..."
                className="w-full px-4 py-3 border-2 border-[#2d2d2d] bg-white text-[#2d2d2d] placeholder:text-gray-500"
              />
            </div>
            <Button className="bg-[#38a169] hover:bg-[#2f5233] text-white border-2 border-[#2d2d2d] px-8 font-medium">
              Search
            </Button>
          </div>
          <div className="mt-2 flex justify-start">
            <Button className="bg-[#d4a11e] hover:bg-[#c09219] text-[#2d2d2d] border-2 border-[#2d2d2d] px-6 py-2 text-sm font-medium">
              Filters
            </Button>
          </div>
        </div>

        <p className="text-[#2d2d2d] text-sm">Search top seed banks, compare strains, and find the best prices.</p>
      </div>
    </section>
  )
}
