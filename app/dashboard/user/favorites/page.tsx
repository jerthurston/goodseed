'use client'

import SeedCardItem, { type Seed } from '@/components/custom/card/SeedCardItem'
import AddToListModal, { type UserList } from '@/components/custom/modals/AddToListModal'
import DeleteListConfirmModal from '@/components/custom/modals/DeleteListConfirmModal'
import ManageListModal from '@/components/custom/modals/ManageListModal'
import UnfavoriteConfirmModal from '@/components/custom/modals/UnfavoriteConfirmModal'
import { faSeedling, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'
import { useState } from 'react'

const FavouritePage = () => {
    const [selectedListId, setSelectedListId] = useState('defaultFavorites')
    const [userLists, setUserLists] = useState<UserList[]>([
        { id: 'defaultFavorites', name: 'Favorites (Default)' },
        { id: 'myNextGrow', name: 'My Next Grow' },
        { id: 'researchingStrains', name: 'Researching Strains' }
    ])
    const [newListName, setNewListName] = useState('')

    // Modal states
    const [isManageListModalOpen, setIsManageListModalOpen] = useState(false)
    const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false)
    const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false)
    const [isUnfavoriteModalOpen, setIsUnfavoriteModalOpen] = useState(false)

    // Active states
    const [activeOverlaySeedId, setActiveOverlaySeedId] = useState<string | null>(null)
    const [activeModalSeedId, setActiveModalSeedId] = useState<string | null>(null)
    const [activeModalSeedName, setActiveModalSeedName] = useState<string>('')
    const [pendingUnfavoriteSeedId, setPendingUnfavoriteSeedId] = useState<string | null>(null)
    const [unfavoriteMessage, setUnfavoriteMessage] = useState('')

    // Favorites tracking
    const [favorites, setFavorites] = useState<Set<string>>(new Set(['P001', 'P004', 'P005']))

    // Product list memberships
    const [productListMemberships, setProductListMemberships] = useState<Record<string, string[]>>({
        'P001': ['defaultFavorites'],
        'P004': ['defaultFavorites', 'myNextGrow'],
        'P005': ['researchingStrains']
    })

    // Mock seeds data - without listId, will be filtered by memberships
    const [allSeeds] = useState<Seed[]>([
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
            imageUrl: 'https://via.placeholder.com/300x200/F8C8DC/3b4a3f?text=Blue%20Dream'
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
            imageUrl: 'https://via.placeholder.com/300x200/F8C8DC/3b4a3f?text=Girl%20Scout%20Cookies'
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
            imageUrl: 'https://via.placeholder.com/300x200/AFEEEE/3b4a3f?text=White%20Widow'
        }
    ])

    // Filter seeds based on selected list and memberships
    const visibleSeeds = allSeeds.filter(seed => {
        const memberships = productListMemberships[seed.id] || []
        return memberships.includes(selectedListId)
    })

    const selectedList = userLists.find(list => list.id === selectedListId)
    const isCustomList = selectedListId !== 'defaultFavorites'

    const handleCreateNewList = () => {
        const trimmedName = newListName.trim()
        if (trimmedName) {
            const newListId = `list-${Date.now()}`
            const newList: UserList = {
                id: newListId,
                name: trimmedName
            }
            setUserLists(prev => [...prev, newList])
            setSelectedListId(newListId)
            setNewListName('')
        }
    }

    const handleListSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedListId(e.target.value)
    }

    const handleRenameList = (newName: string) => {
        setUserLists(prev =>
            prev.map(list =>
                list.id === selectedListId ? { ...list, name: newName } : list
            )
        )
    }

    const handleDuplicateList = () => {
        if (!selectedList) return

        const newListId = `list-${Date.now()}`
        const newListName = `${selectedList.name} (Copy)`

        setUserLists(prev => [...prev, { id: newListId, name: newListName }])
        setSelectedListId(newListId)
    }

    const handleClearList = () => {
        // In real app, this would remove seeds from backend
        // For now, we'll just filter out seeds from this list
    }

    const handleDeleteList = () => {
        if (selectedListId === 'defaultFavorites') return

        setUserLists(prev => prev.filter(list => list.id !== selectedListId))
        setSelectedListId('defaultFavorites')
        setIsDeleteListModalOpen(false)
    }

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

    const handleConfirmUnfavorite = () => {
        if (pendingUnfavoriteSeedId) {
            // Remove from favorites
            setFavorites(prev => {
                const newFavorites = new Set(prev)
                newFavorites.delete(pendingUnfavoriteSeedId)
                return newFavorites
            })

            // Remove from all lists
            setProductListMemberships(prev => {
                const updated = { ...prev }
                delete updated[pendingUnfavoriteSeedId]
                return updated
            })
        }
        setIsUnfavoriteModalOpen(false)
        setPendingUnfavoriteSeedId(null)
        setUnfavoriteMessage('')
    }

    const handleOpenAddToList = (seedId: string, seedName: string) => {
        setActiveModalSeedId(seedId)
        setActiveModalSeedName(seedName)
        setIsAddToListModalOpen(true)
    }

    const handleListMembershipChange = (listId: string, isChecked: boolean) => {
        if (!activeModalSeedId) return

        setProductListMemberships(prev => {
            const currentMemberships = prev[activeModalSeedId] || []
            let updatedMemberships: string[]

            if (isChecked) {
                updatedMemberships = currentMemberships.includes(listId)
                    ? currentMemberships
                    : [...currentMemberships, listId]
            } else {
                updatedMemberships = currentMemberships.filter(id => id !== listId)

                if (listId === 'defaultFavorites') {
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

        if (listId === 'defaultFavorites' && isChecked) {
            setFavorites(prev => {
                const newFavorites = new Set(prev)
                newFavorites.add(activeModalSeedId)
                return newFavorites
            })
        }
    }

    const handleCreateListFromModal = (listName: string) => {
        const newListId = `list-${Date.now()}`
        const newList: UserList = {
            id: newListId,
            name: listName
        }

        setUserLists(prev => [...prev, newList])

        if (activeModalSeedId) {
            setProductListMemberships(prev => ({
                ...prev,
                [activeModalSeedId]: [...(prev[activeModalSeedId] || []), newListId]
            }))
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCreateNewList()
        }
    }

    return (
        <main className="favorites-page-main">
            <div className="page-header">
                <h2 className=''
                >
                    My Favorites</h2>
                <p>Manage your saved seeds and organize them into custom lists.</p>
            </div>

            <section className="favorites-list-management">
                <div className="list-management__controls">
                    <div className="list-management__selector-group">
                        <label htmlFor="favoriteListSelect" className="list-management-label">
                            Current List:
                        </label>
                        <div id="currentListControlsContainer" className="list-management__selector-actions">
                            <select
                                id="favoriteListSelect"
                                className="inline-select"
                                value={selectedListId}
                                onChange={handleListSelectChange}
                            >
                                {userLists.map(list => (
                                    <option key={list.id} value={list.id}>
                                        {list.name}
                                    </option>
                                ))}
                            </select>
                            <div id="currentListActionsGroup" className="list-management__action-buttons">
                                <button
                                    id="listOptionsBtn"
                                    className={`list-create-btn ${!isCustomList ? 'disabled' : ''}`}
                                    style={{
                                        backgroundColor: 'var(--accent-cta)',
                                        color: 'var(--text-primary)',
                                        display: 'inline-flex'
                                    }}
                                    title="View more options for this list"
                                    onClick={() => setIsManageListModalOpen(true)}
                                    disabled={!isCustomList}
                                    type="button"
                                >
                                    Options
                                </button>
                                <button
                                    id="deleteCurrentListBtn"
                                    className="list-delete-btn"
                                    title="Delete the currently selected list"
                                    style={{ display: isCustomList ? 'inline-flex' : 'none' }}
                                    onClick={() => setIsDeleteListModalOpen(true)}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="list-management__create-group create-list-container">
                        <label htmlFor="newListName" className="list-management-label">
                            Create New List:
                        </label>
                        <div className="list-management__create-form">
                            <input
                                type="text"
                                id="newListName"
                                placeholder="New list name"
                                className="list-create-input"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button
                                id="createNewListBtn"
                                className="list-create-btn"
                                onClick={handleCreateNewList}
                                type="button"
                            >
                                Create
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
                        onOpenAddToList={handleOpenAddToList}
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
            <ManageListModal
                isOpen={isManageListModalOpen}
                listName={selectedList?.name || ''}
                onClose={() => setIsManageListModalOpen(false)}
                onRename={handleRenameList}
                onDuplicate={handleDuplicateList}
                onClear={handleClearList}
            />

            <DeleteListConfirmModal
                isOpen={isDeleteListModalOpen}
                listName={selectedList?.name || ''}
                onCancel={() => setIsDeleteListModalOpen(false)}
                onConfirm={handleDeleteList}
            />

            <AddToListModal
                isOpen={isAddToListModalOpen}
                strainName={activeModalSeedName}
                productId={activeModalSeedId || ''}
                userLists={userLists}
                productListMemberships={activeModalSeedId ? (productListMemberships[activeModalSeedId] || []) : []}
                onClose={() => {
                    setIsAddToListModalOpen(false)
                    setActiveModalSeedId(null)
                    setActiveModalSeedName('')
                }}
                onMembershipChange={handleListMembershipChange}
                onCreateNewList={handleCreateListFromModal}
            />

            <UnfavoriteConfirmModal
                isOpen={isUnfavoriteModalOpen}
                message={unfavoriteMessage}
                onCancel={() => {
                    setIsUnfavoriteModalOpen(false)
                    setPendingUnfavoriteSeedId(null)
                    setUnfavoriteMessage('')
                }}
                onConfirm={handleConfirmUnfavorite}
            />
        </main>
    )
}

export default FavouritePage
