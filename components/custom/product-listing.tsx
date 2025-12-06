import type { CannabisType, SeedType, StockStatus } from "@prisma/client"
import { ProductCard } from "./product-card"

type ProductData = {
  id: string
  name: string
  url: string
  slug: string
  basePrice: number
  packSize: number
  pricePerSeed: number
  stockStatus: StockStatus
  cannabisType: CannabisType | null
  seedType: SeedType | null
  variety: string | null
  thcMin: number | null
  thcMax: number | null
  thcText: string | null
  cbdMin: number | null
  cbdMax: number | null
  cbdText: string | null
  category: {
    name: string
    seller: {
      name: string
    }
  }
  productImages: Array<{
    image: {
      url: string
      alt: string | null
    }
  }>
}

interface ProductListingProps {
  products: ProductData[]
}

function getBadgeColor(seedType: SeedType | null): "feminized" | "autoflower" | "regular" {
  if (seedType === "FEMINIZED") return "feminized"
  if (seedType === "AUTOFLOWER") return "autoflower"
  return "regular"
}

function formatTHC(thcText: string | null, thcMin: number | null, thcMax: number | null): string {
  if (thcText) return thcText
  if (thcMin !== null && thcMax !== null) return `THC ${thcMin}-${thcMax}%`
  if (thcMin !== null) return `THC ${thcMin}%+`
  return "THC N/A"
}

function formatCBD(cbdText: string | null, cbdMin: number | null, cbdMax: number | null): string {
  if (cbdText) return cbdText
  if (cbdMin !== null && cbdMax !== null) return `CBD ${cbdMin}-${cbdMax}%`
  if (cbdMin !== null) return `CBD ${cbdMin}%+`
  return "CBD N/A"
}

export function ProductListing({ products }: ProductListingProps) {
  return (
    <section className="py-12 px-4 border-t-2 border-foreground">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-primary mb-2">OUR SEED COLLECTION</h2>
          <p className="text-muted-foreground">
            Browse our premium selection of high-quality seeds from trusted vendors
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              badge={product.seedType || "N/A"}
              badgeColor={getBadgeColor(product.seedType)}
              productName={product.name}
              price={`$${product.pricePerSeed.toFixed(2)}/seed`}
              company={product.category.seller.name}
              strain={product.variety || product.cannabisType || "N/A"}
              thc={formatTHC(product.thcText, product.thcMin, product.thcMax)}
              cbd={formatCBD(product.cbdText, product.cbdMin, product.cbdMax)}
              imageUrl={product.productImages[0]?.image.url}
              productUrl={product.url}
            />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2">
          <button className="w-10 h-10 border-2 border-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center">
            <span className="text-foreground">&lt;</span>
          </button>
          <button className="w-10 h-10 border-2 border-foreground bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            1
          </button>
          <button className="w-10 h-10 border-2 border-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center font-semibold">
            2
          </button>
          <button className="w-10 h-10 border-2 border-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center font-semibold">
            3
          </button>
          <button className="w-10 h-10 border-2 border-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center font-semibold">
            4
          </button>
          <button className="w-10 h-10 border-2 border-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center">
            <span className="text-foreground">&gt;</span>
          </button>
        </div>
      </div>
    </section>
  )
}
