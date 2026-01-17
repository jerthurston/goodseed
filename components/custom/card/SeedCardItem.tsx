'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import type { SeedUI } from '@/types/seed.type'
import { useAuthModal } from '@/hooks/auth/useAuthModal'
import SignInModal from '../modals/SignInModal'
import { PotencyBadge } from '../badge'

// Component for enhanced potency display with better styling


interface SeedCardItemProps {
    seed: SeedUI
    isFavorite: boolean
    onToggleFavorite: (seedId: string) => void
    onOpenAddToFolder: (seedId: string, seedName: string) => void
}

const SeedCardItem = ({
    seed,
    isFavorite,
    onToggleFavorite,
    onOpenAddToFolder
}: SeedCardItemProps) => {
    // State Management
    const [isOpenViewpackOverlay, setIsOpenViewpackOverlay] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    // Authentication hook for checking
    const {
        // Check state
        isAuthModalOpen,
        // Take actions
        closeAuthModal,
        executeWithAuth,
        handleAuthSuccess,
    } = useAuthModal();
    // Functions
    const handleAddWishListClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        executeWithAuth(() => onToggleFavorite(seed.id));
    }
    return (
        <>
            {/*--> SEED CARD */}
            <div className="plant-card">
                {/* --> Header Card */}
                <div className="card-img-container">
                    {/* --> Featured Image of Seed Product */}
                    <Link
                        href={`${seed.vendorUrl}${seed.seller?.affiliateTags ? `${seed.seller.affiliateTags}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${seed.name} details on vendor site`}
                    >
                        <div className="card-img-aspect">
                            {/* {' '} */}
                            <Image
                                src={seed.imageUrl}
                                alt={seed.name}
                                className="card-img object-cover w-full h-full"
                                width={800}
                                height={800}
                            />
                            {/* {' '} */}
                        </div>
                    </Link>
                    <span className={`seed-type-pill-on-image ${seed.seedType?.toLowerCase()}`}>
                        {seed.seedType}
                    </span>
                    {/* -->add to bookmark list */}
                    <button
                        className={`list-icon-btn js-add-to-list-btn ${isFavorite ? 'is-animating' : ''}`}
                        aria-label="Add to list"
                        type="button"
                        onClick={() => onOpenAddToFolder(seed.id, seed.name)}
                    >
                        <svg
                            className="list-icon-svg"
                            viewBox="0 0 100 150"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                className="svg-border"
                                d="M5,5 L50,30 L95,5 L95,145 L5,145 Z"
                            />
                            <path
                                className="svg-fill"
                                d="M5,5 L50,30 L95,5 L95,145 L5,145 Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                    {/* -->add to wishlist */}
                    <button
                        className={`favorite-btn-new ${isFavorite ? 'active' : ''}`}
                        data-strain-name={seed.name}
                        onClick={handleAddWishListClick}
                        aria-label="Toggle Favorite"
                        type="button"
                    >
                        <FontAwesomeIcon
                            icon={isFavorite ? faHeartSolid : faHeartRegular}
                            color={isFavorite ? 'var(--brand-primary)' : ''}
                        />
                    </button>
                </div>
                {/* --> Body Card*/}
                <div className="plant-card-info-wrapper">
                    <h3 className="strain-name line-clamp-2">{seed.name}</h3>
                    <div className="price-pack-row">
                        {/* seed product metadata */}
                        <div className="price-info-group">
                            <p className="price-starting-at-label">Starting at</p>
                            <p className="price-per-seed">${seed.price.toFixed(2)}/seed</p>
                            <p className="smallest-pack-vendor-context">
                                {seed.vendorName}
                            </p>
                        </div>
                        {/* Viewpack Button */}
                        <button
                            type="button"
                            className="pack-deals-btn"
                            onClick={(e) => {
                                e.stopPropagation()
                                // onOpenOverlay(seed.id)
                                setIsOpenViewpackOverlay(true);
                            }}
                        >
                            View Packs
                        </button>
                    </div>
                    <div className="card-secondary-specs">
                        <span className="spec-item strain-category-text">{seed.cannabisType}</span>
                        <PotencyBadge value={seed.thc} label="THC" className="thc-value-text" />
                        <PotencyBadge value={seed.cbd} label="CBD" className="cbd-value-text" />
                    </div>
                </div>
                {/* --> Overlay View Pack Card */}
                <div
                    className={`plant-card-overlay ${isOpenViewpackOverlay ? 'active' : ''}`}
                    onClick={() => setIsOpenViewpackOverlay(false)}
                >
                    {isOpenViewpackOverlay && (
                        <>
                            <div className="overlay-header">
                                <button
                                    type="button"
                                    className="overlay-close-btn"
                                    aria-label="Close"
                                    onClick={() => setIsOpenViewpackOverlay(false)}
                                >
                                    &times;
                                </button>
                                <h3 className="overlay-strain-name-header">{seed.name}</h3>
                                <button
                                    className={`favorite-btn-new overlay-favorite-btn ${isFavorite ? 'active' : ''}`}
                                    data-strain-name={seed.name}
                                    onClick={handleAddWishListClick}
                                    aria-label="Toggle Favorite"
                                    type="button"
                                >
                                    <FontAwesomeIcon
                                        icon={isFavorite ? faHeartSolid : faHeartRegular}
                                        color='var(--brand-primary)'
                                    />
                                </button>
                            </div>
                            <div className="overlay-scroll-content">
                                <div className="overlay-strain-description">
                                    {/* <p style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: isDescriptionExpanded ? 'unset' : 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        margin: 0,
                                        marginBottom: '0.5rem'
                                    }}>
                                        {seed.strainDescription}
                                    </p> */}
                                    {seed.strainDescription.length > 150 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--brand-primary)',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            {isDescriptionExpanded ? 'See less' : 'See more'}
                                        </button>
                                    )}
                                </div>
                                <Link
                                    href={seed?.vendorUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="overlay-buy-on-vendor-btn"
                                >
                                    Buy on {seed?.vendorName}
                                </Link>
                                <table className="overlay-pricing-table">
                                    <thead>
                                        <tr>
                                            <th>Pack Size</th>
                                            <th>Total Price</th>
                                            <th>Price / Seed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {seed.packs.length > 0 ? (
                                            seed.packs.map((pack, idx) => (
                                                <tr key={idx}>
                                                    <td>{pack.size} Seeds</td>
                                                    <td>${pack.totalPrice.toFixed(2)}</td>
                                                    <td>${pack.pricePerSeed.toFixed(2)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>
                                                    No pack deals available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --> MODALS */}
            {/* ---->Auth Modal */}
            <SignInModal
                isOpen={isAuthModalOpen}
                onClose={() => closeAuthModal()}
                onLoginSuccess={() => handleAuthSuccess()}
            />
        </>
    )
}

export default SeedCardItem
