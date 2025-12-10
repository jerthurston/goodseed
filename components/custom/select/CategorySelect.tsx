import React from 'react'

interface CategorySelectProps {
    filterCategory: string
    handleInlineFilterChange: (filterType: 'seedType' | 'category', value: string) => void
}

const CategorySelect: React.FC<CategorySelectProps> = ({
    filterCategory,
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
                        const newValue = e.target.value;
                        // Gọi handleInlineFilterChange với value mới (nó sẽ tự setState bên trong)
                        handleInlineFilterChange('category', newValue);
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
