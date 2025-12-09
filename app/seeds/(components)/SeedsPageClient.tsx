'use client'

import CardGridContainer from '@/components/custom/card/SeedCardGridContainer'
import FilterModal from '@/components/custom/modals/FilterModal'
import CategorySelect from '@/components/custom/select/CategorySelect'
import SeedtypeSelect from '@/components/custom/select/SeedtypeSelect'
import SortSelect from '@/components/custom/select/SortSelect'
import { useSeeds } from '@/hooks/seed/useSeeds'
import { faChevronDown, faSearch, faSlidersH } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter, useSearchParams } from 'next/navigation'

import { useDebounce } from '@/hooks/useDebounce'
import { SeedFilter } from '@/types/seed.type'
import { useEffect, useRef, useState } from 'react'

const SeedsPageClient = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    //--> State management Hook for page
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isInlineFiltersOpen, setIsInlineFiltersOpen] = useState(false)
    // Inline filters state
    const [filterType, setFilterType] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')
    const [sortBy, setSortBy] = useState('popularity')

    const isSyncingRef = useRef(false);  // Ref để track nếu đang sync (không gây re-render)

    // --> search processing with useDebounce
    const debouncedSearchQuery = useDebounce(searchQuery, 500)

    // --> Custom hook to fetch seeds data
    const {
        seeds,
        pagination,
        isLoading,
        isFetching,
        isError,
        error
    } = useSeeds({
        searchKeyword: debouncedSearchQuery,
        filters: {
            priceRange: {
                min: Number(searchParams.get('minPrice')) || 0,
                max: Number(searchParams.get('maxPrice')) || 999,
            },
            thcRange: {
                min: Number(searchParams.get('minTHC')) || 0,
                max: Number(searchParams.get('maxTHC')) || 100,
            },
            cbdRange: {
                min: Number(searchParams.get('minCBD')) || 0,
                max: Number(searchParams.get('maxCBD')) || 100,
            },
            seedTypes: searchParams.get('seedTypes')?.split(',').filter(Boolean) || [],
            cannabisTypes: searchParams.get('cannabisTypes')?.split(',').filter(Boolean) || [],
        },
        sortBy: sortBy as 'price' | 'popularity',
        sortOrder: 'asc',
        page: Number(searchParams.get('page')) || 1,
        limit: 20,
    });

    // --> Log data for debugging (remove after UI integration)
    useEffect(() => {
        console.log('🎨 [SeedsPageClient] Data from useSeeds:', {
            seedsCount: seeds.length,
            pagination,
            isLoading,
            isFetching,
            isError,
            error: error?.message,
            sampleSeeds: seeds.slice(0, 2), // Log first 2 seeds
        });
    }, [seeds, pagination, isLoading, isFetching, isError, error]);

    // BEST PRACTICE: useEffect to handle side effects
    // Auto-trigger search when debounced value changes (use replace to avoid polluting history)

    useEffect(() => {
        const currentSearch = searchParams.get('search') || '';  // Default ''

        if (isSyncingRef.current) {
            // Skip nếu đang sync từ lần trước (tránh loop)
            isSyncingRef.current = false;
            return;
        }

        if (debouncedSearchQuery.trim() && debouncedSearchQuery !== currentSearch) {
            isSyncingRef.current = true;  // Set flag trước replace
            router.replace(`/seeds?search=${encodeURIComponent(debouncedSearchQuery)}`);
        } else if (!debouncedSearchQuery.trim() && currentSearch) {
            isSyncingRef.current = true;
            router.replace('/seeds');
        }
    }, [debouncedSearchQuery, router, searchParams]);  // Dependencies đầy đủ → ESLint OK  
    // --> Function handle search form submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // Push to history when user explicitly clicks search button
        if (searchQuery.trim()) {
            router.push(`/seeds?search=${encodeURIComponent(searchQuery)}`)
        } else {
            router.push('/seeds')
        }
    }

    // --> Function open or close filter modal
    const handleOpenFilter = () => {
        setIsFilterModalOpen(true)
    }
    //  --> Function add params filter into url when user apply filter params in the modal
    const handleApplyFilters = (filters: SeedFilter) => {
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
    // --> Function to toggle inline filters display: expand or minimize refine result button on mobile
    const toggleInlineFilters = () => {
        setIsInlineFiltersOpen(!isInlineFiltersOpen)
    }

    // --> Handle page change for pagination
    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`/seeds?${params.toString()}`);
    }

    // --> Function to handle inline filter changes
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
            <CardGridContainer
                seeds={seeds}
                pagination={pagination}
                isLoading={isLoading}
                isError={isError}
                onPageChange={handlePageChange}
            />

            {/* --> Display filter modal when user click into the filter button */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApplyFilters={handleApplyFilters}
            />
        </>
    )
}

export default SeedsPageClient
