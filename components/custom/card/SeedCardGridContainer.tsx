'use client'

import { useState } from 'react'

import AddToListModal, { type UserList } from '../modals/AddToListModal'
import UnfavoriteConfirmModal from '../modals/UnfavoriteConfirmModal'
import Pagination from '../Pagination'
import SeedCardItem from './SeedCardItem'

import type { SeedPaginationUI, SeedUI } from '@/types/seed.type'

interface CardGridContainerProps {
    seeds: SeedUI[];
    pagination: SeedPaginationUI | null;
    isLoading: boolean;
    isError: boolean;
    onPageChange?: (page: number) => void;
}

const CardGridContainer = ({ seeds, pagination, isLoading, isError, onPageChange }: CardGridContainerProps) => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [isUnfavoriteModalOpen, setIsUnfavoriteModalOpen] = useState(false)
    const [unfavoriteMessage, setUnfavoriteMessage] = useState('')
    const [pendingUnfavoriteSeedId, setPendingUnfavoriteSeedId] = useState<string | null>(null)
    const [activeOverlaySeedId, setActiveOverlaySeedId] = useState<string | null>(null)

    // Add to List Modal state
    const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false)
    const [activeModalSeedId, setActiveModalSeedId] = useState<string | null>(null)
    const [activeModalSeedName, setActiveModalSeedName] = useState<string>('')

    // User lists management - Mock data, replace with actual API
    const [userLists, setUserLists] = useState<UserList[]>([
        { id: 'favorites', name: 'Favorites' },
        { id: 'wishlist', name: 'Wishlist' },
        { id: 'grow-plan-2024', name: 'Grow Plan 2024' }
    ])

    // Track which products belong to which lists
    // Structure: { productId: [listId1, listId2, ...] }
    const [productListMemberships, setProductListMemberships] = useState<Record<string, string[]>>({
        'P001': ['favorites'],
        'P004': ['favorites', 'wishlist']
    })

    // Use pagination from props (API handles pagination server-side)
    const currentPage = pagination?.page || 1;
    const totalPages = pagination?.totalPages || 1;

    const toggleFavorite = (seedId: string) => {
        const isCurrentlyFavorite = favorites.has(seedId)

        if (isCurrentlyFavorite) {
            // Show confirmation modal when unfavoriting
            // In a real app, you'd check if seed is in custom lists
            const seed = seeds.find(s => s.id === seedId)
            setUnfavoriteMessage(`This seed is in one or more of your custom lists. Do you want to remove "${seed?.name}" from your favorites?`)
            setPendingUnfavoriteSeedId(seedId)
            setIsUnfavoriteModalOpen(true)
        } else {
            // Add to favorites directly
            setFavorites(prev => {
                const newFavorites = new Set(prev)
                newFavorites.add(seedId)
                return newFavorites
            })
        }
    }

    const handleCancelUnfavorite = () => {
        setIsUnfavoriteModalOpen(false)
        setPendingUnfavoriteSeedId(null)
        setUnfavoriteMessage('')
    }

    const handleConfirmUnfavorite = () => {
        if (pendingUnfavoriteSeedId) {
            setFavorites(prev => {
                const newFavorites = new Set(prev)
                newFavorites.delete(pendingUnfavoriteSeedId)
                return newFavorites
            })
        }
        setIsUnfavoriteModalOpen(false)
        setPendingUnfavoriteSeedId(null)
        setUnfavoriteMessage('')
    }

    const openPackDealsOverlay = (seedId: string) => {
        setActiveOverlaySeedId(seedId)
    }

    const closePackDealsOverlay = () => {
        setActiveOverlaySeedId(null)
    }

    const handleOpenAddToList = (seedId: string, seedName: string) => {
        setActiveModalSeedId(seedId)
        setActiveModalSeedName(seedName)
        setIsAddToListModalOpen(true)
    }

    const handleCloseAddToList = () => {
        setIsAddToListModalOpen(false)
        setActiveModalSeedId(null)
        setActiveModalSeedName('')
    }

    const handleListMembershipChange = (listId: string, isChecked: boolean) => {
        if (!activeModalSeedId) return

        setProductListMemberships(prev => {
            const currentMemberships = prev[activeModalSeedId] || []
            let updatedMemberships: string[]

            if (isChecked) {
                // Add to list if not already present
                updatedMemberships = currentMemberships.includes(listId)
                    ? currentMemberships
                    : [...currentMemberships, listId]
            } else {
                // Remove from list
                updatedMemberships = currentMemberships.filter(id => id !== listId)

                // If removing from favorites list, update favorites state
                if (listId === 'favorites') {
                    setFavorites(prevFavorites => {
                        const newFavorites = new Set(prevFavorites)
                        newFavorites.delete(activeModalSeedId)
                        return newFavorites
                    })
                }
            }

            return {
                ...prev,
                [activeModalSeedId]: updatedMemberships
            }
        })

        // If adding to favorites list, update favorites state
        if (listId === 'favorites' && isChecked) {
            setFavorites(prev => {
                const newFavorites = new Set(prev)
                newFavorites.add(activeModalSeedId)
                return newFavorites
            })
        }
    }

    const handleCreateNewList = (listName: string) => {
        // Generate unique ID (in real app, this would come from backend)
        const newListId = `list-${Date.now()}`
        const newList: UserList = {
            id: newListId,
            name: listName
        }

        setUserLists(prev => [...prev, newList])

        // Automatically add current seed to the new list
        if (activeModalSeedId) {
            setProductListMemberships(prev => ({
                ...prev,
                [activeModalSeedId]: [...(prev[activeModalSeedId] || []), newListId]
            }))
        }
    }

    return (
        <main className="results-page-main">
            <div className="page-header">
                <h2 className=''>Our Seed Collection</h2>
                <p>Browse our premium selection of high-quality seeds from trusted vendors</p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="results-grid" id="plantCardGrid">
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <p>Loading seeds...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {isError && !isLoading && (
                <div className="results-grid" id="plantCardGrid">
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--color-error, red)' }}>Error loading seeds. Please try again.</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && seeds.length === 0 && (
                <div className="results-grid" id="plantCardGrid">
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <p>No seeds found. Try adjusting your filters.</p>
                    </div>
                </div>
            )}

            {/* Product Card Grid container */}
            {!isLoading && !isError && seeds.length > 0 && (
                <div className="results-grid" id="plantCardGrid">
                    {seeds.map((seed) => (
                        <SeedCardItem
                            key={seed.id}
                            seed={seed}
                            isFavorite={favorites.has(seed.id)}
                            isOverlayActive={activeOverlaySeedId === seed.id}
                            onToggleFavorite={toggleFavorite}
                            onOpenOverlay={openPackDealsOverlay}
                            onCloseOverlay={closePackDealsOverlay}
                            onOpenAddToList={handleOpenAddToList}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination && onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}

            <UnfavoriteConfirmModal
                isOpen={isUnfavoriteModalOpen}
                message={unfavoriteMessage}
                onCancel={handleCancelUnfavorite}
                onConfirm={handleConfirmUnfavorite}
            />

            <AddToListModal
                isOpen={isAddToListModalOpen}
                strainName={activeModalSeedName}
                productId={activeModalSeedId || ''}
                userLists={userLists}
                productListMemberships={activeModalSeedId ? (productListMemberships[activeModalSeedId] || []) : []}
                onClose={handleCloseAddToList}
                onMembershipChange={handleListMembershipChange}
                onCreateNewList={handleCreateNewList}
            />
        </main>
    )
}

export default CardGridContainer
