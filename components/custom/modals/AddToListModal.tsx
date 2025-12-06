'use client'

import { useState } from 'react'

export interface UserList {
    id: string
    name: string
}

interface AddToListModalProps {
    isOpen: boolean
    strainName: string
    productId: string
    userLists: UserList[]
    productListMemberships: string[] // Array of list IDs this product belongs to
    onClose: () => void
    onMembershipChange: (listId: string, isChecked: boolean) => void
    onCreateNewList: (listName: string) => void
}

const AddToListModal = ({
    isOpen,
    strainName,
    productId,
    userLists,
    productListMemberships,
    onClose,
    onMembershipChange,
    onCreateNewList
}: AddToListModalProps) => {
    const [newListName, setNewListName] = useState('')

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const handleCreateList = () => {
        const trimmedName = newListName.trim()
        if (trimmedName) {
            onCreateNewList(trimmedName)
            setNewListName('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCreateList()
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
                        {userLists.length === 0 ? (
                            <li style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                                No lists yet. Create one below!
                            </li>
                        ) : (
                            userLists.map((list) => {
                                const checkboxId = `list-check-${productId}-${list.id}`
                                const isChecked = productListMemberships.includes(list.id)

                                return (
                                    <li key={list.id} className="list-manager-item">
                                        <input
                                            type="checkbox"
                                            id={checkboxId}
                                            data-list-id={list.id}
                                            checked={isChecked}
                                            onChange={(e) => onMembershipChange(list.id, e.target.checked)}
                                        />
                                        <label htmlFor={checkboxId}>{list.name}</label>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>

                <div className="add-to-list-divider"></div>

                <div className="add-to-list-create-section">
                    <p className="list-management-label">Create New List:</p>
                    <form
                        className="add-to-list-create-form"
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleCreateList()
                        }}
                    >

                        <input
                            type="text"
                            className="list-create-input form-control"
                            placeholder="New list name..."
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            type="button"
                            className="list-create-btn btn-styled primary"
                            onClick={handleCreateList}
                            disabled={!newListName.trim()}
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

export default AddToListModal
