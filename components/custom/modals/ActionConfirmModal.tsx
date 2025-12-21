'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, Trash2, Edit } from 'lucide-react'
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton'
import styles from '../../../app/dashboard/(components)/dashboardAdmin.module.css'

export type ActionType = 'update' | 'delete'

interface ActionConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    actionType: ActionType
    sellerName?: string
    isLoading?: boolean
}

const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    actionType,
    sellerName = 'this seller',
    isLoading = false
}) => {
    if (!isOpen) return null

    const getActionConfig = () => {
        switch (actionType) {
            case 'update':
                return {
                    icon: <Edit className="w-6 h-6" />,
                    title: 'Confirm Update',
                    message: `Are you sure you want to update "${sellerName}"?`,
                    description: 'This will modify the seller information. You can always edit it again later.',
                    confirmText: isLoading ? 'Updating...' : 'Yes, Update',
                    confirmVariant: 'primary' as const,
                    alertVariant: 'info' as const
                }
            case 'delete':
                return {
                    icon: <Trash2 className="w-6 h-6" />,
                    title: 'Confirm Delete',
                    message: `Are you sure you want to delete "${sellerName}"?`,
                    description: 'This action cannot be undone. All associated data including scrape logs and products will be permanently removed.',
                    confirmText: isLoading ? 'Deleting...' : 'Yes, Delete',
                    confirmVariant: 'danger' as const,
                    alertVariant: 'critical' as const
                }
            default:
                return {
                    icon: <AlertTriangle className="w-6 h-6" />,
                    title: 'Confirm Action',
                    message: 'Are you sure you want to proceed?',
                    description: 'Please confirm your action.',
                    confirmText: isLoading ? 'Processing...' : 'Yes, Proceed',
                    confirmVariant: 'primary' as const,
                    alertVariant: 'warning' as const
                }
        }
    }

    const config = getActionConfig()

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose()
        }
    }

    const handleConfirm = () => {
        if (!isLoading) {
            onConfirm()
        }
    }

    const handleClose = () => {
        if (!isLoading) {
            onClose()
        }
    }

    return (
        <div 
            className={styles.modalOverlay}
            onClick={handleOverlayClick}
        >
            <div className={styles.modalContent} style={{ maxWidth: '28rem' }}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${actionType === 'delete' ? 'bg-red-100' : 'bg-blue-100'}`}>
                            {config.icon}
                        </div>
                        <h2 className={styles.modalTitle}>
                            {config.title}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className={styles.modalCloseButton}
                        disabled={isLoading}
                    >
                        ×
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Alert Message */}
                    <div className={`${styles.alert} ${styles[config.alertVariant]}`}>
                        <div className={styles.icon}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className={styles.content}>
                            <div className={styles.title}>
                                {config.message}
                            </div>
                            <div className={styles.message}>
                                {config.description}
                            </div>
                        </div>
                    </div>

                    {/* Seller Information Display */}
                    {sellerName !== 'this seller' && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                Seller Information
                            </label>
                            <div className={`${styles.formInput} ${styles.readOnly}`} style={{ 
                                backgroundColor: 'var(--bg-section)', 
                                cursor: 'default',
                                color: 'var(--text-primary-muted)'
                            }}>
                                <strong>{sellerName}</strong>
                            </div>
                        </div>
                    )}

                    {/* Additional Warning for Delete */}
                    {actionType === 'delete' && (
                        <div className={`${styles.alert} ${styles.critical}`} style={{ marginTop: '1rem' }}>
                            <div className={styles.icon}>
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className={styles.content}>
                                <div className={styles.title}>
                                    Permanent Action Warning
                                </div>
                                <div className={styles.message}>
                                    This will permanently remove:
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                                        <li>• Seller profile and settings</li>
                                        <li>• All scraping history and logs</li>
                                        <li>• Associated product categories</li>
                                        <li>• All scraped product data</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.modalFooter}>
                    <DashboardButton
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                        style={{ flex: 1 }}
                    >
                        No, Cancel
                    </DashboardButton>
                    <DashboardButton
                        type="button"
                        variant={config.confirmVariant}
                        onClick={handleConfirm}
                        disabled={isLoading}
                        style={{ flex: 1 }}
                    >
                        {config.confirmText}
                    </DashboardButton>
                </div>
            </div>
        </div>
    )
}

export default ActionConfirmModal
