'use client'
import FilterModal from "@/components/custom/modals/FilterModal"
import { SeedFilter } from "@/types/seed.type"
import { useRouter } from "next/navigation"
import { useState } from "react"

const FilterBtnForHomepage = () => {
    const router = useRouter()
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const handleOpenFilter = () => {
        setIsFilterModalOpen(true)
    }
    const handleApplyFilters = (filters: SeedFilter) => {
        // TODO: Implement filter logic - navigate to seeds page with filter params
        console.log('Applied filters:', filters)
        const params = new URLSearchParams()

        if (filters.priceRange.min > 0) params.append('minPrice', filters.priceRange.min.toString())
        if (filters.priceRange.max < 100) params.append('maxPrice', filters.priceRange.max.toString())
        if (filters.seedTypes.length > 0) params.append('seedTypes', filters.seedTypes.join(','))
        if (filters.cannabisTypes.length > 0) params.append('cannabisTypes', filters.cannabisTypes.join(','))
        if (filters.thcRange.min > 0) params.append('minTHC', filters.thcRange.min.toString())
        if (filters.thcRange.max < 40) params.append('maxTHC', filters.thcRange.max.toString())
        if (filters.cbdRange.min > 0) params.append('minCBD', filters.cbdRange.min.toString())
        if (filters.cbdRange.max < 25) params.append('maxCBD', filters.cbdRange.max.toString())

        router.push(`/seeds?${params.toString()}`)
    }
    return (
        <>
            <button
                className="filter-btn"
                id="openFilter"
                onClick={handleOpenFilter}
                type="button"
            >
                Filters
            </button>

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilters={handleApplyFilters}
            />
        </>
    )
}

export default FilterBtnForHomepage
