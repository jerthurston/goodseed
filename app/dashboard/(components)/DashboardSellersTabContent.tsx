'use client';
import React, { useState } from 'react'
import { SellerCard } from './SellerCard'
import { SellerUI } from '@/types/seller.type'
import { DashboardButton } from './DashboardButton';
import { Plus, PlusCircle } from 'lucide-react';
import CreateSellerModal from '@/components/custom/modals/CreateSellerModal';
import UpdateSellerModal from '@/components/custom/modals/UpdateSellerModal';
import ActionConfirmModal from '@/components/custom/modals/ActionConfirmModal';
import { toast } from 'sonner';
import api from '@/lib/api';

interface DashboardSellersTabContentProps {
  sellers: SellerUI[];
  refetchSellers: () => void;
}

const DashboardSellersTabContent = ({ sellers, refetchSellers }: DashboardSellersTabContentProps) => {
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sellerToDelete, setSellerToDelete] = useState<SellerUI | null>(null)
  const [isDeletingSeller, setIsDeletingSeller] = useState(false)

  // Function to refetch and show notification on success
  const handleCreateSellerSuccess = () => {
    // Refetch sellers list after successful creation
    refetchSellers()
    
    // Show additional toast for list refresh
    toast.success('Sellers List Updated', {
      description: 'The sellers list has been refreshed with the new seller',
      duration: 3000,
    })
  }

  const handleUpdateSeller = (id: string) => {
    setSelectedSellerId(id)
    setIsUpdateModalOpen(true)
  }

  const handleUpdateSellerSuccess = () => {
    // Refetch sellers list after successful update
    refetchSellers()
    
    // Show additional toast for list refresh
    toast.success('Seller Updated', {
      description: 'The seller has been updated successfully',
      duration: 3000,
    })
  }

  const handleDeleteSeller = (id: string) => {
    const seller = sellers.find(s => s.id === id)
    if (seller) {
      setSellerToDelete(seller)
      setShowDeleteConfirm(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!sellerToDelete) return

    setIsDeletingSeller(true)

    try {
      await api.delete(`/admin/sellers/${sellerToDelete.id}`)
      
      // Show success toast
      toast.success('Seller Deleted Successfully', {
        description: `${sellerToDelete.name} has been removed from the system`,
        duration: 4000,
      })

      // Refetch sellers list
      refetchSellers()

      // Close modal and reset state
      setShowDeleteConfirm(false)
      setSellerToDelete(null)
    } catch (error: any) {
      console.error('Error deleting seller:', error)
      
      const errorMessage = error.response?.data?.error || 'Failed to delete seller'
      toast.error('Failed to Delete Seller', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsDeletingSeller(false)
    }
  }

  return (
    <>
      <div className='flex flex-col lg:flex-row justify-between items-center'>
        <div>
          <h2 className="font-['Archivo_Black'] text-3xl uppercase text-(--brand-primary) tracking-tight mb-4">
            Sellers Management
          </h2>
          <p className="font-['Poppins'] text-(--text-primary-muted) mb-6">
            Manage affiliate marketing partners and their active status
          </p>
        </div>

        {/* Create Seller Button */}
        <DashboardButton
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <>
            <PlusCircle className="h-4 w-4" />
            Add Seller
          </>
        </DashboardButton>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sellers.map((seller) => (
          <SellerCard
            key={seller.id}
            seller={seller}
            onUpdate={handleUpdateSeller}
            onDelete={handleDeleteSeller}
            refetchSellers={refetchSellers}
            showActions
          />
        ))}
      </div>

      {/* Create Seller Modal */}
      <CreateSellerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSuccess={handleCreateSellerSuccess}
      />

      {/* Update Seller Modal */}
      <UpdateSellerModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false)
          setSelectedSellerId(null)
        }}
        onUpdateSuccess={handleUpdateSellerSuccess}
        sellerId={selectedSellerId}
      />

      {/* Delete Confirmation Modal */}
      <ActionConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setSellerToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        actionType="delete"
        sellerName={sellerToDelete?.name || 'Unknown Seller'}
        isLoading={isDeletingSeller}
      />
    </>
  )
}

export default DashboardSellersTabContent