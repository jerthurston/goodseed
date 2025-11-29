import { ProductCard } from "./product-card"

const products = [
  {
    badge: "FEMINIZED",
    badgeColor: "feminized" as const,
    productName: "Blue Dream",
    price: "$4.99/seed",
    company: "GoodSeed Co",
    strain: "Sativa",
    thc: "THC 18%",
    cbd: "CBD 1%",
  },
  {
    badge: "FEMINIZED",
    badgeColor: "feminized" as const,
    productName: "Girl Scout Cookies",
    price: "$6.99/seed",
    company: "Royal Queen Seeds",
    strain: "Hybrid",
    thc: "THC 26%",
    cbd: "CBD 1%",
  },
  {
    badge: "FEMINIZED",
    badgeColor: "feminized" as const,
    productName: "Gorilla Glue #4",
    price: "$7.99/seed",
    company: "Barney Seeds",
    strain: "Hybrid",
    thc: "THC 28%",
    cbd: "CBD 0.8%",
  },
  {
    badge: "AUTOFLOWER",
    badgeColor: "autoflower" as const,
    productName: "Northern Lights",
    price: "$5.99/seed",
    company: "Sensitech",
    strain: "Indica",
    thc: "THC 20%",
    cbd: "CBD 3%",
  },
  {
    badge: "AUTOFLOWER",
    badgeColor: "autoflower" as const,
    productName: "White Widow",
    price: "$5.49/seed",
    company: "MSNL",
    strain: "Hybrid",
    thc: "THC 16%",
    cbd: "CBD 5%",
  },
  {
    badge: "AUTOFLOWER",
    badgeColor: "autoflower" as const,
    productName: "Amnesia Haze",
    price: "$6.49/seed",
    company: "SeedSmart",
    strain: "Sativa",
    thc: "THC 21%",
    cbd: "CBD 1.5%",
  },
  {
    badge: "REGULAR",
    badgeColor: "regular" as const,
    productName: "Sour Diesel",
    price: "$3.99/seed",
    company: "I.GM",
    strain: "Sativa",
    thc: "THC 22%",
    cbd: "CBD 0.5%",
  },
  {
    badge: "REGULAR",
    badgeColor: "regular" as const,
    productName: "AK-47",
    price: "$4.49/seed",
    company: "Nature Seeds",
    strain: "Hybrid",
    thc: "THC 19%",
    cbd: "CBD 1%",
  },
]

export function ProductListing() {
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
          {products.map((product, index) => (
            <ProductCard key={index} {...product} />
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
