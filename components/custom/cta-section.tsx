import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="bg-[#d9d4c3] py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-[#38a169] mb-4">READY TO START YOUR NEXT GROW?</h2>
        <p className="text-[#2d2d2d] mb-8">
          Join thousands of happy growers who found their perfect seeds with goodseed
        </p>
        <Link href="/seeds">
          <Button className="bg-[#d4a11e] hover:bg-[#c09219] text-[#2d2d2d] border-2 border-[#2d2d2d] px-8 py-3 text-lg font-medium">
            Browse Seeds Now
          </Button>
        </Link>
      </div>
    </section>
  )
}
