"use client"

import { BarChart3, Clock, Play, Settings, Users, AlertTriangle } from "lucide-react"
import { useState, useMemo } from "react"
import {
  DashboardButton,
  DashboardCard,
  DashboardLayout,
  DashboardSidebar,
  DashboardSidebarItem,
  DashboardToggle,
  SellerCard,
  StatsOverview,
  AutoScraperTabContent,
} from "../(components)"

import { type Seller } from "@/types/seller.type"
import { SellerTransformer } from "@/lib/transfomers/seller.transformer"
import { SellerUI } from "@/types/seller.type"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faHeart, faSearchDollar, faShieldAlt, faChartDiagram, faChartBar, faChartLine, faUser, faTools, faChevronDown, faChevronRight, faStore, faChevronUp, faRobot } from '@fortawesome/free-solid-svg-icons'
import RecentActivity from "../(components)/DashboardOverview"
import DashboardOverview from "../(components)/DashboardOverview"
import DashboardSellersTabContent from "../(components)/DashboardSellersTabContent"
import DashboardScraperSitesTabContent from "../(components)/DashboardScraperSitesTabContent"
import { useFetchScraperSites, useFetchSellers } from "@/hooks/seller"
import { useRouter } from "next/navigation"
import styles from "../(components)/dashboardAdmin.module.css"
import ErrorAlertBanner from "@/components/custom/admin/ErrorAlertBanner"
import { LogsTabContent } from "../(components)/LogsTabContent"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"sellers" | "scraper" | "overview" | "auto-scraper" | "error-alert">(
    "overview"
  )
  const [isSellersExpanded, setIsSellersExpanded] = useState(false)
  const router = useRouter()

  // Fetch data using custom hooks
  const {
    sellers: rawSellers,
    isLoading: isSellersLoading,
    refetch: refetchSellers,
  } = useFetchSellers();
    // Transform raw seller data to UI format
  const sellers = useMemo(() => {
    if (!rawSellers || rawSellers.length === 0) return []
    return SellerTransformer.toUIList(rawSellers)
  }, [rawSellers])

  const {
    scraperSites,
    isLoading: isScraperSitesLoading,
    refetch: refetchScraperSites,
  } = useFetchScraperSites()

  // consistent loading state
  const isLoading = isSellersLoading || isScraperSitesLoading

  const handleSellerTabClick = () => {
    setActiveTab("sellers")
    setIsSellersExpanded(!isSellersExpanded)
  }

  const handleSellerItemClick = (sellerId: string) => {
    router.push(`/dashboard/admin/sellers/${sellerId}`)
  }
  
  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Manage sellers and scraping operations"
      sidebar={
        <DashboardSidebar title="Admin Panel">
          <DashboardSidebarItem
            icon={<FontAwesomeIcon icon={faChartLine} className="text-lg" />}
            isActive={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </DashboardSidebarItem>
          
          {/* Sellers with dropdown */}
          <div className="space-y-1">
            <DashboardSidebarItem
              icon={<FontAwesomeIcon icon={faUser} className="text-lg"/>}
              isActive={activeTab === "sellers"}
              onClick={handleSellerTabClick}
              className={styles.sidebarItem}
            >
              <div className={styles.sidebarItemWithDropdown}>
                <span>Sellers</span>
                {/* <FontAwesomeIcon 
                  icon={isSellersExpanded ? faChevronUp : faChevronRight} 
                  className={`${styles.sidebarDropdownIcon} ${isSellersExpanded ? styles.sidebarDropdownIconExpanded : ''}`}
                /> */}
              </div>
            </DashboardSidebarItem>
            
            {/* Sellers dropdown */}
            {isSellersExpanded && sellers && sellers.length > 0 && (
              <div className={styles.sidebarDropdown}>
                {sellers.map((seller) => (
                  <div
                    key={seller.id}
                    onClick={() => handleSellerItemClick(seller.id)}
                    className={styles.sidebarDropdownItem}
                  >
                    <FontAwesomeIcon icon={faStore} className="text-xs" />
                    <span className="truncate">
                      {seller.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DashboardSidebarItem
            icon={<FontAwesomeIcon icon={faRobot} className="text-lg"/>}
            isActive={activeTab === "auto-scraper"}
            onClick={() => setActiveTab("auto-scraper")}
          >
            Auto Scraper
          </DashboardSidebarItem>
          
          <DashboardSidebarItem
            icon={<AlertTriangle className="text-lg"/>}
            isActive={activeTab === "error-alert"}
            onClick={() => setActiveTab("error-alert")}
          >
            Activity Monitoring
          </DashboardSidebarItem>
        </DashboardSidebar>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--brand-primary) mx-auto"></div>
            <p className="mt-4 font-['Poppins'] text-(--text-primary-muted)">
              Loading...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          {activeTab === "overview" && (
          <>
            <ErrorAlertBanner 
              criticalOnly={false}
              onRefresh={() => {
                refetchSellers();
                // Optionally refresh other data
              }}
            />
            <DashboardOverview sellers={sellers} />
          </>
        )}

        {/* Sellers Management */}
        {activeTab === "sellers" && (
          <DashboardSellersTabContent
            sellers={sellers}
            refetchSellers={refetchSellers}
          />
        )}

        {/* Auto Scraper Management */}
        {activeTab === "auto-scraper" && (
          <AutoScraperTabContent
            sellers={sellers}
            refetchSellers={refetchSellers}
          />
        )}

        {/* Error Alert Management */}
        {activeTab === "error-alert" && (
          <LogsTabContent
            sellers={sellers.map(seller => ({ id: seller.id, name: seller.name }))}
            onRefreshData={() => {
              refetchSellers();
            }}
          />
        )}
       
        </div>
      )}
    </DashboardLayout>
  )
}
