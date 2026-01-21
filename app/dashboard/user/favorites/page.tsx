'use client'

import { useEffect, useState, useMemo } from 'react'
import { 
    useCreateWishlistFolder, 
    useFetchWishlistFolders, 
    useUpdateWishlistFolder, 
    useDuplicateWishlistFolder, 
    useDeleteWishlistFolder, 
    useClearWishlistFolder 
} from '@/hooks/client-user/wishlist-folder'
import { useFetchWishlist } from '@/hooks/client-user/wishlist/useFetchWishlist'
import { apiLogger } from '@/lib/helpers/api-logger'
import { WishlistFolderUI } from '@/types/wishlist-folder.type'
import DeleteFolderConfirmModal from '@/components/custom/modals/DeleteListConfirmModal'
import ManageFolderModal from '@/components/custom/modals/ManageFolderModal'
import NoSeedInWishlistFolder from './(component)/NoSeedInWishlistFolder'
import CardGridContainer from '@/components/custom/card/SeedCardGridContainer'
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const FavouritePage = () => {
    const [currentWishlistFolder, setCurrentWishlistFolder] = useState<WishlistFolderUI>();
    const [newFolderName, setNewFolderName] = useState('');
    const [isCustomFolder, setIsCustomFolder] = useState(false);

    // Modal states
    const [isManageListModalOpen, setIsManageListModalOpen] = useState(false);
    const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);

    // Wishlist Hook - Fetch wishlist items
    const {
        wishlistItems,
        isLoading: isLoadingWishlist,
        isError: isWishlistError,
        error: wishlistError,
        refetch: refetchWishlist
    } = useFetchWishlist({
        enabled: true
    });

    // Wishlist Folder Hooks
    const { folders, isLoading: isFoldersLoading } = useFetchWishlistFolders();
    const { createFolder, isPending: isCreatingFolder } = useCreateWishlistFolder({
        existingFolders: folders,
        onSuccess: (newFolder) => {
            // After creating, switch to the new folder
            setCurrentWishlistFolder(newFolder);
            setIsManageListModalOpen(false);
            // Reset input field về empty
            setNewFolderName('');
        }
    });
    const { updateFolder, isPending: isUpdatingFolder } = useUpdateWishlistFolder({
        onSuccess: (updatedFolder) => {
            // Update local state với folder đã được rename
            setCurrentWishlistFolder(updatedFolder);
            setIsManageListModalOpen(false);
        }
    });
    const { duplicateFolder, isPending: isDuplicatingFolder } = useDuplicateWishlistFolder({
        onSuccess: (duplicatedFolder) => {
            // Switch to duplicated folder sau khi duplicate thành công
            setCurrentWishlistFolder(duplicatedFolder);
            setIsManageListModalOpen(false);
        }
    });
    const { deleteFolder, isPending: isDeletingFolder } = useDeleteWishlistFolder({
        onSuccess: () => {
            // After delete, switch to first folder (usually Uncategorized)
            setCurrentWishlistFolder(folders[0]);
            setIsDeleteFolderModalOpen(false);
        }
    });
    const { clearFolder, isPending: isClearingFolder } = useClearWishlistFolder({
        onSuccess: () => {
            // After clear, close modal and refetch wishlist
            setIsManageListModalOpen(false);
            refetchWishlist();
        }
    });

    // DEBUG LOG:
    useEffect(() => {
        apiLogger.debug('[FavoritePage] folders', { folders });
    }, [folders]);

    // DEBUG LOG: Wishlist items
    useEffect(() => {
        if (wishlistItems.length > 0) {
            apiLogger.info('[FavoritePage] Wishlist items fetched', {
                count: wishlistItems.length,
                items: wishlistItems
            });

            // Log detailed structure
            wishlistItems.forEach((item, index) => {
                apiLogger.debug(`[FavoritePage] Wishlist item #${index + 1}`, {
                    wishlistId: item.id,
                    seedId: item.seedId,
                    folders: item.folders.map(f => ({ id: f.id, name: f.name })),
                    folderNames: item.folders.map(f => f.name).join(', ') || 'No folders',
                    seedName: item.seedProduct.name,
                    seedImage: item.seedProduct.imageUrl,
                    seedPrice: item.seedProduct.price,
                    createdAt: item.createdAt
                });
            });

            // Group by folder
            const groupedByFolder = wishlistItems.reduce((acc, item) => {
                // Each item can belong to multiple folders
                item.folders.forEach(folder => {
                    const folderName = folder.name || 'No folder';
                    if (!acc[folderName]) {
                        acc[folderName] = [];
                    }
                    acc[folderName].push(item.seedProduct.name);
                });
                return acc;
            }, {} as Record<string, string[]>);

            apiLogger.info('[FavoritePage] Wishlist grouped by folder', groupedByFolder);
        } else {
            apiLogger.warn('[FavoritePage] No wishlist items found');
        }
    }, [wishlistItems]);

    // Log loading/error states
    useEffect(() => {
        if (isLoadingWishlist) {
            apiLogger.debug('[FavoritePage] Loading wishlist...');
        }
        if (isWishlistError) {
            apiLogger.logError('[FavoritePage] Wishlist fetch error', wishlistError as Error);
        }
    }, [isLoadingWishlist, isWishlistError, wishlistError]);

    const handleFolderSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedFolder = folders.find(folder => folder.id === e.target.value);
        setCurrentWishlistFolder(selectedFolder);
        apiLogger.debug('[handleFolderSelectChange]', { selectedFolder });
    }

    const handleRenameFolder = (newName: string) => {
        if (!currentWishlistFolder) return;

        // Use hook để update folder name trong database và đồng bộ local state
        updateFolder({
            folderId: currentWishlistFolder.id,
            data: { name: newName }
        });
    }

    const handleDuplicateFolder = () => {
        if (!currentWishlistFolder) return;

        // Use hook để duplicate folder trong database
        duplicateFolder(currentWishlistFolder.id);
    }

    const handleConfirmClearFolder = () => {
        if (!currentWishlistFolder) {
            apiLogger.debug('[handleConfirmClearFolder] No current wishlist folder selected');
            return;
        }
        apiLogger.debug('[handleConfirmClearFolder]', { folderId: currentWishlistFolder.id });
        // Execute clear folder (move all seeds to Uncategorized)
        clearFolder({ folderId: currentWishlistFolder.id });
    }

    const handleDeleteFolder = () => {
        if (!currentWishlistFolder || currentWishlistFolder.name === 'Uncategorized') return;

        // Use hook để delete folder trong database
        deleteFolder(currentWishlistFolder.id);
    }

    // Action for creating folder with "Enter" key
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            createFolder(newFolderName)
        }
    };
    // Check if current folder is custom (not default "Uncategorized")
    useEffect(() => {
        if (currentWishlistFolder?.name === 'Uncategorized' || currentWishlistFolder?.name === undefined) {
            setIsCustomFolder(false); // Default folder - không cho phép xóa/edit
        } else {
            setIsCustomFolder(true); // Custom folder - cho phép xóa/edit
        }
    }, [currentWishlistFolder]);

    // Set default folder when folders are loaded
    useEffect(() => {
        if (folders.length > 0 && !currentWishlistFolder) {
            // Set first folder (usually Uncategorized) as default
            setCurrentWishlistFolder(folders[0]);
        }
    }, [folders, currentWishlistFolder]);

    // Compute visible seeds from wishlistItems filtered by current folder
    // useMemo for performance optimization - only recalculates when dependencies change
    const visibleSeeds = useMemo(() => {
        return wishlistItems
            .filter(item => {
                // Filter by current folder (Many-to-Many support)
                if (!currentWishlistFolder) return true;
                // Check if item belongs to current folder
                return item.folders.some(folder => folder.id === currentWishlistFolder.id);
            })
            .map(item => item.seedProduct); // seedProduct is already in SeedUI format from transformer
    }, [wishlistItems, currentWishlistFolder]);

    return (
        <main className="favorites-page-main">
            <div className="page-header">
                <div className='max-w-[1440px] mx-auto'>
                    <h2 className=''>
                        My Favorites</h2>
                    <p>Manage your saved seeds and organize them into custom lists.</p>
                </div>
            </div>

            <section className="favorites-list-management ">
                <div className='max-w-[1440px] mx-auto'>
                    <div className="list-management__controls ">
                        {/* -->Danh sách Wishlist Folder */}
                        <div className="list-management__selector-group">
                            <label htmlFor="favoriteListSelect" className="list-management-label">
                                Current List:
                            </label>
                            <div id="currentListControlsContainer" className="list-management__selector-actions">
                                <select
                                    id="favoriteListSelect"
                                    className="inline-select"
                                    value={currentWishlistFolder?.id}
                                    onChange={handleFolderSelectChange}
                                >
                                    {folders.map(folder => (
                                        <option key={folder.id} value={folder.id}>
                                            {folder.name === 'Uncategorized' ? 'Favorites (Default)' : folder.name}
                                        </option>
                                    ))}
                                </select>
                                <div id="currentListActionsGroup" className="list-management__action-buttons">
                                    <button
                                        id="listOptionsBtn"
                                        className={`list-create-btn ${!isCustomFolder ? 'disabled' : ''}`}
                                        style={{
                                            backgroundColor: 'var(--accent-cta)',
                                            color: 'var(--text-primary)',
                                            display: 'inline-flex'
                                        }}
                                        title="View more options for this list"
                                        onClick={() => setIsManageListModalOpen(true)}
                                        disabled={!isCustomFolder}
                                        type="button"
                                    >
                                        Options
                                    </button>
                                    <button
                                        id="deleteCurrentListBtn"
                                        className="list-delete-btn"
                                        title="Delete the currently selected list"
                                        style={{ display: isCustomFolder ? 'inline-flex' : 'none' }}
                                        onClick={() => setIsDeleteFolderModalOpen(true)}
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Tạo mới danh sách Wishlist Folder */}
                        <div className="list-management__create-group create-list-container">
                            <label htmlFor="newListName" className="list-management-label">
                                Create Wishlist Folder:
                            </label>
                            <div className="list-management__create-form">
                                <input
                                    type="text"
                                    id="newListName"
                                    placeholder="Eg: My Favorite Seeds"
                                    className="list-create-input"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    disabled={isCreatingFolder}
                                />
                                <button
                                    id="createNewListBtn"
                                    className="list-create-btn"
                                    onClick={() => createFolder(newFolderName)}
                                    type="button"
                                    disabled={isCreatingFolder || !newFolderName.trim()}
                                >
                                    {isCreatingFolder ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </section>

            {/* Loading State */}
            {isLoadingWishlist && (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <p>⏳ Loading your favorites...</p>
                </div>
            )}

            {/* Error State */}
            {isWishlistError && (
                <div style={{ padding: '2rem', color: 'var(--color-error)', textAlign: 'center' }}>
                    <p>❌ Error loading wishlist</p>
                    <button
                        onClick={() => refetchWishlist()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Seed Grid - Only show when loaded successfully */}
            {!isLoadingWishlist && !isWishlistError && (
                <CardGridContainer
                    seeds={visibleSeeds}
                    pagination={null}
                    isLoading={isLoadingWishlist}
                    isError={isWishlistError}
                />
            )}

            {/* Empty State - Only show when loaded and no seeds */}
            {!isLoadingWishlist && !isWishlistError && visibleSeeds.length === 0 && (
                <NoSeedInWishlistFolder />
            )}

            {/* Modals */}
            <ManageFolderModal
                isOpen={isManageListModalOpen}
                folderName={currentWishlistFolder?.name || ''}
                onClose={() => setIsManageListModalOpen(false)}
                onRename={handleRenameFolder}
                onDuplicate={handleDuplicateFolder}
                onClear={handleConfirmClearFolder}
            />

            <DeleteFolderConfirmModal
                isOpen={isDeleteFolderModalOpen}
                folderName={currentWishlistFolder?.name || ''}
                onCancel={() => setIsDeleteFolderModalOpen(false)}
                onConfirm={handleDeleteFolder}
            />
        </main>
    )
}

export default FavouritePage
