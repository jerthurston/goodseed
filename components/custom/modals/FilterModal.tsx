'use client'

import { SeedFilter } from "@/types/seed.type"
import React, { useState } from 'react'

interface FilterModalProps {
    isOpen: boolean
    onClose: () => void
    onApplyFilters: (filters: SeedFilter) => void
}

// export interface FilterState {
//     priceRange: { min: number; max: number }
//     seedTypes: string[]
//     cannabisTypes: string[]
//     thcRange: { min: number; max: number }
//     cbdRange: { min: number; max: number }
// }

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApplyFilters }) => {
    const [filters, setFilters] = useState<SeedFilter>({
        priceRange: { min: 0, max: 100 },
        seedTypes: [],
        cannabisTypes: [],
        thcRange: { min: 0, max: 40 },
        cbdRange: { min: 0, max: 25 },
    })

    const handlePriceChange = (type: 'min' | 'max', value: number) => {
        setFilters(prev => ({
            ...prev,
            priceRange: { ...prev.priceRange, [type]: value }
        }))
    }

    const handleSeedTypeChange = (type: string) => {
        setFilters(prev => ({
            ...prev,
            seedTypes: prev.seedTypes.includes(type)
                ? prev.seedTypes.filter(t => t !== type)
                : [...prev.seedTypes, type]
        }))
    }

    const handleCannabisTypeChange = (type: string) => {
        setFilters(prev => ({
            ...prev,
            cannabisTypes: prev.cannabisTypes.includes(type)
                ? prev.cannabisTypes.filter(t => t !== type)
                : [...prev.cannabisTypes, type]
        }))
    }

    const handleTHCChange = (type: 'min' | 'max', value: number) => {
        setFilters(prev => ({
            ...prev,
            thcRange: { ...prev.thcRange, [type]: value }
        }))
    }

    const handleCBDChange = (type: 'min' | 'max', value: number) => {
        setFilters(prev => ({
            ...prev,
            cbdRange: { ...prev.cbdRange, [type]: value }
        }))
    }

    const handleReset = () => {
        setFilters({
            priceRange: { min: 0, max: 100 },
            seedTypes: [],
            cannabisTypes: [],
            thcRange: { min: 0, max: 40 },
            cbdRange: { min: 0, max: 25 },
        })
    }

    const handleApply = () => {
        onApplyFilters(filters)
        onClose()
    }

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className={`filter-modal ${isOpen ? 'active' : ''}`}
            id="filterModal"
            onClick={handleOverlayClick}
        >
            <div className="filter-container">
                <button
                    className="filter-close"
                    onClick={onClose}
                    aria-label="Close filters"
                >
                    ×
                </button>
                <h2 className="filter-title">Filter Options</h2>

                {/* Price per Seed */}
                <div className="filter-section">
                    <h3 className="filter-section-title">Price per Seed</h3>
                    <div className="range-slider-container flex justify-center">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.priceRange.min}
                            step="1"
                            className="range-slider range-slider-min"
                            onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                        />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.priceRange.max}
                            step="1"
                            className="range-slider range-slider-max"
                            onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                        />
                    </div>
                    <div className="range-inputs">
                        <div className="range-input">
                            <label htmlFor="minPrice">Min:</label>
                            <input
                                type="number"
                                id="minPrice"
                                min="0"
                                max="100"
                                step="1"
                                value={filters.priceRange.min}
                                onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                            />
                        </div>
                        <div className="range-input">
                            <label htmlFor="maxPrice">Max:</label>
                            <input
                                type="number"
                                id="maxPrice"
                                min="0"
                                max="100"
                                step="1"
                                value={filters.priceRange.max}
                                onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                {/* Seed Type */}
                <div className="filter-section">
                    <h3 className="filter-section-title">Seed Type</h3>
                    <div className="filter-options">
                        <label className="filter-option">
                            <input
                                type="checkbox"
                                id="feminized"
                                name="seedType"
                                value="Feminized"
                                checked={filters.seedTypes.includes('Feminized')}
                                onChange={() => handleSeedTypeChange('Feminized')}
                            />
                            Feminized
                        </label>
                        <label className="filter-option">
                            <input
                                type="checkbox"
                                id="autoflower"
                                name="seedType"
                                value="Autoflower"
                                checked={filters.seedTypes.includes('Autoflower')}
                                onChange={() => handleSeedTypeChange('Autoflower')}
                            />
                            Autoflower
                        </label>
                        <label className="filter-option">
                            <input
                                type="checkbox"
                                id="regular"
                                name="seedType"
                                value="Regular"
                                checked={filters.seedTypes.includes('Regular')}
                                onChange={() => handleSeedTypeChange('Regular')}
                            />
                            Regular
                        </label>
                    </div>
                </div>

                {/* Cannabis Type */}
                <div className="filter-section">
                    <h3 className="filter-section-title">Cannabis Type</h3>
                    <div className="filter-options">
                        <label className="filter-option">
                            <input
                                type="checkbox"
                                id="sativa"
                                name="cannabisType"
                                value="Sativa"
                                checked={filters.cannabisTypes.includes('Sativa')}
                                onChange={() => handleCannabisTypeChange('Sativa')}
                            />
                            Sativa
                        </label>
                        <label className="filter-option">
                            <input
                                type="checkbox"
                                id="indica"
                                name="cannabisType"
                                value="Indica"
                                checked={filters.cannabisTypes.includes('Indica')}
                                onChange={() => handleCannabisTypeChange('Indica')}
                            />
                            Indica
                        </label>
                        <label className="filter-option">
                            <input
                                type="checkbox"
                                id="hybrid"
                                name="cannabisType"
                                value="Hybrid"
                                checked={filters.cannabisTypes.includes('Hybrid')}
                                onChange={() => handleCannabisTypeChange('Hybrid')}
                            />
                            Hybrid
                        </label>
                    </div>
                </div>

                {/* THC Range */}
                <div className="filter-section">
                    <h3 className="filter-section-title">THC Range</h3>
                    <div className="range-slider-container flex justify-center">
                        <input
                            type="range"
                            min="0"
                            max="40"
                            value={filters.thcRange.min}
                            step="0.5"
                            className="range-slider range-slider-min"
                            onChange={(e) => handleTHCChange('min', Number(e.target.value))}
                        />
                        <input
                            type="range"
                            min="0"
                            max="40"
                            value={filters.thcRange.max}
                            step="0.5"
                            className="range-slider range-slider-max"
                            onChange={(e) => handleTHCChange('max', Number(e.target.value))}
                        />
                    </div>
                    <div className="range-inputs">
                        <div className="range-input">
                            <label htmlFor="minTHC">Min:</label>
                            <input
                                type="number"
                                id="minTHC"
                                min="0"
                                max="40"
                                step="0.5"
                                value={filters.thcRange.min}
                                onChange={(e) => handleTHCChange('min', Number(e.target.value))}
                            />
                            %
                        </div>
                        <div className="range-input">
                            <label htmlFor="maxTHC">Max:</label>
                            <input
                                type="number"
                                id="maxTHC"
                                min="0"
                                max="40"
                                step="0.5"
                                value={filters.thcRange.max}
                                onChange={(e) => handleTHCChange('max', Number(e.target.value))}
                            />
                            %
                        </div>
                    </div>
                </div>

                {/* CBD Range */}
                <div className="filter-section">
                    <h3 className="filter-section-title">CBD Range</h3>
                    <div className="range-slider-container flex justify-center">
                        <input
                            type="range"
                            min="0"
                            max="25"
                            value={filters.cbdRange.min}
                            step="0.5"
                            className="range-slider range-slider-min"
                            onChange={(e) => handleCBDChange('min', Number(e.target.value))}
                        />
                        <input
                            type="range"
                            min="0"
                            max="25"
                            value={filters.cbdRange.max}
                            step="0.5"
                            className="range-slider range-slider-max"
                            onChange={(e) => handleCBDChange('max', Number(e.target.value))}
                        />
                    </div>
                    <div className="range-inputs">
                        <div className="range-input">
                            <label htmlFor="minCBD">Min:</label>
                            <input
                                type="number"
                                id="minCBD"
                                min="0"
                                max="25"
                                step="0.5"
                                value={filters.cbdRange.min}
                                onChange={(e) => handleCBDChange('min', Number(e.target.value))}
                            />
                            %
                        </div>
                        <div className="range-input">
                            <label htmlFor="maxCBD">Max:</label>
                            <input
                                type="number"
                                id="maxCBD"
                                min="0"
                                max="25"
                                step="0.5"
                                value={filters.cbdRange.max}
                                onChange={(e) => handleCBDChange('max', Number(e.target.value))}
                            />
                            %
                        </div>
                    </div>
                </div>

                {/* Filter Actions */}
                <div className="filter-actions">
                    <button
                        className="filter-action-btn filter-reset"
                        onClick={handleReset}
                        type="button"
                    >
                        Reset Filters
                    </button>
                    <button
                        className="filter-action-btn filter-apply"
                        onClick={handleApply}
                        type="button"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FilterModal
