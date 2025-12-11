import React from 'react'

interface SeedtypeSelectProps {
    filterSeedType: string
    handleInlineFilterChange: (filterType: 'seedType' | 'category', value: string) => void
}

const SeedtypeSelect: React.FC<SeedtypeSelectProps> = ({
    filterSeedType,
    handleInlineFilterChange
}) => {
    return (
        <>
            <div className="inline-filter-group">
                <label htmlFor="inlineFilterType">Filter by Type:</label>
                <select
                    id="inlineFilterType"
                    className="inline-select"
                    value={filterSeedType}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        // Gọi handleInlineFilterChange với value mới (nó sẽ tự setState bên trong)
                        handleInlineFilterChange('seedType', newValue);
                    }}
                >
                    <option value="all">All Types</option>
                    <option value="Feminized">Feminized</option>
                    <option value="Autoflower">Autoflower</option>
                    <option value="Regular">Regular</option>
                </select>
            </div>
        </>
    )
}

export default SeedtypeSelect
