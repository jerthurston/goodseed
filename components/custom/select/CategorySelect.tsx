import React from 'react'

interface CategorySelectProps {
    filterCategory: string
    setFilterCategory: (category: string) => void
    handleInlineFilterChange: () => void
}

const CategorySelect: React.FC<CategorySelectProps> = ({
    filterCategory,
    setFilterCategory,
    handleInlineFilterChange
}) => {
    return (
        <>
            <div className="inline-filter-group">
                <label htmlFor="inlineFilterCategory">Filter by Category:</label>
                <select
                    id="inlineFilterCategory"
                    className="inline-select"
                    value={filterCategory}
                    onChange={(e) => {
                        setFilterCategory(e.target.value)
                        handleInlineFilterChange()
                    }}
                >
                    <option value="all">All Categories</option>
                    <option value="Sativa">Sativa</option>
                    <option value="Indica">Indica</option>
                    <option value="Hybrid">Hybrid</option>
                </select>
            </div>
        </>
    )
}

export default CategorySelect
