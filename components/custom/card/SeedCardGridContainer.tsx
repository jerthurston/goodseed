'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import UnfavoriteConfirmModal from '../modals/UnfavoriteConfirmModal'
import Pagination from '../Pagination'
import SeedCardItem from './SeedCardItem'
import AddToFolderModal from '../modals/AddToListModal'

import type { SeedPaginationUI, SeedUI } from '@/types/seed.type'
import { apiLogger } from '@/lib/helpers/api-logger'
import { useCreateFavoriteSeedInWishlist } from '@/hooks/client-user/wishlist/useCreateFavoriteSeedInWishlist'
import { useDeleteFavoriteSeedInWishlist } from '@/hooks/client-user/wishlist/useDeleteFavoriteSeedInWishlist'
import { useFetchWishlist } from '@/hooks/client-user/wishlist/useFetchWishlist'
import { useUpdateWishlistFolder } from '@/hooks/client-user/wishlist/useUpdateWishlistFolder'
import { useFetchWishlistFolders } from '@/hooks/client-user/wishlist-folder/useFetchWishlistFolders'
import { useCreateWishlistFolder } from '@/hooks/client-user/wishlist-folder/useCreateWishlistFolder'
import { usePathname } from 'next/navigation'

import AddToListModal from '../modals/AddToListModal'
import { useAuthModal } from '@/hooks/auth/useAuthModal'

interface CardGridContainerProps {
    seeds: SeedUI[];
    pagination?: SeedPaginationUI | null;
    isLoading?: boolean;
    isError?: boolean;
    onPageChange?: (page: number) => void;
}

