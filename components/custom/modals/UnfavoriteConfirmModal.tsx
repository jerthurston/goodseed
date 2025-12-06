'use client'

interface UnfavoriteConfirmModalProps {
    isOpen: boolean
    message: string
    onCancel: () => void
    onConfirm: () => void
}

const UnfavoriteConfirmModal = ({
    isOpen,
    message,
    onCancel,
    onConfirm
}: UnfavoriteConfirmModalProps) => {
    if (!isOpen) return null

    return (
        <div className={`modal-styled ${isOpen ? '' : 'hidden'}`} id="unfavoriteConfirmModal">
            <div className="modal-content-styled">
                <h3>Remove From Lists?</h3>
                <p id="unfavoriteConfirmMessage">{message}</p>
                <div className="modal-actions">
                    <button className="btn-styled ghost" onClick={onCancel} type="button">
                        Cancel
                    </button>
                    <button className="btn-styled danger" onClick={onConfirm} type="button">
                        Remove From All
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UnfavoriteConfirmModal
