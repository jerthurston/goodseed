'use client'

import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle, faPlus, faEdit, faTrash, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton'
import styles from '../../../app/dashboard/(components)/dashboardAdmin.module.css'
import { scrapingSourceSchema } from '@/schemas/seller.schema'
import { toast } from 'sonner'
import type { ScrapingSourceInput } from '@/schemas/seller.schema'
import { useScrapingSources, useCreateScrapingSource, useDeleteScrapingSource, useUpdateScrapingSource } from '@/hooks/scraping-sources/useScrapingSources'
import { transformScrapingSourceForAPI } from '@/lib/transfomers/scraping-source.transformer'
import { extractScrapingSourceName } from '@/lib/utils/scraping-source.utils'
import type { ScrapingSource, CreateScrapingSourceData } from '@/lib/services/scraping-sources/scraping-source.service'
import DeleteListConfirmModal from './DeleteListConfirmModal'
import { apiLogger } from '@/lib/helpers/api-logger'

interface ManageScrapingSourcesModalProps {
    isOpen: boolean
    onClose: () => void
    sellerId: string | null
    sellerName?: string
    onUpdateSuccess?: () => void
}

interface ScrapingSourceFormData {
    scrapingSourceUrl: string
    maxPage: number
}

interface ValidationErrors {
    [key: string]: string
}

// Remove interface since we're using the service type

// ScrapingSourceItem component for inline editing
interface ScrapingSourceItemProps {
    source: ScrapingSource
    isEditing: boolean
    isUpdating: boolean
    isDeleting: boolean
    onEdit: () => void
    onSave: (newUrl: string, newMaxPage: number) => void
    onCancel: () => void
    onDelete: () => void
}

const ScrapingSourceItem: React.FC<ScrapingSourceItemProps> = ({
    source,
    isEditing,
    isUpdating,
    isDeleting,
    onEdit,
    onSave,
    onCancel,
    onDelete
}) => {
    const [editUrl, setEditUrl] = useState(source.scrapingSourceUrl)
    const [editMaxPage, setEditMaxPage] = useState(source.maxPage)

    // Reset form when entering edit mode
    useEffect(() => {
        if (isEditing) {
            setEditUrl(source.scrapingSourceUrl)
            setEditMaxPage(source.maxPage)
        }
    }, [isEditing, source.scrapingSourceUrl, source.maxPage])

    const handleSave = () => {
        onSave(editUrl, editMaxPage)
    }

    const previewName = extractScrapingSourceName(editUrl)

    if (isEditing) {
        return (
            <div className="bg-(--bg-section) border-2 border-(--brand-primary) p-4">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-(--text-primary) mb-2">
                            Scraping Source URL
                        </label>
                        <input
                            type="url"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-(--border-color) bg-(--bg-main) text-(--text-primary) rounded focus:outline-none focus:border-(--brand-primary)"
                            placeholder="https://example.com/products"
                            disabled={isUpdating}
                        />
                        {editUrl && (
                            <p className="mt-1 text-sm text-(--text-primary-muted)">
                                Preview name: <span className="font-semibold">{previewName}</span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-(--text-primary) mb-2">
                            Max Page (optional)
                        </label>
                        <input
                            type="number"
                            value={editMaxPage}
                            onChange={(e) => setEditMaxPage(parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full px-3 py-2 border border-(--border-color) bg-(--bg-main) text-(--text-primary) rounded focus:outline-none focus:border-(--brand-primary)"
                            disabled={isUpdating}
                        />
                    </div>

                    <div className="flex gap-2">
                        <DashboardButton
                            variant="primary"
                            onClick={handleSave}
                            disabled={isUpdating || !editUrl.trim()}
                            className="flex items-center gap-2"
                        >
                            {isUpdating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Updating...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </DashboardButton>
                        <DashboardButton
                            variant="outline"
                            onClick={onCancel}
                            disabled={isUpdating}
                        >
                            Cancel
                        </DashboardButton>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-(--bg-section) border-2 border-(--border-color) p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h4 className="font-['Poppins'] font-semibold text-(--text-primary) mb-2">
                        {source.scrapingSourceName}
                    </h4>
                    <p className="text-(--text-primary-muted) text-sm mb-2 break-all">
                        {source.scrapingSourceUrl}
                    </p>
                    <p className="text-(--text-primary-muted) text-sm">
                        Max Pages: <span className="font-semibold">{source.maxPage}</span>
                    </p>
                </div>
                <div className="flex gap-2 ml-4">
                    <DashboardButton
                        variant="outline"
                        onClick={onEdit}
                        className="!p-2"
                        title="Edit Source"
                    >
                        <FontAwesomeIcon icon={faEdit} />
                    </DashboardButton>
                    <DashboardButton
                        variant="outline"
                        onClick={onDelete}
                        className="p-2! border-(--danger-color)! text-(--danger-color)! hover:bg-(--danger-color)! hover:text-white!"
                        title="Delete Source"
                        disabled={isDeleting}
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </DashboardButton>
                </div>
            </div>
        </div>
    )
}

const ManageScrapingSourcesModal: React.FC<ManageScrapingSourcesModalProps> = ({
    isOpen,
    onClose,
    sellerId,
    sellerName = 'Seller',
    onUpdateSuccess
}) => {
    // Form state for adding new scraping source
    const [formData, setFormData] = useState<ScrapingSourceFormData>({
        scrapingSourceUrl: '',
        maxPage: 10
    })
    
    // Use hooks for scraping sources management
    const { scrapingSources, isLoading, error: fetchError, refetch } = useScrapingSources(sellerId)
    const { createScrapingSource, isCreating, error: createError, fieldErrors, clearErrors } = useCreateScrapingSource()
    const { deleteScrapingSource, isDeleting } = useDeleteScrapingSource()
    const { updateScrapingSource, isUpdating, error: updateError } = useUpdateScrapingSource()

    // Debug logging
    useEffect(() => {
        apiLogger.debug('[ManageScrapingSourcesModal] Debug info:', {
            sellerId,
            scrapingSources,
            scrapingSourcesLength: scrapingSources?.length || 0,
            isLoading,
            fetchError,
            isOpen
        })
    }, [sellerId, scrapingSources, isLoading, fetchError, isOpen])
    
    // UI states
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteModalState, setDeleteModalState] = useState<{
        isOpen: boolean
        sourceId: string | null
        sourceName: string
        sourceUrl: string
    }>({
        isOpen: false,
        sourceId: null,
        sourceName: '',
        sourceUrl: ''
    })
    
    // Combined error from different sources
    const error = createError || fetchError || updateError

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

    // Clear errors when modal opens
    useEffect(() => {
        if (isOpen) {
            clearErrors()
        }
    }, [isOpen, clearErrors])

    // Compute preview name from URL
    const previewName = formData.scrapingSourceUrl ? extractScrapingSourceName(formData.scrapingSourceUrl) : ''

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        let parsedValue: any = value
        
        if (type === 'number') {
            parsedValue = value ? parseInt(value, 10) : 0
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: parsedValue
        }))
        
        // Clear errors when user starts typing
        if (fieldErrors[name]) {
            clearErrors()
        }
    }

    const handleAddSource = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!sellerId) return
        
        // Clear previous errors
        clearErrors()

        // Transform form data for API
        const apiData = transformScrapingSourceForAPI(formData)

        // Create scraping source using hook
        const newSource = await createScrapingSource(sellerId, apiData)
        
        if (newSource) {
            // Reset form on success
            setFormData({
                scrapingSourceUrl: '',
                maxPage: 10
            })
            
            // Refetch the list to show new source
            await refetch()
            
            // Call success callback
            if (onUpdateSuccess) {
                onUpdateSuccess()
            }
        }
    }

    const handleEditSource = (sourceId: string) => {
        if (editingId === sourceId) {
            // Cancel editing
            setEditingId(null)
        } else {
            // Start editing
            setEditingId(sourceId)
        }
    }

    const handleSaveEdit = async (source: ScrapingSource, newUrl: string, newMaxPage: number) => {
        if (!sellerId) return

        try {
            await updateScrapingSource(sellerId, source.id, {
                scrapingSourceUrl: newUrl,
                maxPage: newMaxPage
            })

            // Success - exit edit mode and refetch
            setEditingId(null)
            await refetch()
            
            if (onUpdateSuccess) {
                onUpdateSuccess()
            }

            toast.success('Scraping Source Updated', {
                description: `Successfully updated scraping source`,
                duration: 4000,
            })
        } catch (error) {
            console.error('Failed to update scraping source:', error)
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
    }

    // Open delete confirmation modal
    const handleDeleteClick = (sourceId: string, sourceName: string, sourceUrl: string) => {
        setDeleteModalState({
            isOpen: true,
            sourceId,
            sourceName,
            sourceUrl
        })
    }

    // Cancel delete operation
    const handleDeleteCancel = () => {
        setDeleteModalState({
            isOpen: false,
            sourceId: null,
            sourceName: '',
            sourceUrl: ''
        })
    }

    // Confirm delete operation
    const handleDeleteConfirm = async () => {
        if (!sellerId || !deleteModalState.sourceId) return
        
        const success = await deleteScrapingSource(
            sellerId, 
            deleteModalState.sourceId, 
            deleteModalState.sourceName
        )
        
        if (success) {
            // Close delete modal
            setDeleteModalState({
                isOpen: false,
                sourceId: null,
                sourceName: '',
                sourceUrl: ''
            })
            
            // Refetch the list to remove deleted source
            await refetch()
            
            if (onUpdateSuccess) {
                onUpdateSuccess()
            }
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
            <div className={styles.modalContentWide}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <FontAwesomeIcon icon={faGlobe} className="mr-3" />
                        Manage Scraping Sources
                    </h2>
                    <button
                        onClick={onClose}
                        className={styles.modalCloseButton}
                    >
                        ×
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Info Message */}
                    <div className={`${styles.alert} ${styles.info}`}>
                        <div className={styles.icon}>
                            <FontAwesomeIcon icon={faInfoCircle} />
                        </div>
                        <div className={styles.content}>
                            <div className={styles.message}>
                                <strong>Scraping Sources:</strong> Configure multiple URLs and page limits for data collection. Each source can target different sections or categories of the seller's website.
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

                    {/* Add New Scraping Source Form */}
                    <form onSubmit={handleAddSource} className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <FontAwesomeIcon icon={faPlus} className="text-(--brand-primary)" />
                            <h3 className="font-['Poppins'] font-bold text-lg text-(--text-primary)">
                                Add New Scraping Source
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Max Page */}
                            <div className={styles.formGroup}>
                                <label 
                                    htmlFor="maxPage" 
                                    className={styles.formLabel}
                                >
                                    Max Pages (Optional)
                                </label>
                                <input
                                    type="number"
                                    id="maxPage"
                                    name="maxPage"
                                    value={formData.maxPage}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="1000"
                                    className={styles.formInput}
                                    placeholder="10"
                                    disabled={isCreating}
                                />
                                {fieldErrors.maxPage && (
                                    <p className={styles.formError}>{fieldErrors.maxPage}</p>
                                )}
                                <p className={styles.formError} style={{ color: 'var(--text-primary-muted)', textTransform: 'none' }}>
                                    Maximum number of pages to scrape (default: 10)
                                </p>
                            </div>

                            {/* Empty div for grid layout */}
                            <div></div>
                        </div>

                        {/* Source URL - Full width */}
                        <div className={styles.formGroup}>
                            <label 
                                htmlFor="scrapingSourceUrl" 
                                className={styles.formLabel}
                            >
                                Source URL *
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
                                disabled={isCreating}
                            />
                            {fieldErrors.scrapingSourceUrl && (
                                <p className={styles.formError}>{fieldErrors.scrapingSourceUrl}</p>
                            )}
                            <p className={styles.formError} style={{ color: 'var(--text-primary-muted)', textTransform: 'none' }}>
                                Enter the specific URL where products are listed (e.g., category pages, product listing pages)
                            </p>
                            {previewName && (
                                <p style={{ color: 'var(--brand-primary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    <strong>Source Name:</strong> {previewName}
                                </p>
                            )}
                        </div>

                        {/* Add Button */}
                        <DashboardButton
                            type="submit"
                            variant="primary"
                            disabled={isCreating || !formData.scrapingSourceUrl}
                            className="w-full md:w-auto"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            {isCreating ? 'Adding...' : 'Add Scraping Source'}
                        </DashboardButton>
                    </form>

                        {/* Existing Scraping Sources */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <FontAwesomeIcon icon={faGlobe} className="text-(--brand-primary)" />
                                <h3 className="font-['Poppins'] font-bold text-lg text-(--text-primary)">
                                    Current Scraping Sources ({scrapingSources?.length || 0})
                                </h3>
                            </div>
                            <DashboardButton
                                variant="outline"
                                onClick={() => refetch()}
                                disabled={isLoading}
                                className="!p-2"
                                title="Refresh Sources"
                            >
                                <FontAwesomeIcon icon={faGlobe} className={isLoading ? 'animate-spin' : ''} />
                            </DashboardButton>
                        </div>

                        {/* Debug Info */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded text-xs">
                                <strong>Debug Info:</strong><br />
                                Seller ID: {sellerId || 'null'}<br />
                                Is Loading: {isLoading.toString()}<br />
                                Fetch Error: {fetchError || 'none'}<br />
                                Sources Array: {JSON.stringify(scrapingSources, null, 2)}<br />
                                Sources Length: {scrapingSources?.length || 0}
                            </div>
                        )}                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--brand-primary) mx-auto mb-4"></div>
                                <p className="text-(--text-primary-muted)">Loading scraping sources...</p>
                            </div>
                        ) : scrapingSources.length === 0 ? (
                            <div className="text-center py-8 bg-(--bg-section) border-2 border-(--border-color) border-dashed">
                                <FontAwesomeIcon icon={faGlobe} className="text-4xl text-(--text-primary-muted) mb-4" />
                                <p className="text-(--text-primary-muted) mb-2">No scraping sources configured yet</p>
                                <p className="text-sm text-(--text-primary-muted)">Add your first scraping source above to start collecting data</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {scrapingSources.map((source) => {
                                    const isEditing = editingId === source.id
                                    
                                    return (
                                        <ScrapingSourceItem
                                            key={source.id}
                                            source={source}
                                            isEditing={isEditing}
                                            isUpdating={isUpdating}
                                            isDeleting={isDeleting}
                                            onEdit={() => handleEditSource(source.id)}
                                            onSave={(newUrl, newMaxPage) => handleSaveEdit(source, newUrl, newMaxPage)}
                                            onCancel={handleCancelEdit}
                                            onDelete={() => handleDeleteClick(source.id, source.scrapingSourceName, source.scrapingSourceUrl)}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <DashboardButton
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        style={{ flex: 1 }}
                    >
                        Close
                    </DashboardButton>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteListConfirmModal
                isOpen={deleteModalState.isOpen}
                title="DELETE SCRAPING SOURCE"
                folderName={deleteModalState.sourceName}
                customMessage={`Are you sure you want to permanently delete the scraping source "<strong>${deleteModalState.sourceName}</strong>" from URL <em>${deleteModalState.sourceUrl}</em>?<br><br>This will stop all automated scraping from this source. This action cannot be undone.`}
                onCancel={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                isDeleting={isDeleting}
            />
        </div>
    )
}

export default ManageScrapingSourcesModal