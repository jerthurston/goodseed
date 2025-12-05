'use client'

import FilterModal, { FilterState } from '@/components/custom/modals/FilterModal'
import { faSearch, faSlidersH } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const SearchBtnForResultPage = () => {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/seeds?search=${encodeURIComponent(searchQuery)}`)
        }
    }

    const handleOpenFilter = () => {
        setIsFilterModalOpen(true)
    }

    const handleApplyFilters = (filters: FilterState) => {
        console.log('Applied filters:', filters)
        const params = new URLSearchParams()

        if (searchQuery.trim()) params.append('search', searchQuery)
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
            <section className="search-controls-section">
                <div className="search-controls-container">
                    <div className="hero-search-container">
                        <form className="hero-search" onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search for seeds..."
                                id="mainSearchInput"
                                autoComplete="off"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="hero-search-actions">
                                <button
                                    type="submit"
                                    id="mainSearchButtonIcon"
                                    aria-label="Search"
                                >
                                    <span className="search-btn-text">Search</span>
                                    <FontAwesomeIcon icon={faSearch} className="search-btn-icon" />
                                </button>
                                <button
                                    type="button"
                                    className="advanced-filter-btn"
                                    id="openFilter"
                                    onClick={handleOpenFilter}
                                >
                                    <FontAwesomeIcon icon={faSlidersH} />
                                    <span className="filter-btn-text">Filters</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilters={handleApplyFilters}
            />
        </>
    )
}

export default SearchBtnForResultPage
