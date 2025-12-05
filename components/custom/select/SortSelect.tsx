import React from 'react'

interface SortSelectProps {
    sortBy: string
    setSortBy: (sortBy: string) => void
    handleInlineFilterChange: () => void
}

const SortSelect: React.FC<SortSelectProps> = ({
    sortBy,
    setSortBy,
    handleInlineFilterChange
}) => {
    return (
        <>
            <div className="inline-filter-group">
                <label htmlFor="inlineSortBy">Sort by:</label>
                <select
                    id="inlineSortBy"
                    className="inline-select"
                    value={sortBy}
                    onChange={(e) => {
                        setSortBy(e.target.value)
                        handleInlineFilterChange()
                    }}
                >
                    <option value="popularity">Popularity</option>
                    <option value="priceLowToHigh">Price: Low to High</option>
                    <option value="priceHighToLow">Price: High to Low</option>
                    <option value="newest">Newest</option>
                </select>
            </div>
        </>
    )
}

export default SortSelect