const CardGridContainer = ({ seeds, pagination, isLoading, isError, onPageChange }: CardGridContainerProps) => {

    const pathname = usePathname();
    const isFavoritesPage = pathname.includes('/favorites');

    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [isUnfavoriteModalOpen, setIsUnfavoriteModalOpen] = useState(false)
    const [unfavoriteMessage, setUnfavoriteMessage] = useState('')
    const [pendingUnfavoriteSeedId, setPendingUnfavoriteSeedId] = useState<string | null>(null)
    // const [activeOverlaySeedId, setActiveOverlaySeedId] = useState<string | null>(null)

    // Add to Folder Modal state
    const [isAddToFolderModalOpen, setIsAddToFolderModalOpen] = useState(false)
    // Manage active seed modal
    const [activeModalSeedId, setActiveModalSeedId] = useState<string | null>(null)
    const [activeModalSeedName, setActiveModalSeedName] = useState<string>('')

    // CUSTOM HOOKS:
    // ----> Fetch wishlist items from server
    const {
        wishlistItems,
        isLoading: isLoadingWishlist,
        isError: isWishlistError,
        error: wishlistError,
        refetch: refetchWishlist
    } = useFetchWishlist({
        // Chỉ fetch khi component đã mount và có seeds
        enabled: true
    });

    

    // Sync favorites state với wishlist data từ server
    useEffect(() => {
        if (wishlistItems.length > 0) {
            const wishlistSeedIds = new Set(wishlistItems.map(item => item.seedId));
            setFavorites(wishlistSeedIds);

            apiLogger.debug('[CardGridContainer] Synced favorites from wishlist', {
                count: wishlistSeedIds.size,
                seedIds: Array.from(wishlistSeedIds)
            });
        }
    }, [wishlistItems]);

    // Wishlist Hook - Add to favorites
    const { addToWishlist, isPending: isAddingToWishlist } = useCreateFavoriteSeedInWishlist({
        onSuccess: (wishlist) => {
            // Update local favorites state after successful API call
            setFavorites(prev => {
                const newFavorites = new Set(prev);
                newFavorites.add(wishlist.seedId);
                return newFavorites;
            });

            // Refetch wishlist to ensure sync
            refetchWishlist();

            apiLogger.info('[CardGridContainer] Seed added to wishlist', {
                wishlistId: wishlist.id,
                seedId: wishlist.seedId
            });
        }
    });

    // Wishlist Hook - Remove from favorites
    const { removeFromWishlist, isPending: isRemovingFromWishlist } = useDeleteFavoriteSeedInWishlist({
        onSuccess: (seedId) => {
            // Update local favorites state after successful deletion
            setFavorites(prev => {
                const newFavorites = new Set(prev);
                newFavorites.delete(seedId);
                return newFavorites;
            });
            // Refetch wishlist to ensure sync
            refetchWishlist();
            apiLogger.info('[CardGridContainer] Seed removed from wishlist', {
                seedId
            });
        }
    });

    // Wishlist Hook - Update folder
    const { updateFolder, isPending: isUpdatingFolder } = useUpdateWishlistFolder({
        onSuccess: ({ seedId, folderId }: { seedId: string; folderId: string }) => {
            // Refetch wishlist to get updated folder assignments
            refetchWishlist();

            apiLogger.info('[CardGridContainer] Seed folder updated', {
                seedId,
                folderId
            });
        }
    });

    // Fetch wishlist folders from server
    const {
        folders: wishlistFolders,
        isLoading: isLoadingFolders,
        refetch: refetchFolders,
    } = useFetchWishlistFolders();

    // Create wishlist folder hook
    const { createFolder, isPending: isCreatingFolder } = useCreateWishlistFolder({
        existingFolders: wishlistFolders,
        onSuccess: (newFolder) => {
            // Refetch folders after creation
            refetchFolders();

            apiLogger.info('[CardGridContainer] New folder created', {
                folderId: newFolder.id,
                folderName: newFolder.name
            });
        }
    });

    /**
     * Compute which folders a seed belongs to from wishlist data
     * No need for separate state - single source of truth from server
     */
    const getProductFolderMemberships = (seedId: string): string[] => {
        return wishlistItems
            .filter(item => item.seedId === seedId && item.folderId)
            .map(item => item.folderId as string);
    };

    // Use pagination from props (API handles pagination server-side)
    const currentPage = pagination?.page || 1;
    const totalPages = pagination?.totalPages || 1;
    // Function to add seed item to favorites
    const toggleFavorite = (seedId: string) => {
        const isCurrentlyFavorite = favorites.has(seedId)

        if (isCurrentlyFavorite) {
            // Show confirmation modal when unfavoriting
            const seed = seeds.find(s => s.id === seedId)
            setUnfavoriteMessage(`Do you want to remove "${seed?.name}" from your favorites?`)
            setPendingUnfavoriteSeedId(seedId)
            setIsUnfavoriteModalOpen(true)
        } else {
            // Add to favorites (will be added to Uncategorized folder automatically)
            addToWishlist({ seedId });
        }
    }
    // Function to cancel unfavoriting
    const handleCancelUnfavorite = () => {
        setIsUnfavoriteModalOpen(false)
        setPendingUnfavoriteSeedId(null)
        setUnfavoriteMessage('')
    }
    // Function to open add to folder modal
    const handleOpenAddToFolder = (seedId: string, seedName: string) => {
        setActiveModalSeedId(seedId)
        setActiveModalSeedName(seedName)
        setIsAddToFolderModalOpen(true)
    }
    // Function to close add to folder modal
    const handleCloseAddToFolder = () => {
        setIsAddToFolderModalOpen(false)
        setActiveModalSeedId(null)
        setActiveModalSeedName('')
    }
    // Function to handle folder changes
    const handleFolderChange = (folderId: string, isChecked: boolean) => {
        if (!activeModalSeedId) return
        apiLogger.info('[CardGridContainer] Folder change requested', {
            seedId: activeModalSeedId,
            folderId,
            isChecked,
            action: isChecked ? 'add_to_folder' : 'remove_from_folder'
        });

        if (isChecked) {
            // Add/move seed to selected folder
            updateFolder({
                seedId: activeModalSeedId,
                folderId
            });
        } else {
            // When unchecking, move to Uncategorized folder
            // Find Uncategorized folder
            const uncategorizedFolder = wishlistFolders.find(
                folder => folder.name === 'Uncategorized'
            );

            if (uncategorizedFolder) {
                updateFolder({
                    seedId: activeModalSeedId,
                    folderId: uncategorizedFolder.id
                });
            } else {
                apiLogger.logError('[CardGridContainer] Uncategorized folder not found', {
                    seedId: activeModalSeedId,
                    availableFolders: wishlistFolders.map(f => f.name)
                });
                toast.error('Cannot remove from folder: Uncategorized folder not found');
            }
        }
    }
    // Function to create a new folder
    const handleCreateNewFolder = (folderName: string) => {
        // Call API to create folder (validation and duplicate check are handled in the hook)
        createFolder(folderName);
    }
     // Function to confirm unfavoriting
    const handleConfirmUnfavorite = () => {
        if (pendingUnfavoriteSeedId) {
            // Call API to remove from wishlist
            removeFromWishlist({ seedId: pendingUnfavoriteSeedId });
        }

        // Close modal
        setIsUnfavoriteModalOpen(false)
        setPendingUnfavoriteSeedId(null)
        setUnfavoriteMessage('')
    }

    return (
        <main className="results-page-main">
            {!isFavoritesPage && (
                <div className="page-header">
                    <h2 className=''>Our Seed Collection</h2>
                    <p>Browse our premium selection of high-quality seeds from trusted vendors</p>
                    <p className='font-bold'>
                        {(!isLoading && !isError && pagination) && `${pagination.total} seeds found`}
                    </p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="results-grid" id="plantCardGrid">
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                        <p>Loading seeds...</p>
                        {/* Build Skeleton Loader UI */}
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
            {!isLoading && !isError && seeds.length === 0 && !isFavoritesPage && (
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
                            onToggleFavorite={toggleFavorite}
                            onOpenAddToFolder={handleOpenAddToFolder}
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

            {/* Confirm unfavorite modal */}
            <UnfavoriteConfirmModal
                isOpen={isUnfavoriteModalOpen}
                message={unfavoriteMessage}
                onCancel={handleCancelUnfavorite}
                onConfirm={handleConfirmUnfavorite}
            />
            {/* --> Modal sắp xếp listing vào wishlist folder */}
            <AddToFolderModal
                isOpen={isAddToFolderModalOpen}
                strainName={activeModalSeedName}
                activeModalSeedId={activeModalSeedId || ''}
                wishlistFolders={wishlistFolders}
                productFolderMemberships={activeModalSeedId ? getProductFolderMemberships(activeModalSeedId) : []}
                onClose={handleCloseAddToFolder}
                onChangeFolder={handleFolderChange}
                onCreateNewFolder={handleCreateNewFolder}
            />
        </main>
    )
}

export default CardGridContainer
