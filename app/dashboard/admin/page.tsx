"use client"

import { BarChart3, Clock, Play, Settings, Users } from "lucide-react"
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
} from "../(components)"

import { type Seller } from "@/types/seller.type"
import { SellerTransformer } from "@/lib/transfomers/seller.transformer"
import { SellerUI } from "@/types/seller.type"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faHeart, faSearchDollar, faShieldAlt, faChartDiagram, faChartBar, faChartLine, faUser, faTools } from '@fortawesome/free-solid-svg-icons'
import RecentActivity from "../(components)/DashboardOverview"
import DashboardOverview from "../(components)/DashboardOverview"
import DashboardSellersTabContent from "../(components)/DashboardSellersTabContent"
import DashboardScraperSitesTabContent from "../(components)/DashboardScraperSitesTabContent"
import { useFetchScraperSites, useFetchSellers } from "@/hooks/seller"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"sellers" | "scraper" | "overview">(
    "overview"
  )

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
          <DashboardSidebarItem
            icon={<FontAwesomeIcon icon={faUser} className="text-lg"/>}
            isActive={activeTab === "sellers"}
            onClick={() => setActiveTab("sellers")}
          >
            Sellers
          </DashboardSidebarItem>
          <DashboardSidebarItem
            icon={<FontAwesomeIcon icon={faTools} className="text-lg"/>}
            isActive={activeTab === "scraper"}
            onClick={() => setActiveTab("scraper")}
          >
            Scrapers
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

        {/* Scraper Management */}
        {activeTab === "scraper" && (
          <DashboardScraperSitesTabContent
            scraperSites={scraperSites}
            refetchScraperSites={refetchScraperSites}
          />
        )}
        </div>
      )}
    </DashboardLayout>
  )
}
