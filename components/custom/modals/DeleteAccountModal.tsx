'use client'

import { useEffect } from 'react'

interface DeleteAccountModalProps {
    isOpen: boolean
    onCancel: () => void
    onConfirm: () => void
}

const DeleteAccountModal = ({ isOpen, onCancel, onConfirm }: DeleteAccountModalProps) => {
    useEffect(() => {
        if (!isOpen) return

        const handleEnterKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel()
            }
        }

        document.addEventListener('keydown', handleEnterKey)
        return () => document.removeEventListener('keydown', handleEnterKey)
    }, [isOpen, onCancel])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCancel()
        }
    }

    return (
        <div
            className={`modal-styled ${isOpen ? '' : 'hidden'}`}
            id="delete-confirm-modal"
            onClick={handleOverlayClick}
        >
            <div className="modal-content-styled">
                <h3>Are you sure?</h3>
                <p>
                    This action is irreversible. All your data, including your saved favorites and
                    custom lists, will be permanently deleted. This cannot be undone.
                </p>
                <div className="modal-actions">
                    <button
                        id="cancel-delete-btn"
                        className="btn-styled ghost"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        id="confirm-delete-btn"
                        className="btn-styled danger"
                        onClick={onConfirm}
                        type="button"
                    >
                        Yes, Delete My Account
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteAccountModal
