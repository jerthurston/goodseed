'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton'
import styles from '../../../app/dashboard/(components)/dashboardAdmin.module.css'
import { validateSellerData } from '@/schemas/seller.schema'
import api from '@/lib/api'
import { toast } from 'sonner'
import { SellerUI } from '@/types/seller.type'
import ActionConfirmModal from './ActionConfirmModal'

interface UpdateSellerModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdateSuccess?: () => void
    sellerId: string | null
}

interface SellerFormData {
    name: string
    url: string
    scrapingSourceUrl: string
    isActive: boolean
    affiliateTag?: string
}

interface ValidationErrors {
    [key: string]: string
}

const UpdateSellerModal: React.FC<UpdateSellerModalProps> = ({ 
    isOpen, 
    onClose, 
    onUpdateSuccess,
    sellerId
}) => {
    const [formData, setFormData] = useState<SellerFormData>({
        name: '',
        url: '',
        scrapingSourceUrl: '',
        isActive: true,
        affiliateTag: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({})
    const [seller, setSeller] = useState<any>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pendingFormData, setPendingFormData] = useState<SellerFormData | null>(null)

    // Fetch seller data when sellerId changes
    useEffect(() => {
        const fetchSeller = async () => {
            if (sellerId && isOpen) {
                setIsLoading(true)
                try {
                    const response = await api.get(`/admin/sellers/${sellerId}`)
                    const sellerData = response.data
                    setSeller(sellerData)
                    
                    // Pre-fill form data
                    setFormData({
                        name: sellerData.name || '',
                        url: sellerData.url || '',
                        // Handle scrapingSourceUrl - convert from array to string for form input
                        scrapingSourceUrl: Array.isArray(sellerData.scrapingSourceUrl) 
                            ? sellerData.scrapingSourceUrl[0] || '' 
                            : sellerData.scrapingSourceUrl || '',
                        isActive: sellerData.isActive ?? true,
                        affiliateTag: sellerData.affiliateTag || ''
                    })
                } catch (err) {
                    console.error('Failed to fetch seller:', err)
                    toast.error('Failed to Load Seller', {
                        description: 'Could not load seller data for editing',
                        duration: 4000,
                    })
                } finally {
                    setIsLoading(false)
                }
            }
        }

        fetchSeller()
    }, [sellerId, isOpen])

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setError(null)
            setFieldErrors({})
            setSeller(null)
            setShowConfirmModal(false)
            setPendingFormData(null)
            setFormData({
                name: '',
                url: '',
                scrapingSourceUrl: '',
                isActive: true,
                affiliateTag: ''
            })
        }
    }, [isOpen])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
        
        // Clear field error when user starts typing
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sellerId) return

        setError(null)
        setFieldErrors({})

        // Client-side validation first
        const validation = validateSellerData(formData)
        
        if (!validation.success) {
            setFieldErrors(validation.error.fields)
            setError('Please fix the validation errors below')
            return
        }

        // Show confirmation modal before proceeding
        setPendingFormData(formData)
        setShowConfirmModal(true)
    }

    const handleConfirmUpdate = async () => {
        if (!sellerId || !pendingFormData) return

        setIsSubmitting(true)
        setShowConfirmModal(false)

        try {
            // Call API to update seller using axios api instance
            const response = await api.put(`/admin/sellers/${sellerId}`, pendingFormData)

            console.log('Seller updated successfully:', response.data)

            // Show success toast
            toast.success('Seller Updated Successfully', {
                description: `${pendingFormData.name} has been updated`,
                duration: 4000,
            })

            // Call success callback
            if (onUpdateSuccess) {
                onUpdateSuccess()
            }
            
            onClose()
        } catch (err: any) {
            // Handle axios error responses
            if (err.response?.data) {
                const errorData = err.response.data
                // Handle server validation errors
                if (errorData.fields) {
                    setFieldErrors(errorData.fields)
                }
                const errorMessage = errorData.error || 'Failed to update seller'
                setError(errorMessage)
                
                // Show error toast
                toast.error('Failed to Update Seller', {
                    description: errorMessage,
                    duration: 5000,
                })
            } else {
                const errorMessage = err.message || 'Failed to update seller'
                setError(errorMessage)
                
                // Show error toast
                toast.error('Network Error', {
                    description: errorMessage,
                    duration: 5000,
                })
            }
        } finally {
            setIsSubmitting(false)
            setPendingFormData(null)
        }
    }

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div 
            className={styles.modalOverlay}
            onClick={handleOverlayClick}
        >
            <div className={styles.modalContent}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        Update Seller
                    </h2>
                    <button
                        onClick={onClose}
                        className={styles.modalCloseButton}
                    >
                        ×
                    </button>
                </div>

                {isLoading ? (
                    <div className={styles.modalBody}>
                        <div className={`${styles.alert} ${styles.info}`}>
                            <div className={styles.content}>
                                <div className={styles.message}>Loading seller data...</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.modalBody}>
                            {/* Error Message */}
                            {error && (
                                <div className={`${styles.alert} ${styles.critical}`}>
                                    <div className={styles.content}>
                                        <div className={styles.message}>{error}</div>
                                    </div>
                                </div>
                            )}

                        {/* Seller Name */}
                        <div className={styles.formGroup}>
                            <label 
                                htmlFor="name" 
                                className={styles.formLabel}
                            >
                                Seller Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className={styles.formInput}
                                placeholder="e.g., Vancouver Seed Bank"
                                disabled={isSubmitting}
                            />
                            {fieldErrors.name && (
                                <p className={styles.formError}>{fieldErrors.name}</p>
                            )}
                        </div>

                        {/* Website URL */}
                        <div className={styles.formGroup}>
                            <label 
                                htmlFor="url" 
                                className={styles.formLabel}
                            >
                                Website URL *
                            </label>
                            <input
                                type="url"
                                id="url"
                                name="url"
                                value={formData.url}
                                onChange={handleInputChange}
                                required
                                className={styles.formInput}
                                placeholder="https://example.com"
                                disabled={isSubmitting}
                            />
                            {fieldErrors.url && (
                                <p className={styles.formError}>{fieldErrors.url}</p>
                            )}
                        </div>

                        {/* Scraping Source URL */}
                        <div className={styles.formGroup}>
                            <label 
                                htmlFor="scrapingSourceUrl" 
                                className={styles.formLabel}
                            >
                                Scraping Source URL *
                            </label>
                            <input
                                type="url"
                                id="scrapingSourceUrl"
                                name="scrapingSourceUrl"
                                value={formData.scrapingSourceUrl}
                                onChange={handleInputChange}
                                required
                                className={styles.formInput}
                                placeholder="https://example.com/products"
                                disabled={isSubmitting}
                            />
                            {fieldErrors.scrapingSourceUrl && (
                                <p className={styles.formError}>{fieldErrors.scrapingSourceUrl}</p>
                            )}
                            <p className={styles.formError} style={{ color: 'var(--text-primary-muted)', textTransform: 'none' }}>
                                The URL where products are listed for scraping
                            </p>
                        </div>

                        {/* Affiliate Tag */}
                        <div className={styles.formGroup}>
                            <label 
                                htmlFor="affiliateTag" 
                                className={styles.formLabel}
                            >
                                Affiliate Tag (Optional)
                            </label>
                            <input
                                type="text"
                                id="affiliateTag"
                                name="affiliateTag"
                                value={formData.affiliateTag || ''}
                                onChange={handleInputChange}
                                className={styles.formInput}
                                placeholder="e.g., goodseed123"
                                disabled={isSubmitting}
                            />
                            {fieldErrors.affiliateTag && (
                                <p className={styles.formError}>{fieldErrors.affiliateTag}</p>
                            )}
                            <p className={styles.formError} style={{ color: 'var(--text-primary-muted)', textTransform: 'none' }}>
                                Affiliate tag for commission tracking (optional)
                            </p>
                        </div>

                        {/* Active Status */}
                        <div className={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                id="isActive"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleInputChange}
                                className={`${styles.toggle} ${formData.isActive ? styles.toggleActive : ''}`}
                                disabled={isSubmitting}
                            />
                            <label htmlFor="isActive" className={styles.toggleLabel}>
                                Active (enable scraping)
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.modalFooter}>
                        <DashboardButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </DashboardButton>
                        <DashboardButton
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting || !formData.name || !formData.url || !formData.scrapingSourceUrl}
                            style={{ flex: 1 }}
                        >
                            {isSubmitting ? 'Updating...' : 'Update Seller'}
                        </DashboardButton>
                    </div>
                </form>
                )}
            </div>

            {/* Action Confirmation Modal */}
            <ActionConfirmModal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false)
                    setPendingFormData(null)
                }}
                onConfirm={handleConfirmUpdate}
                actionType="update"
                sellerName={seller?.name || 'Unknown Seller'}
                isLoading={isSubmitting}
            />
        </div>
    )
}

export default UpdateSellerModal