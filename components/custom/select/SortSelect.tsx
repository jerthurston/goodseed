import { SortBy } from '@/types/seed.type'
import React from 'react'

interface SortSelectProps {
    sortBy: SortBy
    onSortChange: (sortBy: SortBy) => void
}

const SortSelect: React.FC<SortSelectProps> = ({
    sortBy,
    onSortChange
}) => {
    return (
        <>
            <div className="inline-filter-group">
                <label htmlFor="inlineSortBy">Sort by:</label>
                <select
                    id="inlineSortBy"
                    className="inline-select"
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as SortBy)}
                >
                    <option value="popularity">Popularity</option>
                    <option value="priceHighToLow">Price: High to Low</option>
                    <option value="priceLowToHigh">Price: Low to High</option>
                    <option value="newest">Newest</option>
                </select>
            </div>
        </>
    )
}

export default SortSelect
