'use client'

import { useEffect } from 'react'

interface DeleteListConfirmModalProps {
    isOpen: boolean
    listName: string
    onCancel: () => void
    onConfirm: () => void
}

const DeleteListConfirmModal = ({
    isOpen,
    listName,
    onCancel,
    onConfirm
}: DeleteListConfirmModalProps) => {
    useEffect(() => {
        if (!isOpen) return

        const handleEnterKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                onConfirm()
            }
        }

        document.addEventListener('keydown', handleEnterKey)
        return () => document.removeEventListener('keydown', handleEnterKey)
    }, [isOpen, onConfirm])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCancel()
        }
    }

    return (
        <div
            className={`modal-styled ${isOpen ? '' : 'hidden'}`}
            id="deleteListConfirmModal"
            onClick={handleOverlayClick}
        >
            <div className="modal-content-styled">
                <h3>DELETE LIST</h3>
                <p
                    id="deleteListConfirmMessage"
                    style={{ lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{
                        __html: `Are you sure you want to permanently delete the list "<strong>${listName}</strong>"? This also removes all seeds from it. This action cannot be undone.`
                    }}
                />
                <div className="modal-actions">
                    <button
                        id="cancelDeleteListBtn"
                        className="btn-styled ghost"
                        onClick={onCancel}
                        type="button"
                    >
                        CANCEL
                    </button>
                    <button
                        id="confirmDeleteListBtn"
                        className="btn-styled danger"
                        onClick={onConfirm}
                        type="button"
                    >
                        CONFIRM DELETE
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteListConfirmModal
