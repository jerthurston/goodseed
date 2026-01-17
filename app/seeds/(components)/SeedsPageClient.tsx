'use client';
import CardGridContainer from '@/components/custom/card/SeedCardGridContainer'
import FilterModal from '@/components/custom/modals/FilterModal'
import CategorySelect from '@/components/custom/select/CategorySelect'
import SeedtypeSelect from '@/components/custom/select/SeedtypeSelect'
import SortSelect from '@/components/custom/select/SortSelect'
import { useFetchSeeds } from '@/hooks/seed/useSeeds'
import { faChevronDown, faSearch, faSlidersH } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter, useSearchParams } from 'next/navigation'

import { apiLogger } from '@/lib/helpers/api-logger'
import { SeedFilter, SortBy } from '@/types/seed.type'
import { useEffect, useState } from 'react'
import { ClockLoaderSpinner } from '@/components/custom/loading';

const SeedsPageClient = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    //--> State management Hook for page
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isInlineFiltersOpen, setIsInlineFiltersOpen] = useState(false)

    // Inline filters state - sync với URL ngay từ đầu
    const urlSeedTypes = searchParams.get('seedTypes')?.split(',').filter(Boolean) || [];
    const urlCannabisTypes = searchParams.get('cannabisTypes')?.split(',').filter(Boolean) || [];

    const [filterSeedType, setFilterSeedType] = useState(
        urlSeedTypes.length === 1 ? urlSeedTypes[0] : 'all'
    )
    const [filterCategory, setFilterCategory] = useState(
        urlCannabisTypes.length === 1 ? urlCannabisTypes[0] : 'all'
    )
    const [sortBy, setSortBy] = useState((searchParams.get('sortBy') || 'popularity') as SortBy)

    // --> Sử dụng search keyword từ URL thay vì từ state local
    const activeSearchKeyword = searchParams.get('search') || ''

    // --> Custom hook to fetch seeds data
    const {
        seeds,
        pagination,
        isLoading,
        isFetching,
        isError,
        error
    } = useFetchSeeds({
        searchKeyword: activeSearchKeyword,
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
        sortBy: sortBy as 'popularity' | 'priceLowToHigh' | 'priceHighToLow' | 'newest',
        page: Number(searchParams.get('page')) || 1,
        limit: 20,
    });

    // --> Log data for debugging (remove after UI integration)
    // useEffect(() => {
    //    apiLogger.debug('🎨 [SeedsPageClient] Data from useSeeds:', {
    //         error: error?.message,
    //         sampleSeeds: seeds.slice(0, 2), // Log first 2 seeds
    //     });
    // }, [seeds, pagination, isLoading, isFetching, isError, error]);

    // --> Function handle search form submit
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams(searchParams.toString());

        if (searchQuery.trim()) {
            params.set('search', searchQuery);
        } else {
            params.delete('search');
        }
        params.set('page', '1'); // Reset to page 1 on new search

        router.push(`/seeds?${params.toString()}`);
    }

    // --> Function open or close filter modal
    const handleOpenFilter = () => {
        setIsFilterModalOpen(true)
    }
    //  --> Function add params filter into url when user apply filter params in the modal
    // Flow: User dùng modal filter → Reset inline selects → Áp dụng modal filters
    const handleApplyFilters = (filters: SeedFilter) => {
        apiLogger.debug('Applied filters from modal:', { filters })
        // Start with existing params to preserve sortBy and search
        const params = new URLSearchParams(searchParams.toString())
        // Remove all filter params first
        params.delete('minPrice')
        params.delete('maxPrice')
        params.delete('seedTypes')
        params.delete('cannabisTypes')
        params.delete('minTHC')
        params.delete('maxTHC')
        params.delete('minCBD')
        params.delete('maxCBD')
        // Only add filter params if they differ from default values
        // Price range (default: 0-100)
        if (filters.priceRange.min > 0) {
            params.set('minPrice', filters.priceRange.min.toString())
        }
        if (filters.priceRange.max < 100) {
            params.set('maxPrice', filters.priceRange.max.toString())
        }
        // Seed types (default: empty array)
        if (filters.seedTypes.length > 0) {
            params.set('seedTypes', filters.seedTypes.join(','))
        }
        // Cannabis types (default: empty array)
        if (filters.cannabisTypes.length > 0) {
            params.set('cannabisTypes', filters.cannabisTypes.join(','))
        }
        // THC range (default: 0-40)
        if (filters.thcRange.min > 0) {
            params.set('minTHC', filters.thcRange.min.toString())
        }
        if (filters.thcRange.max < 40) {
            params.set('maxTHC', filters.thcRange.max.toString())
        }
        // CBD range (default: 0-25)
        if (filters.cbdRange.min > 0) {
            params.set('minCBD', filters.cbdRange.min.toString())
        }
        if (filters.cbdRange.max < 25) {
            params.set('maxCBD', filters.cbdRange.max.toString())
        }
        // IMPORTANT: Reset inline select states về "all" khi dùng modal
        // (Chỉ reset nếu modal không có chọn seedTypes/cannabisTypes single value)
        if (filters.seedTypes.length !== 1) {
            setFilterSeedType('all');
        }
        if (filters.cannabisTypes.length !== 1) {
            setFilterCategory('all');
        }
        // Reset to page 1 when filters change
        params.set('page', '1')
        router.push(`/seeds?${params.toString()}`)
        apiLogger.debug('Modal filters applied (inline selects reset):', {
            filterSeedType: filters.seedTypes.length === 1 ? filters.seedTypes[0] : 'all',
            filterCategory: filters.cannabisTypes.length === 1 ? filters.cannabisTypes[0] : 'all'
        });
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
    // --> Function to handle sort change
    const handleSortChange = (newSortBy: SortBy) => {
        setSortBy(newSortBy);
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', newSortBy);
        params.set('page', '1'); // Reset to page 1 when sorting changes
        router.push(`/seeds?${params.toString()}`);
    }
    // --> Function to handle inline filter changes
    // Flow: User dùng select filter → Reset modal filters → Chỉ giữ lại seedType/category
    const handleInlineFilterChange = (filterType: 'seedType' | 'category', value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        // IMPORTANT: Reset tất cả modal filter params khi dùng inline select
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('minTHC');
        params.delete('maxTHC');
        params.delete('minCBD');
        params.delete('maxCBD');

        if (filterType === 'seedType') {
            // Cập nhật seedTypes param
            if (value === 'all') {
                // Remove seedTypes filter
                params.delete('seedTypes');
            } else {
                // Set single seedType
                params.set('seedTypes', value);
            }
            // Update local state
            setFilterSeedType(value);
        } else if (filterType === 'category') {
            // Cập nhật cannabisTypes param
            if (value === 'all') {
                // Remove cannabisTypes filter
                params.delete('cannabisTypes');
            } else {
                // Set single cannabisType
                params.set('cannabisTypes', value);
            }
            // Update local state
            setFilterCategory(value);
        }
        // Reset to page 1 when filter changes
        params.set('page', '1');
        // Update URL (use push for navigation history)
        router.push(`/seeds?${params.toString()}`);
        // Debug log
        apiLogger.debug('Inline filter changed (modal filters reset):', {
            filterType,
            value,
            newURL: params.toString()
        });
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
                                    style={{

                                    }}
                                >
                                    <div className='flex flex-row items-center gap-1'>
                                        <span className="search-btn-text font-extrabold">Search</span>
                                        <FontAwesomeIcon icon={faSearch} className="search-btn-icon" />
                                    </div>
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

            {/* -->Section quickly filter by seedType - cannabisType(category) - sortBy */}
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
                            {/* seedtype filter */}
                            <SeedtypeSelect
                                filterSeedType={filterSeedType}
                                handleInlineFilterChange={handleInlineFilterChange}
                            />
                            {/* category filter - CannabisType */}
                            <CategorySelect
                                filterCategory={filterCategory}
                                handleInlineFilterChange={handleInlineFilterChange}
                            />
                            {/* sort by filter */}
                            <SortSelect
                                sortBy={sortBy}
                                onSortChange={handleSortChange}
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
