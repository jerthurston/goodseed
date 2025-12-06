'use client'

import { faCopy, faEraser, faPencilAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'

type ModalView = 'main' | 'rename' | 'clearConfirm'

interface ManageListModalProps {
    isOpen: boolean
    listName: string
    onClose: () => void
    onRename: (newName: string) => void
    onDuplicate: () => void
    onClear: () => void
}

const ManageListModal = ({
    isOpen,
    listName,
    onClose,
    onRename,
    onDuplicate,
    onClear
}: ManageListModalProps) => {
    const [currentView, setCurrentView] = useState<ModalView>('main')
    const [newListName, setNewListName] = useState(listName)

    // Update newListName when listName prop changes
    if (listName !== newListName && !isOpen) {
        setNewListName(listName)
    }

    // Reset to main view when closed
    if (!isOpen && currentView !== 'main') {
        setCurrentView('main')
    }

    const handleSaveRename = () => {
        const trimmedName = newListName.trim()
        if (trimmedName) {
            onRename(trimmedName)
            onClose()
        }
    }

    const handleConfirmClear = () => {
        onClear()
        onClose()
    }

    useEffect(() => {
        if (!isOpen) return

        const handleEnterKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && currentView === 'rename') {
                e.preventDefault()
                const trimmedName = newListName.trim()
                if (trimmedName) {
                    onRename(trimmedName)
                    onClose()
                }
            } else if (e.key === 'Enter' && currentView === 'clearConfirm') {
                e.preventDefault()
                onClear()
                onClose()
            }
        }

        document.addEventListener('keydown', handleEnterKey)
        return () => document.removeEventListener('keydown', handleEnterKey)
    }, [isOpen, currentView, newListName, onRename, onClear, onClose])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const getTitle = () => {
        switch (currentView) {
            case 'rename':
                return 'RENAME LIST'
            case 'clearConfirm':
                return 'CLEAR LIST'
            default:
                return `MANAGE "${listName}"`
        }
    }

    return (
        <div
            className={`modal-styled ${isOpen ? '' : 'hidden'}`}
            id="manageListModal"
            onClick={handleOverlayClick}
        >
            <div className="modal-content-styled">
                <h3 id="manageListModalTitle">{getTitle()}</h3>

                {currentView === 'rename' && (
                    <div id="renameListSection">
                        <p className="modal-form-prompt" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
                            Enter new name for this list:
                        </p>
                        <input
                            type="text"
                            id="manageListNewNameInput"
                            placeholder="New list name"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            autoFocus
                        />
                        <div id="renameListActions" className="modal-actions">
                            <button
                                className="btn-styled ghost"
                                onClick={() => setCurrentView('main')}
                                type="button"
                            >
                                CANCEL
                            </button>
                            <button
                                className="btn-styled secondary"
                                onClick={handleSaveRename}
                                type="button"
                            >
                                SAVE NAME
                            </button>
                        </div>
                    </div>
                )}

                {currentView === 'clearConfirm' && (
                    <div id="clearListConfirmSection">
                        <p
                            id="clearListConfirmMessage"
                            style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{
                                __html: `Are you sure you want to clear all seeds from "<strong>${listName}</strong>"?`
                            }}
                        />
                        <div id="clearListConfirmActions" className="modal-actions">
                            <button
                                className="btn-styled ghost"
                                onClick={() => setCurrentView('main')}
                                type="button"
                            >
                                CANCEL
                            </button>
                            <button
                                className="btn-styled danger"
                                onClick={handleConfirmClear}
                                type="button"
                            >
                                CONFIRM CLEAR
                            </button>
                        </div>
                    </div>
                )}

                {currentView === 'main' && (
                    <>
                        <div id="manageListModalActionsContainer">
                            <button
                                className="btn-styled ghost"
                                onClick={() => setCurrentView('rename')}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faPencilAlt} /> Rename List
                            </button>
                            <button
                                className="btn-styled ghost"
                                onClick={() => {
                                    onDuplicate()
                                    onClose()
                                }}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faCopy} /> Duplicate List
                            </button>
                            <button
                                className="btn-styled ghost"
                                onClick={() => setCurrentView('clearConfirm')}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faEraser} /> Clear All Seeds
                            </button>
                        </div>
                        <div className="modal-actions">
                            <button
                                id="closeManageListModal"
                                className="btn-styled ghost"
                                onClick={onClose}
                                type="button"
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default ManageListModal
