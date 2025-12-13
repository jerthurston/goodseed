'use client';
import React from 'react'
import { SellerCard } from './SellerCard'
import { SellerUI } from '@/types/seller.type'
import { useSellerOperations } from '@/hooks/seller'

interface DashboardSellersTabContentProps {
    sellers: SellerUI[];
    refetchSellers: () => void;
}

const DashboardSellersTabContent = ({ sellers, refetchSellers }: DashboardSellersTabContentProps) => {
  // Use custom hook for seller operations following the architecture pattern
  const { toggleSellerStatus, isToggling, toggleError } = useSellerOperations(refetchSellers)

  const handleToggleSeller = async (id: string) => {
    const seller = sellers.find((s) => s.id === id)
    if (!seller) return

    try {
      await toggleSellerStatus(id, seller.isActive)
    } catch (error) {
      console.error("Error toggling seller:", error)
    }
  }
 
  return (
    <>
        <h2 className="font-['Archivo_Black'] text-3xl uppercase text-(--brand-primary) tracking-tight mb-4">
                      Sellers Management
                    </h2>
                    <p className="font-['Poppins'] text-(--text-primary-muted) mb-6">
                      Manage affiliate marketing partners and their active status
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sellers.map((seller) => (
                        <SellerCard
                          key={seller.id}
                          seller={seller}
                          isToggling={isToggling}
                          toggleError={toggleError}
                          onToggleActive={handleToggleSeller}
                          showActions
                        />
                      ))}
                    </div>
    </>
  )
}

export default DashboardSellersTabContent