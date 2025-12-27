"use client"

import { Clock, Play, MoreVertical, Edit, Trash2, PlusCircle, LogInIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import {
  ActionSellerCardBtn,
  DashboardBadge,
  DashboardButton,
  DashboardCard,
  DashboardCardBody,
  DashboardCardFooter,
  DashboardCardHeader,
  DashboardIconButton,
  DashboardProgressBar,
} from "./index"
import { SellerUI } from "@/types/seller.type"
import { toast } from 'sonner';
import { useRouter } from "next/navigation"
import ActionConfirmModal from "@/components/custom/modals/ActionConfirmModal"
import { useSellerOperations } from "@/hooks/seller"

interface SellerCardProps {
  seller: SellerUI;
  onManualScrape?: (id: string) => void
  onUpdate?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
  refetchSellers?: () => void
}

export function SellerCard({
  seller,
  onManualScrape,
  onUpdate,
  onDelete,
  showActions = false,
  refetchSellers,
}: SellerCardProps) {
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Use seller operations hook
  const { toggleSellerStatus, isUpdating, updateError } = useSellerOperations(refetchSellers);

  const handleToggleClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmToggle = async () => {
    try {
      await toggleSellerStatus(seller.id, seller.isActive);
      setShowConfirmModal(false);
      toast.success(`Seller ${seller.isActive ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error("Error toggling seller:", error);
      toast.error(`Error: ${updateError?.message || 'Failed to toggle seller status'}`);
    }
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
  };
  return (
    <DashboardCard hover>
      <DashboardCardHeader>
        <div>
          <h3 className="font-['Poppins'] font-bold text-lg text-(--text-primary) mb-1">
            {seller.name}
          </h3>
          <p className="font-['Poppins'] text-sm text-(--text-primary-muted)">
            {seller.url}
          </p>
          {seller.lastScraped && (
            <p className="font-['Poppins'] text-xs text-(--text-primary-muted) mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last scraped: {seller.lastScraped}
            </p>
          )}
        </div>
        <DashboardBadge variant={seller.isActive ? "active" : "inactive"}>
          {seller.isActive ? "Active" : "Inactive"}
        </DashboardBadge>
      </DashboardCardHeader>

      {seller.stats && (
        <DashboardCardBody>
          <DashboardProgressBar
            label="Success Rate"
            percentage={seller.stats.successRate}
            variant={
              seller.stats.successRate >= 80
                ? "success"
                : seller.stats.successRate >= 50
                  ? "warning"
                  : "danger"
            }
          />
          <div className="grid grid-cols-2 gap-4 pt-2">
            {seller.stats.productsScraped !== undefined && (
              <div>
                <div className="text-xs font-['Poppins'] font-medium text-(--text-primary-muted) uppercase">
                  Products
                </div>
                <div className="text-2xl font-['Archivo_Black'] text-(--text-primary)">
                  {seller.stats.productsScraped}
                </div>
              </div>
            )}
            {seller.stats.totalRuns !== undefined && (
              <div>
                <div className="text-xs font-['Poppins'] font-medium text-(--text-primary-muted) uppercase">
                  Total Runs
                </div>
                <div className="text-2xl font-['Archivo_Black'] text-(--text-primary)">
                  {seller.stats.totalRuns}
                </div>
              </div>
            )}
          </div>
        </DashboardCardBody>
      )}

      {showActions && (
        <DashboardCardFooter className="flex justify-between items-center">
          <div className="flex flex-row items-center gap-4">
            <DashboardButton
              variant="outline"
              onClick={handleToggleClick}
              disabled={isUpdating}
              className="text-sm px-4 py-2"
            >
              {seller.isActive ? "Deactivate" : "Activate"}
            </DashboardButton>

            <DashboardButton
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => router.push(`/dashboard/admin/sellers/${seller.id}`)}
            >
              <>
                <LogInIcon className="h-4 w-4" />
                Access
              </>
            </DashboardButton>
          </div>

          {/* Action buttons dropdown: delete or update */}
          <ActionSellerCardBtn
            sellerId={seller.id}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />

          {onManualScrape && (
            <DashboardIconButton
              variant="secondary"
              icon={<Play className="w-5 h-5" />}
              onClick={() => onManualScrape(seller.id)}
            />
          )}
        </DashboardCardFooter>
      )}

      {/* Confirmation Modal */}
      <ActionConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmToggle}
        actionType={seller.isActive ? 'deactivate' : 'activate'}
        sellerName={seller.name}
        isLoading={isUpdating}
      />
    </DashboardCard>
  )
}
