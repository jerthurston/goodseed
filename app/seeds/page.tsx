import { FilterSection } from "@/components/custom/filter-section"
import { ProductListing } from "@/components/custom/product-listing"
import { SearchSection } from "@/components/custom/search-section"

export default function SeedsPage() {
    return (
        <div className="min-h-screen">
            <SearchSection />
            <FilterSection />

            <main>
                <ProductListing />
            </main>

        </div>
    )
}
