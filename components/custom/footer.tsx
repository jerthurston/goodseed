import { Facebook, Twitter, Instagram, Send } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#3d5647] text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-2xl font-bold mb-4">GOODSEED</h3>
            <p className="text-sm text-gray-300">Connecting you to trusted seed vendors since 2023.</p>
          </div>

          {/* Navigate Section */}
          <div>
            <h4 className="text-white font-semibold mb-4">NAVIGATE</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-[#e8d481] hover:underline">
                  Home
                </a>
              </li>
              <li>
                <a href="/about" className="text-[#e8d481] hover:underline">
                  About
                </a>
              </li>
              <li>
                <a href="/browse" className="text-[#e8d481] hover:underline">
                  Browse
                </a>
              </li>
              <li>
                <a href="/favorites" className="text-[#e8d481] hover:underline">
                  Favorites
                </a>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h4 className="text-white font-semibold mb-4">SUPPORT</h4>
            <ul className="space-y-2">
              <li>
                <a href="/contact" className="text-[#e8d481] hover:underline">
                  Contact
                </a>
              </li>
              <li>
                <a href="/faqs" className="text-[#e8d481] hover:underline">
                  FAQs
                </a>
              </li>
              <li>
                <a href="/partners" className="text-[#e8d481] hover:underline">
                  Partners
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-[#e8d481] hover:underline">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-[#e8d481] hover:underline">
                  Terms
                </a>
              </li>
            </ul>
          </div>

          {/* Stay Connected Section */}
          <div>
            <h4 className="text-white font-semibold mb-4">STAY CONNECTED</h4>
            <div className="flex gap-4 mb-4">
              <a href="#" className="text-[#e8d481] hover:opacity-80" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#e8d481] hover:opacity-80" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#e8d481] hover:opacity-80" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-2">Subscribe to our newsletter:</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none"
                />
                <button
                  className="bg-[#e8d481] text-gray-900 px-4 py-2 hover:bg-[#d4c06f] transition-colors"
                  aria-label="Subscribe"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-600 pt-6">
          <p className="text-center text-sm text-gray-300">© 2025 goodseed. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
