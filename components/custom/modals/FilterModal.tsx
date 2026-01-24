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
        setFilters(prev => {
            if (type === 'min') {
                // Ensure min doesn't exceed max
                return {
                    ...prev,
                    priceRange: {
                        ...prev.priceRange,
                        min: Math.min(value, prev.priceRange.max - 1)
                    }
                }
            } else {
                // Ensure max doesn't go below min
                return {
                    ...prev,
                    priceRange: {
                        ...prev.priceRange,
                        max: Math.max(value, prev.priceRange.min + 1)
                    }
                }
            }
        })
    }

    // Generic smart click handler for range sliders with smooth animation
    const createRangeSliderClickHandler = (
        rangeType: 'priceRange' | 'thcRange' | 'cbdRange',
        maxValue: number,
        step: number,
        handleChange: (type: 'min' | 'max', value: number) => void
    ) => {
        return (e: React.MouseEvent<HTMLDivElement>) => {
            const sliderContainer = e.currentTarget
            const rect = sliderContainer.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const clickPercentage = clickX / rect.width
            
            // Calculate clicked value with proper rounding based on step
            const rawValue = clickPercentage * maxValue
            const clickedValue = step === 1 
                ? Math.round(rawValue)
                : Math.round(rawValue / step) * step
            
            const { min, max } = filters[rangeType]
            const midPoint = (min + max) / 2
            
            // Xác định slider nào sẽ di chuyển
            const isMovingMin = clickedValue < midPoint
            const currentValue = isMovingMin ? min : max
            const targetValue = clickedValue
            
            // Tạo smooth animation
            const duration = 200 // ms
            const startTime = Date.now()
            const difference = targetValue - currentValue
            
            const animate = () => {
                const elapsed = Date.now() - startTime
                const progress = Math.min(elapsed / duration, 1)
                
                // Easing function (ease-in-out)
                const eased = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2
                
                // Calculate new value with proper rounding based on step
                const rawNewValue = currentValue + difference * eased
                const newValue = step === 1
                    ? Math.round(rawNewValue)
                    : Math.round(rawNewValue / step) * step
                
                if (isMovingMin) {
                    handleChange('min', newValue)
                } else {
                    handleChange('max', newValue)
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate)
                }
            }
            
            requestAnimationFrame(animate)
        }
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
        setFilters(prev => {
            if (type === 'min') {
                // Ensure min doesn't exceed max
                return {
                    ...prev,
                    thcRange: {
                        ...prev.thcRange,
                        min: Math.min(value, prev.thcRange.max - 0.5)
                    }
                }
            } else {
                // Ensure max doesn't go below min
                return {
                    ...prev,
                    thcRange: {
                        ...prev.thcRange,
                        max: Math.max(value, prev.thcRange.min + 0.5)
                    }
                }
            }
        })
    }

    const handleCBDChange = (type: 'min' | 'max', value: number) => {
        setFilters(prev => {
            if (type === 'min') {
                // Ensure min doesn't exceed max
                return {
                    ...prev,
                    cbdRange: {
                        ...prev.cbdRange,
                        min: Math.min(value, prev.cbdRange.max - 0.5)
                    }
                }
            } else {
                // Ensure max doesn't go below min
                return {
                    ...prev,
                    cbdRange: {
                        ...prev.cbdRange,
                        max: Math.max(value, prev.cbdRange.min + 0.5)
                    }
                }
            }
        })
    }

    // Create specific handlers using the generic function
    const handlePriceSliderClick = createRangeSliderClickHandler('priceRange', 100, 1, handlePriceChange)
    const handleTHCSliderClick = createRangeSliderClickHandler('thcRange', 40, 0.5, handleTHCChange)
    const handleCBDSliderClick = createRangeSliderClickHandler('cbdRange', 25, 0.5, handleCBDChange)

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
                    <div 
                        className="range-slider-container flex justify-center" 
                        onClick={handlePriceSliderClick}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        {/* min pricing input slider */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.priceRange.min}
                            step="1"
                            className="range-slider range-slider-min"
                            onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {/* max pricing input slider */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.priceRange.max}
                            step="1"
                            className="range-slider range-slider-max"
                            onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    {/* pricing input form */}
                    <div className="range-inputs">
                        <div className="range-input">
                            <label htmlFor="minPrice">Min:</label>
                            <input
                                type="number"
                                id="minPrice"
                                min="0"
                                max={filters.priceRange.max}
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
                                min={filters.priceRange.min}
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
                    <div 
                        className="range-slider-container flex justify-center"
                        onClick={handleTHCSliderClick}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        <input
                            type="range"
                            min="0"
                            max="40"
                            value={filters.thcRange.min}
                            step="0.5"
                            className="range-slider range-slider-min"
                            onChange={(e) => handleTHCChange('min', Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <input
                            type="range"
                            min="0"
                            max="40"
                            value={filters.thcRange.max}
                            step="0.5"
                            className="range-slider range-slider-max"
                            onChange={(e) => handleTHCChange('max', Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="range-inputs">
                        <div className="range-input">
                            <label htmlFor="minTHC">Min:</label>
                            <input
                                type="number"
                                id="minTHC"
                                min="0"
                                max={filters.thcRange.max}
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
                                min={filters.thcRange.min}
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
                    <div 
                        className="range-slider-container flex justify-center"
                        onClick={handleCBDSliderClick}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        <input
                            type="range"
                            min="0"
                            max="25"
                            value={filters.cbdRange.min}
                            step="0.5"
                            className="range-slider range-slider-min"
                            onChange={(e) => handleCBDChange('min', Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <input
                            type="range"
                            min="0"
                            max="25"
                            value={filters.cbdRange.max}
                            step="0.5"
                            className="range-slider range-slider-max"
                            onChange={(e) => handleCBDChange('max', Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="range-inputs">
                        <div className="range-input">
                            <label htmlFor="minCBD">Min:</label>
                            <input
                                type="number"
                                id="minCBD"
                                min="0"
                                max={filters.cbdRange.max}
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
                                min={filters.cbdRange.min}
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
