import React from 'react'

interface SeedtypeSelectProps {
    filterType: string
    setFilterType: (type: string) => void
    handleInlineFilterChange: () => void
}

const SeedtypeSelect: React.FC<SeedtypeSelectProps> = ({
    filterType,
    setFilterType,
    handleInlineFilterChange
}) => {
    return (
        <>
            <div className="inline-filter-group">
                <label htmlFor="inlineFilterType">Filter by Type:</label>
                <select
                    id="inlineFilterType"
                    className="inline-select"
                    value={filterType}
                    onChange={(e) => {
                        setFilterType(e.target.value)
                        handleInlineFilterChange()
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
