import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="border-b-2 border-[#2d2d2d] bg-[#e8dfc8]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold">
            <span className="text-[#2f5233]">GOOD</span>
            <span className="text-[#38a169]">SEED</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/about" className="text-[#2d2d2d] hover:text-[#38a169]">
            About
          </Link>
          <Link href="/seeds" className="text-[#2d2d2d] hover:text-[#38a169]">
            Browse
          </Link>
          <Link href="/wishlist" className="text-[#2d2d2d] hover:text-[#38a169]">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/dashboard/user">
            <Button className="bg-[#d4a11e] text-[#2d2d2d] hover:bg-[#c09219] border-2 border-[#2d2d2d] font-medium px-6">
              Sign In
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
