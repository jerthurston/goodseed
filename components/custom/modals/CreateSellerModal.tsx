'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton'
import styles from '../../../app/dashboard/(components)/dashboardAdmin.module.css'
import { validateSellerData } from '@/schemas/seller.schema'
import api from '@/lib/api'
import { toast } from 'sonner'

interface CreateSellerModalProps {
    isOpen: boolean
    onClose: () => void
    onCreateSuccess?: () => void
}

interface SellerFormData {
    name: string
    url: string
    isActive: boolean
    affiliateTag?: string
}

interface ValidationErrors {
    [key: string]: string
}

const CreateSellerModal: React.FC<CreateSellerModalProps> = ({ 
    isOpen, 
    onClose, 
    onCreateSuccess 
}) => {
    const [formData, setFormData] = useState<SellerFormData>({
        name: '',
        url: '',
        isActive: true,
        affiliateTag: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({})

    // Prevent body scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open')
        } else {
            document.body.classList.remove('modal-open')
        }

        // Cleanup function to remove class when component unmounts
        return () => {
            document.body.classList.remove('modal-open')
        }
    }, [isOpen])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        let parsedValue: any = value
        
        if (type === 'checkbox') {
            parsedValue = checked
        } else if (type === 'number') {
            parsedValue = value ? parseInt(value, 10) : undefined
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: parsedValue
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
        setError(null)
        setFieldErrors({})
        setIsSubmitting(true)

        // Client-side validation first
        const validation = validateSellerData(formData)
        
        if (!validation.success) {
            setFieldErrors(validation.error.fields)
            setError('Please fix the validation errors below')
            setIsSubmitting(false)
            return
        }

        try {
            // Call API to create seller using axios api instance
            const response = await api.post('/admin/sellers', formData)

            console.log('Seller created successfully:', response.data)

            // Show success toast
            toast.success('Seller Created Successfully', {
                description: `${formData.name} has been added to the system`,
                duration: 4000,
            })

            // Reset form
            setFormData({
                name: '',
                url: '',
                isActive: true,
                affiliateTag: ''
            })
            
            // Call success callback
            if (onCreateSuccess) {
                onCreateSuccess()
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
                const errorMessage = errorData.error || 'Failed to create seller'
                setError(errorMessage)
                
                // Show error toast
                toast.error('Failed to Create Seller', {
                    description: errorMessage,
                    duration: 5000,
                })
            } else {
                const errorMessage = err.message || 'Failed to create seller'
                setError(errorMessage)
                
                // Show error toast
                toast.error('Network Error', {
                    description: errorMessage,
                    duration: 5000,
                })
            }
        } finally {
            setIsSubmitting(false)
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
                        Create New Seller
                    </h2>
                    <button
                        onClick={onClose}
                        className={styles.modalCloseButton}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        {/* Info Message */}
                        <div className={`${styles.alert} ${styles.info}`}>
                            <div className={styles.icon}>
                                <FontAwesomeIcon icon={faInfoCircle} />
                            </div>
                            <div className={styles.content}>
                                <div className={styles.message}>
                                    <strong>Note:</strong> After creating the seller, you can add scraping sources in the seller detail page to configure data collection.
                                </div>
                            </div>
                        </div>

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
                            disabled={isSubmitting || !formData.name || !formData.url}
                            style={{ flex: 1 }}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Seller'}
                        </DashboardButton>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CreateSellerModal