'use client'

import { WishlistFolderUI } from '@/types/wishlist-folder.type'
import { useEffect, useState } from 'react'

interface AddToFolderModalProps {
    isOpen: boolean
    strainName: string
    activeModalSeedId: string
    wishlistFolders: WishlistFolderUI[]
    productFolderMemberships: string[] // Array of folder IDs this product belongs to
    onClose: () => void
    onMembershipChange: (folderId: string, isChecked: boolean) => void
    onCreateNewFolder: (folderName: string) => void
}

const AddToFolderModal = ({
    isOpen,
    strainName,
    activeModalSeedId,
    wishlistFolders,
    productFolderMemberships,
    onClose,
    onMembershipChange,
    onCreateNewFolder
}: AddToFolderModalProps) => {
    const [newFolderName, setNewFolderName] = useState('')

    // LOG DEBUG:
    useEffect(() => {
        console.debug("AddToFolderModal rendered", {
            isOpen,
            strainName,
            activeModalSeedId,
            wishlistFolders,
            productFolderMemberships
        })
    }, [isOpen, strainName, activeModalSeedId, wishlistFolders, productFolderMemberships])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const handleCreateFolder = () => {
        const trimmedName = newFolderName.trim()
        if (trimmedName) {
            onCreateNewFolder(trimmedName)
            setNewFolderName('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCreateFolder()
        }
    }

    

    return (
        <div
            className={`add-to-list-overlay ${isOpen ? 'active' : ''}`}
            id="addToListModal"
            onClick={handleOverlayClick}
        >
            <div className="add-to-list-content">
                <button
                    type="button"
                    className="add-to-list-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    &times;
                </button>

                <h2 className="add-to-list-title">
                    Add <span id="modalStrainName">{strainName}</span> To...
                </h2>

                <div className="add-to-list-scroll-container">
                    <ul className="list-manager-ul" id="listManagerCheckboxContainer">
                        {wishlistFolders.length === 0 ? (
                            <li style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                                No folders yet. Create one below!
                            </li>
                        ) : (
                            wishlistFolders.map((folder) => {
                                const checkboxId = `list-check-${activeModalSeedId}-${folder.id}`
                                const isChecked = productFolderMemberships.includes(folder.id)

                                return (
                                    <li key={folder.id} className="list-manager-item">
                                        <input
                                            type="checkbox"
                                            id={checkboxId}
                                            data-list-id={folder.id}
                                            checked={isChecked}
                                            onChange={(e) => onMembershipChange(folder.id, e.target.checked)}
                                        />
                                        <label htmlFor={checkboxId}>{folder.name}</label>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>

                <div className="add-to-list-divider"></div>

                <div className="add-to-list-create-section">
                    <p className="list-management-label">Create New Folder:</p>
                    <form
                        className="add-to-list-create-form"
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleCreateFolder()
                        }}
                    >

                        <input
                            type="text"
                            className="list-create-input form-control"
                            placeholder="New folder name..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            type="button"
                            className="list-create-btn btn-styled primary"
                            onClick={handleCreateFolder}
                            disabled={!newFolderName.trim()}
                        >
                            Create
                        </button>
                    </form>
                </div>
                {/* <div className="add-to-list-actions">
                    <button type="button" className="btn-styled primary" onClick={onClose}>
                        Done
                    </button>
                </div> */}
            </div>
        </div>
    )
}

export default AddToFolderModal
