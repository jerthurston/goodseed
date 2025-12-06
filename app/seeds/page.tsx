'use client'

import CardGridContainer from '@/components/custom/card/SeedCardGridContainer'
import FilterModal, { FilterState } from '@/components/custom/modals/FilterModal'
import CategorySelect from '@/components/custom/select/CategorySelect'
import SeedtypeSelect from '@/components/custom/select/SeedtypeSelect'
import SortSelect from '@/components/custom/select/SortSelect'
import { faChevronDown, faSearch, faSlidersH } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const SeedsPage = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isInlineFiltersOpen, setIsInlineFiltersOpen] = useState(false)

    // Inline filters state
    const [filterType, setFilterType] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')
    const [sortBy, setSortBy] = useState('popularity')

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

    const toggleInlineFilters = () => {
        setIsInlineFiltersOpen(!isInlineFiltersOpen)
    }

    const handleInlineFilterChange = () => {
        // TODO: Apply inline filters logic
        console.log('Inline filters:', { filterType, filterCategory, sortBy })
    }

    return (
        <>
            {/* --> Section search and filter more */}
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
                                    <span className="search-btn-text font-extrabold">Search</span>
                                    <FontAwesomeIcon icon={faSearch} className="search-btn-icon" />
                                </button>
                                <button
                                    type="button"
                                    className="advanced-filter-btn"
                                    id="openFilter"
                                    onClick={handleOpenFilter}
                                >
                                    <FontAwesomeIcon icon={faSlidersH} />
                                    <span className="filter-btn-text font-extrabold">Filters</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            {/* -->Section filter by and sort */}
            <section className="inline-refinement-section">
                <div className="inline-refinements__container">

                    {/* --> Refine Button display for mobile */}
                    <button
                        id="toggleInlineFiltersBtn"
                        aria-controls="collapsibleInlineFilters"
                        aria-expanded={isInlineFiltersOpen}
                        className="inline-refinements__toggle"
                        onClick={toggleInlineFilters}
                        type="button"
                    >
                        <span id="toggleInlineFiltersBtnLabel" className="inline-refinements__toggle-label">
                            Refine Results
                        </span>
                        <FontAwesomeIcon
                            icon={faChevronDown}
                            id="toggleInlineFiltersIcon"
                            aria-hidden="true"
                            style={{ transform: isInlineFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                        />
                    </button>

                    {/* --> Select Filter by type, category and sort */}
                    <div
                        id="collapsibleInlineFilters"
                        role="region"
                        aria-labelledby="toggleInlineFiltersBtnLabel"
                        className={`inline-refinements__collapsible ${isInlineFiltersOpen ? 'is-open' : ''}`}
                    >
                        <div className="inline-filters-grid">
                            <SeedtypeSelect
                                setFilterType={setFilterType}
                                filterType={filterType}
                                handleInlineFilterChange={handleInlineFilterChange}
                            />

                            <CategorySelect
                                setFilterCategory={setFilterCategory}
                                filterCategory={filterCategory}
                                handleInlineFilterChange={handleInlineFilterChange}
                            />

                            <SortSelect
                                handleInlineFilterChange={handleInlineFilterChange}
                                setSortBy={setSortBy}
                                sortBy={sortBy}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --> Main section -- Card Grid container */}
            <CardGridContainer />

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilters={handleApplyFilters}
            />
        </>
    )
}

export default SeedsPage
