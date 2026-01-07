'use client'

import { useEffect } from 'react'

interface SignOutModalProps {
    isOpen: boolean
    onCancel: () => void
    onConfirm: () => void
}

const SignOutModal = ({ isOpen, onCancel, onConfirm }: SignOutModalProps) => {
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
            id="sign-out-confirm-modal"
            onClick={handleOverlayClick}
        >
            <div className="modal-content-styled">
                <h3>Are you sure?</h3>
                <p>
                    This action will sign you out of your account.
                </p>
                <div className="modal-actions">
                    <button
                        id="cancel-sign-out-btn"
                        className="btn-styled ghost"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        id="confirm-sign-out-btn"
                        className="btn-styled danger"
                        onClick={onConfirm}
                        type="button"
                    >
                        Yes, Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SignOutModal
