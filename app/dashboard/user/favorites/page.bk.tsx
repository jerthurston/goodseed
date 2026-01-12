'use client'

import SeedCardItem from '@/components/custom/card/SeedCardItem'
import AddToListModal from '@/components/custom/modals/AddToListModal'
import DeleteListConfirmModal from '@/components/custom/modals/DeleteListConfirmModal'
import ManageListModal from '@/components/custom/modals/ManageFolderModal'
import UnfavoriteConfirmModal from '@/components/custom/modals/UnfavoriteConfirmModal'
import { SeedFilter } from '@/types/seed.type'
import { faSeedling, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCreateWishlistFolder, useFetchWishlistFolders, useUpdateWishlistFolder, useDuplicateWishlistFolder, useDeleteWishlistFolder } from '@/hooks/client-user/wishlist-folder'
import { useFetchWishlist } from '@/hooks/client-user/wishlist/useFetchWishlist'
import { apiLogger } from '@/lib/helpers/api-logger'
import { WishlistFolderUI } from '@/types/wishlist-folder.type'
import DeleteFolderConfirmModal from '@/components/custom/modals/DeleteListConfirmModal'
import ManageFolderModal from '@/components/custom/modals/ManageFolderModal'

const FavouritePage = () => {
    const [currentWishlistFolder, setCurrentWishlistFolder] = useState<WishlistFolderUI>();
    const [newFolderName, setNewFolderName] = useState('');
    const [isCustomFolder, setIsCustomFolder] = useState(false);
    
    // Modal states
    const [isManageListModalOpen, setIsManageListModalOpen] = useState(false);
    const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);

    const [isAddToFolderModalOpen, setIsAddToFolderModalOpen] = useState(false);
    const [isUnfavoriteModalOpen, setIsUnfavoriteModalOpen] = useState(false);

    // Active states
    const [activeOverlaySeedId, setActiveOverlaySeedId] = useState<string | null>(null)
    const [activeModalSeedId, setActiveModalSeedId] = useState<string | null>(null)
    const [activeModalSeedName, setActiveModalSeedName] = useState<string>('')
    const [pendingUnfavoriteSeedId, setPendingUnfavoriteSeedId] = useState<string | null>(null)
    const [unfavoriteMessage, setUnfavoriteMessage] = useState('')

    // Favorites tracking
    const [favorites, setFavorites] = useState<Set<string>>(new Set([]))

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
        onSuccess:(newFolder) => {
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
                    folderId: item.folderId,
                    folderName: item.folder?.name || 'No folder',
                    seedName: item.seedProduct.name,
                    seedImage: item.seedProduct.imageUrl,
                    seedPrice: item.seedProduct.price,
                    createdAt: item.createdAt
                });
            });

            // Group by folder
            const groupedByFolder = wishlistItems.reduce((acc, item) => {
                const folderName = item.folder?.name || 'No folder';
                if (!acc[folderName]) {
                    acc[folderName] = [];
                }
                acc[folderName].push(item.seedProduct.name);
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

    // // Product list memberships
    // const [productListMemberships, setProductListMemberships] = useState<Record<string, string[]>>({
    //     'P001': ['defaultFavorites'],
    //     'P004': ['defaultFavorites', 'myNextGrow'],
    //     'P005': ['researchingStrains']
    // })

    // Fetch wishlistFolder của user thay productListMemberships

    //TODO:  Mock seeds data - without listId, will be filtered by memberships
    const [allSeeds] = useState<any[]>([
        {
            id: 'P001',
            name: 'Blue Dream',
            type: 'Feminized',
            category: 'Sativa',
            price: 4.99,
            thc: 18,
            cbd: 1,
            popularity: 5,
            date: '2023-01-15',
            vendorName: 'GoodSeed Co.',
            vendorUrl: '#vendor-link-goodseed',
            smallestPackSize: 3,
            smallestPackPrice: 14.97,
            strainDescription: 'A legendary sativa-dominant hybrid from California, Blue Dream balances full-body relaxation with gentle cerebral invigoration. Sweet berry aromas abound.',
            packs: [
                { size: 3, totalPrice: 14.97, pricePerSeed: 4.99 },
                { size: 5, totalPrice: 22.45, pricePerSeed: 4.49 },
                { size: 10, totalPrice: 39.90, pricePerSeed: 3.99 }
            ],
            imageUrl: '/images/placeholder-seed.svg'
        },
        {
            id: 'P004',
            name: 'Girl Scout Cookies',
            type: 'Feminized',
            category: 'Hybrid',
            price: 6.99,
            thc: 25,
            cbd: 1,
            popularity: 5,
            date: '2023-03-01',
            vendorName: 'Royal Queen Seeds',
            vendorUrl: '#vendor-link-rqs',
            smallestPackSize: 1,
            smallestPackPrice: 6.99,
            strainDescription: 'A potent hybrid with a sweet and earthy aroma, GSC launches you to euphoria\'s top floor where full-body relaxation meets a time-bending cerebral space.',
            packs: [
                { size: 1, totalPrice: 6.99, pricePerSeed: 6.99 },
                { size: 3, totalPrice: 20.97, pricePerSeed: 6.99 },
                { size: 5, totalPrice: 32.50, pricePerSeed: 6.50 }
            ],
            imageUrl: '/images/placeholder-seed.svg'
        },
        {
            id: 'P005',
            name: 'White Widow',
            type: 'Autoflower',
            category: 'Hybrid',
            price: 5.49,
            thc: 15,
            cbd: 5,
            popularity: 4,
            date: '2023-01-05',
            vendorName: 'MSNL',
            vendorUrl: '#vendor-link-msnl',
            smallestPackSize: 5,
            smallestPackPrice: 27.45,
            strainDescription: 'A balanced hybrid, White Widow is a global coffee shop classic known for its resin production and powerful, energetic, and social buzz.',
            packs: [
                { size: 5, totalPrice: 27.45, pricePerSeed: 5.49 },
                { size: 10, totalPrice: 49.90, pricePerSeed: 4.99 },
                { size: 20, totalPrice: 89.80, pricePerSeed: 4.49 }
            ],
            imageUrl: '/images/placeholder-seed.svg'
        }
    ])

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

    const handleClearFolder = () => {
        if (!currentWishlistFolder) return;
        
        // TODO: Implement clear folder logic (remove all seeds from folder)
        apiLogger.info('[handleClearFolder] Not implemented yet', { 
            folderId: currentWishlistFolder.id 
        });
    }

    const handleDeleteFolder = () => {
        if (!currentWishlistFolder || currentWishlistFolder.name === 'Uncategorized') return;
        
        // Use hook để delete folder trong database
        deleteFolder(currentWishlistFolder.id);
    }

    // const handleDuplicateList = () => {
    //     if (!selectedList) return

    //     const newListId = `list-${Date.now()}`
    //     const newListName = `${selectedList.name} (Copy)`

    //     setCurrentWishlistFolder(prev => [...prev, { id: newListId, name: newListName }])
    //     setSelectedListId(newListId)
    // }

    // const handleClearList = () => {
    //     // In real app, this would remove seeds from backend
    //     // For now, we'll just filter out seeds from this list
    // }

    // const handleDeleteList = () => {
    //     if (selectedListId === 'defaultFavorites') return

    //     setCurrentWishlistFolder(prev => prev.filter(folder => folder.id !== selectedListId))
    //     setSelectedListId('defaultFavorites')
    //     setIsDeleteListModalOpen(false)
    // }

    const toggleFavorite = (seedId: string) => {
        const isCurrentlyFavorite = favorites.has(seedId)

        if (isCurrentlyFavorite) {
            const seed = allSeeds.find(s => s.id === seedId)
            setUnfavoriteMessage(`Do you want to remove "${seed?.name}" from your favorites?`)
            setPendingUnfavoriteSeedId(seedId)
            setIsUnfavoriteModalOpen(true)
        } else {
            setFavorites(prev => {
                const newFavorites = new Set(prev)
                newFavorites.add(seedId)
                return newFavorites
            })
        }
    }

    // const handleConfirmUnfavorite = () => {
    //     if (pendingUnfavoriteSeedId) {
    //         // Remove from favorites
    //         setFavorites(prev => {
    //             const newFavorites = new Set(prev)
    //             newFavorites.delete(pendingUnfavoriteSeedId)
    //             return newFavorites
    //         })

    //         // Remove from all lists
    //         setProductListMemberships(prev => {
    //             const updated = { ...prev }
    //             delete updated[pendingUnfavoriteSeedId]
    //             return updated
    //         })
    //     }
    //     setIsUnfavoriteModalOpen(false)
    //     setPendingUnfavoriteSeedId(null)
    //     setUnfavoriteMessage('')
    // }

    const handleOpenAddToFolder = (seedId: string, seedName: string) => {
        setActiveModalSeedId(seedId)
        setActiveModalSeedName(seedName)
        setIsAddToFolderModalOpen(true)
    }

    // const handleListMembershipChange = (listId: string, isChecked: boolean) => {
    //     if (!activeModalSeedId) return

    //     setProductListMemberships(prev => {
    //         const currentMemberships = prev[activeModalSeedId] || []
    //         let updatedMemberships: string[]

    //         if (isChecked) {
    //             updatedMemberships = currentMemberships.includes(listId)
    //                 ? currentMemberships
    //                 : [...currentMemberships, listId]
    //         } else {
    //             updatedMemberships = currentMemberships.filter(id => id !== listId)

    //             if (listId === 'defaultFavorites') {
    //                 setFavorites(prevFavorites => {
    //                     const newFavorites = new Set(prevFavorites)
    //                     newFavorites.delete(activeModalSeedId)
    //                     return newFavorites
    //                 })
    //             }
    //         }

    //         return {
    //             ...prev,
    //             [activeModalSeedId]: updatedMemberships
    //         }
    //     })

    //     if (listId === 'defaultFavorites' && isChecked) {
    //         setFavorites(prev => {
    //             const newFavorites = new Set(prev)
    //             newFavorites.add(activeModalSeedId)
    //             return newFavorites
    //         })
    //     }
    // }

    // const handleCreateListFromModal = (name: string) => {
    //     const newFolderId = `list-${Date.now()}`
    //     const newFolder: UserList = {
    //         id: newFolderId,
    //         name,
    //     }

    //     setCurrentWishlistFolder(prev => [...prev, newFolder])

    //     if (activeModalSeedId) {
    //         setProductListMemberships(prev => ({
    //             ...prev,
    //             [activeModalSeedId]: [...(prev[activeModalSeedId] || []), newFolderId]
    //         }))
    //     }
    // }

    // Action for creating folder with "Enter" key
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            createFolder(newFolderName)
        }
    };
    // Check if current folder is custom (not default "Uncategorized")
    useEffect(() => {
       if(currentWishlistFolder?.name === 'Uncategorized' || currentWishlistFolder?.name === undefined) {
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

    // Sync favorites from wishlistItems
    useEffect(() => {
        if (wishlistItems.length > 0) {
            const seedIds = new Set(wishlistItems.map(item => item.seedId));
            setFavorites(seedIds);
            
            apiLogger.debug('[FavoritePage] Synced favorites from wishlist', {
                count: seedIds.size,
                seedIds: Array.from(seedIds)
            });
        }
    }, [wishlistItems]);

    // Compute visible seeds from wishlistItems filtered by current folder
    const visibleSeeds = wishlistItems
        .filter(item => {
            // Filter by current folder
            if (!currentWishlistFolder) return true;
            return item.folderId === currentWishlistFolder.id;
        })
        .map(item => {
            // Transform WishlistItemUI to SeedUI format
            const seedProduct = item.seedProduct;
            
            return {
                id: seedProduct.id,
                name: seedProduct.name,
                seedType: 'Feminized', // Default value, adjust if you have this data
                cannabisType: 'Hybrid', // Default value, adjust if you have this data
                price: seedProduct.price,
                thc: undefined, // You'll need to add this to your seedProduct if available
                cbd: undefined, // You'll need to add this to your seedProduct if available
                popularity: 0, // Default value
                date: new Date(item.createdAt).toISOString().split('T')[0],
                vendorName: 'Vendor', // Default value, adjust if you have this data
                vendorUrl: '#', // Default value, adjust if you have this data
                smallestPackSize: 1, // Default value
                smallestPackPrice: seedProduct.price,
                strainDescription: '', // Default value, adjust if you have this data
                packs: [], // Default value, adjust if you have this data
                imageUrl: seedProduct.imageUrl,
                stockStatus: 'In Stock', // Default value
                seller: {
                    ids: '', // Default value
                    affiliateTags: null
                }
            };
        });

    return (
        <main className="favorites-page-main">
            <div className="page-header">
                <h2 className=''>
                    My Favorites</h2>
                <p>Manage your saved seeds and organize them into custom lists.</p>
            </div>

            <section className="favorites-list-management">
                <div className="list-management__controls">
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
                                        {folder.name}
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
                                placeholder="New Folder name"
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
            </section>

            <div className="favorites-grid" id="plantCardGrid">
                {visibleSeeds.map((seed) => (
                    <SeedCardItem
                        key={seed.id}
                        seed={seed}
                        isFavorite={favorites.has(seed.id)}
                        isOverlayActive={activeOverlaySeedId === seed.id}
                        onToggleFavorite={toggleFavorite}
                        onOpenOverlay={(id) => setActiveOverlaySeedId(id)}
                        onCloseOverlay={() => setActiveOverlaySeedId(null)}
                        onOpenAddToFolder={handleOpenAddToFolder}
                    />
                ))}
            </div>

            <div id="noFavoritesMessage"
                className={`
            ${visibleSeeds.length === 0 ? 'visible' : ''} 
            flex flex-col justify-center items-center gap-6
            `}>
                <FontAwesomeIcon
                    icon={faSeedling}
                    className='text-6xl text-gray-500'
                />
                <div>
                    <h3 style={{ fontFamily: "'Poppins', sans-serif" }}>This List is Empty</h3>
                    <p style={{ color: 'var(--text-primary-muted)', fontFamily: "'Poppins', sans-serif" }}>
                        Browse our collection to find your next favorite seed!
                    </p>
                </div>
                <Link href="/seeds" className="login-btn no-favorites__cta w-full md:w-3/12 lg:w2/12" style={{ fontWeight: 800 }}>
                    Browse Seed Collection
                </Link>
            </div>

            {/* Modals */}
            <ManageFolderModal
                isOpen={isManageListModalOpen}
                folderName={currentWishlistFolder?.name || ''}
                onClose={() => setIsManageListModalOpen(false)}
                onRename={handleRenameFolder}
                onDuplicate={handleDuplicateFolder}
                onClear={handleClearFolder}
            />

            <DeleteFolderConfirmModal
                isOpen={isDeleteFolderModalOpen}
                folderName={currentWishlistFolder?.name || ''}
                onCancel={() => setIsDeleteFolderModalOpen(false)}
                onConfirm={handleDeleteFolder}
            />

            {/* <AddToListModal
                isOpen={isAddToListModalOpen}
                strainName={activeModalSeedName}
                productId={activeModalSeedId || ''}
                userLists={currentWishlistFolder}
                productListMemberships={activeModalSeedId ? (productListMemberships[activeModalSeedId] || []) : []}
                onClose={() => {
                    setIsAddToListModalOpen(false)
                    setActiveModalSeedId(null)
                    setActiveModalSeedName('')
                }}
                onMembershipChange={handleListMembershipChange}
                onCreateNewList={handleCreateListFromModal}
            /> */}

            {/* <UnfavoriteConfirmModal
                isOpen={isUnfavoriteModalOpen}
                message={unfavoriteMessage}
                onCancel={() => {
                    setIsUnfavoriteModalOpen(false)
                    setPendingUnfavoriteSeedId(null)
                    setUnfavoriteMessage('')
                }}
                onConfirm={handleConfirmUnfavorite}
            /> */}
        </main>
    )
}

export default FavouritePage
