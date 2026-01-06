"use client"

import { useState, useMemo } from "react"
import {
  DashboardLayout,
  DashboardSidebar,
  DashboardSidebarItem,
  AutoScraperTabContent,
} from "../(components)"

import DashboardOverview from "../(components)/DashboardOverview"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { SellerTransformer } from "@/lib/transfomers/seller.transformer"
import DashboardSellersTabContent from "../(components)/DashboardSellersTabContent"
import { useFetchScraperSites, useFetchSellers } from "@/hooks/seller"
import { useRouter } from "next/navigation"
import styles from "../(components)/dashboardAdmin.module.css"

import { AlertTriangle, Menu, X } from "lucide-react"
import { faChartLine, faUser, faStore, faRobot } from '@fortawesome/free-solid-svg-icons'
import { AlertTabContent } from "../(components)/AlertTabContent"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"sellers" | "scraper" | "overview" | "auto-scraper" | "alert">(
    "overview"
  )
  const [isSellersExpanded, setIsSellersExpanded] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
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
    setIsMobileSidebarOpen(false) // Close mobile sidebar
  }

  const handleSellerItemClick = (sellerId: string) => {
    setIsMobileSidebarOpen(false) // Close mobile sidebar
    router.push(`/dashboard/admin/sellers/${sellerId}`)
  }

  const handleTabChange = (tab: "sellers" | "scraper" | "overview" | "auto-scraper" | "alert") => {
    setActiveTab(tab)
    setIsMobileSidebarOpen(false) // Close mobile sidebar
  }
  
  return (
    <div className="relative overflow-hidden">
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden bg-(--bg-main) border-b-3 border-(--border-color) px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <h1 className="font-['Archivo_Black'] text-xl uppercase text-(--brand-primary) tracking-tight">
            Admin Panel
          </h1>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 border-3 border-(--border-color) bg-(--bg-main) hover:bg-(--bg-section) transition-all duration-200"
          >
            <Menu className="w-5 h-5 text-(--text-primary)" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Sidebar content */}
          <div className="relative w-80 max-w-sm bg-(--bg-main) border-r-6 border-(--border-color) shadow-xl">
            <div className="flex h-full flex-col">
              {/* Header with close button */}
              <div className="flex items-center justify-between px-6 py-4 border-b-3 border-(--border-color)">
                <h2 className={`${styles.sidebarTitle} mb-0`}>
                  Admin Panel
                </h2>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 border-3 border-(--border-color) bg-(--bg-main) hover:bg-(--bg-section) transition-all duration-200"
                >
                  <X className="w-4 h-4 text-(--text-primary)" />
                </button>
              </div>
              
              {/* Mobile Navigation - giống style desktop */}
              <div className="flex-1 overflow-y-auto" style={{ padding: '1.5rem' }}>
                <nav className={`${styles.sidebarNav}`}>
                  {/* Overview */}
                  <DashboardSidebarItem
                    icon={<FontAwesomeIcon icon={faChartLine} className="text-lg" />}
                    isActive={activeTab === "overview"}
                    onClick={() => handleTabChange("overview")}
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
                            <span className="truncate">{seller.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scraper Config */}
                  <DashboardSidebarItem
                    icon={<FontAwesomeIcon icon={faRobot} className="text-lg"/>}
                    isActive={activeTab === "auto-scraper"}
                    onClick={() => handleTabChange("auto-scraper")}
                  >
                    Scraper Config
                  </DashboardSidebarItem>

                  {/* Error and Success Alerts */}
                  <DashboardSidebarItem
                    icon={<AlertTriangle className="text-lg"/>}
                    isActive={activeTab === "alert"}
                    onClick={() => handleTabChange("alert")}
                  >
                    Error & Success Alerts
                  </DashboardSidebarItem>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
  {/* Desktop sidebar */}
      <DashboardLayout
        title="Admin Dashboard"
        subtitle="Manage sellers and scraping operations"
        sidebar={
          <DashboardSidebar title="Admin Panel">
            {/* Overview */}
            <DashboardSidebarItem
              icon={<FontAwesomeIcon icon={faChartLine} className="text-lg" />}
              isActive={activeTab === "overview"}
              onClick={() => handleTabChange("overview")}
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
            {/* Scraper Config */}
            <DashboardSidebarItem
              icon={<FontAwesomeIcon icon={faRobot} className="text-lg"/>}
              isActive={activeTab === "auto-scraper"}
              onClick={() => handleTabChange("auto-scraper")}
            >
              Scraper Config
            </DashboardSidebarItem>
            {/* Error and Success Alerts */}
            <DashboardSidebarItem
              icon={<AlertTriangle className="text-lg"/>}
              isActive={activeTab === "alert"}
              onClick={() => handleTabChange("alert")}
            >
              Error & Success Alerts
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
            <DashboardOverview sellers={sellers} />
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
        {/* Logs Alert */}
        {activeTab === "alert" && (
          <AlertTabContent
            sellers={sellers.map(seller => ({ id: seller.id, name: seller.name }))}
            onRefreshData={() => refetchSellers()}
          />
        )}
        </div>
      )}
    </DashboardLayout>
    </div>
  )
}
