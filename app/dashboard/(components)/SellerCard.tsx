"use client"

import { Clock, Play } from "lucide-react"
import {
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

interface SellerCardProps {
  seller: SellerUI;
  isToggling?: boolean;
  toggleError?: Error | null;
  onToggleActive?: (id: string) => void
  onManualScrape?: (id: string) => void
  showActions?: boolean
}
import {toast} from 'sonner';

export function SellerCard({
  seller,
  isToggling,
  toggleError,
  onToggleActive,
  onManualScrape,
  showActions = false,
}: SellerCardProps) {
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
        <DashboardCardFooter className="flex justify-between">
          <DashboardButton
            variant="outline"
            onClick={
              () => {
              onToggleActive?.(seller.id)
              toggleError !== null ? toast.error(`Error: ${toggleError?.message}`) : toast.success(`Seller ${seller.isActive ? 'deactivated' : 'activated'} successfully!`)
            }
            }
            disabled={isToggling}
            className="text-sm px-4 py-2"
          >
            {seller.isActive ? "Deactivate" : "Activate"}
          </DashboardButton>
          {onManualScrape && (
            <DashboardIconButton
              variant="secondary"
              icon={<Play className="w-5 h-5" />}
              onClick={() => onManualScrape(seller.id)}
            />
          )}
        </DashboardCardFooter>
      )}
    </DashboardCard>
  )
}
