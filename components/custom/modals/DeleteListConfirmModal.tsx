'use client'

import { useEffect } from 'react'

interface DeleteListConfirmModalProps {
    isOpen: boolean
    listName: string
    onCancel: () => void
    onConfirm: () => void
    title?: string
    customMessage?: string
    isDeleting?: boolean
}

const DeleteListConfirmModal = ({
    isOpen,
    listName,
    onCancel,
    onConfirm,
    title = "DELETE LIST",
    customMessage,
    isDeleting = false
}: DeleteListConfirmModalProps) => {
    useEffect(() => {
        if (!isOpen) return

        const handleEnterKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !isDeleting) {
                e.preventDefault()
                onConfirm()
            }
            if (e.key === 'Escape' && !isDeleting) {
                e.preventDefault()
                onCancel()
            }
        }

        // Prevent body scroll when modal is open
        document.body.classList.add('modal-open')
        document.addEventListener('keydown', handleEnterKey)
        
        return () => {
            document.body.classList.remove('modal-open')
            document.removeEventListener('keydown', handleEnterKey)
        }
    }, [isOpen, onConfirm, onCancel, isDeleting])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isDeleting) {
            onCancel()
        }
    }

    // Generate message
    const defaultMessage = `Are you sure you want to permanently delete the list "<strong>${listName}</strong>"? This also removes all seeds from it. This action cannot be undone.`
    const displayMessage = customMessage || defaultMessage

    return (
        <div
            className={`modal-styled ${isOpen ? '' : 'hidden'}`}
            id="deleteListConfirmModal"
            onClick={handleOverlayClick}
        >
            <div className="modal-content-styled">
                <h3>{title}</h3>
                <p
                    id="deleteListConfirmMessage"
                    style={{ lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{
                        __html: displayMessage
                    }}
                />
                <div className="modal-actions">
                    <button
                        id="cancelDeleteListBtn"
                        className="btn-styled ghost"
                        onClick={onCancel}
                        disabled={isDeleting}
                        type="button"
                    >
                        CANCEL
                    </button>
                    <button
                        id="confirmDeleteListBtn"
                        className="btn-styled danger"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        type="button"
                    >
                        {isDeleting ? 'DELETING...' : 'CONFIRM DELETE'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteListConfirmModal
