import { FilterSection } from "@/components/custom/filter-section"
import { ProductListing } from "@/components/custom/product-listing"
import { SearchSection } from "@/components/custom/search-section"
import { prisma } from "@/lib/prisma"

export default async function SeedsPage() {
    // Fetch products from database
    const products = await prisma.seedProduct.findMany({
        include: {
            category: {
                select: {
                    name: true,
                    seller: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
            productImages: {
                include: {
                    image: true,
                },
                orderBy: {
                    order: 'asc',
                },
                take: 1,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 50, // Limit to 50 products for initial load
    })

    console.log('📦 Products fetched:', products.length)
    console.log('📊 Sample product:', JSON.stringify(products[0], null, 2))

    return (
        <div className="min-h-screen">
            <SearchSection />
            <FilterSection />
            <main>
                <ProductListing products={products} />
            </main>

        </div>
    )
}
