"use client"

import { BarChart3, Clock, Play, Settings, Users } from "lucide-react"
import { useState } from "react"
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

type Seller = {
  id: number
  name: string
  url: string
  isActive: boolean
  lastScraped?: string
  stats?: {
    successRate: number
    productsScraped?: number
    totalRuns?: number
  }
}

type ScraperSite = {
  id: number
  name: string
  url: string
  lastScraped: string
  autoScrapeInterval: number | null
  isAutoEnabled: boolean
}

const initialSellers: Seller[] = [
  {
    id: 1,
    name: "SeedSupreme",
    url: "seedsupreme.com",
    isActive: true,
    lastScraped: "2 hours ago",
    stats: { successRate: 95, productsScraped: 245, totalRuns: 42 },
  },
  {
    id: 2,
    name: "Vancouver Seed Bank",
    url: "vancouverseedbank.ca",
    isActive: true,
    lastScraped: "1 hour ago",
    stats: { successRate: 88, productsScraped: 189, totalRuns: 38 },
  },
  {
    id: 3,
    name: "Crop King Seeds",
    url: "cropkingseeds.com",
    isActive: true,
    lastScraped: "30 minutes ago",
    stats: { successRate: 92, productsScraped: 312, totalRuns: 51 },
  },
  {
    id: 4,
    name: "Seedsman",
    url: "seedsman.com",
    isActive: false,
    lastScraped: "Never",
    stats: { successRate: 0, productsScraped: 0, totalRuns: 0 },
  },
  {
    id: 5,
    name: "Herbies Seeds",
    url: "herbiesseeds.com",
    isActive: true,
    lastScraped: "3 hours ago",
    stats: { successRate: 78, productsScraped: 156, totalRuns: 29 },
  },
  {
    id: 6,
    name: "Nirvana Shop",
    url: "nirvanashop.com",
    isActive: true,
    lastScraped: "45 minutes ago",
    stats: { successRate: 91, productsScraped: 223, totalRuns: 45 },
  },
  {
    id: 7,
    name: "Rocket Seeds",
    url: "rocketseeds.com",
    isActive: false,
    lastScraped: "Never",
    stats: { successRate: 0, productsScraped: 0, totalRuns: 0 },
  },
  {
    id: 8,
    name: "True North Seeds",
    url: "truenorthseedbank.com",
    isActive: true,
    lastScraped: "1 hour ago",
    stats: { successRate: 85, productsScraped: 198, totalRuns: 35 },
  },
  {
    id: 9,
    name: "Growers Choice",
    url: "growerschoiceseeds.com",
    isActive: true,
    lastScraped: "20 minutes ago",
    stats: { successRate: 94, productsScraped: 267, totalRuns: 48 },
  },
  {
    id: 10,
    name: "Sensi Seeds",
    url: "sensiseeds.com",
    isActive: true,
    lastScraped: "4 hours ago",
    stats: { successRate: 87, productsScraped: 201, totalRuns: 41 },
  },
]

const initialScraperSites: ScraperSite[] = [
  {
    id: 1,
    name: "SeedSupreme",
    url: "seedsupreme.com",
    lastScraped: "2 hours ago",
    autoScrapeInterval: 6,
    isAutoEnabled: true,
  },
  {
    id: 2, name: "Vancover Seed bank",
    url: "vancouverseedbank.ca",
    lastScraped: "1 hour ago",
    autoScrapeInterval: 4,
    isAutoEnabled: true
  },
  {
    id: 3,
    name: "Crop King Seeds",
    url: "cropkingseeds.com",
    lastScraped: "30 minutes ago",
    autoScrapeInterval: 2,
    isAutoEnabled: true,
  },
  {
    id: 4,
    name: "Seedsman",
    url: "seedsman.com",
    lastScraped: "Never",
    autoScrapeInterval: null,
    isAutoEnabled: false,
  },
  {
    id: 5,
    name: "Herbies Seeds",
    url: "herbiesseeds.com",
    lastScraped: "3 hours ago",
    autoScrapeInterval: 8,
    isAutoEnabled: true,
  },
  {
    id: 6,
    name: "Nirvana Shop",
    url: "nirvanashop.com",
    lastScraped: "45 minutes ago",
    autoScrapeInterval: 6,
    isAutoEnabled: true,
  },
  {
    id: 7,
    name: "Rocket Seeds",
    url: "rocketseeds.com",
    lastScraped: "Never",
    autoScrapeInterval: null,
    isAutoEnabled: false,
  },
  {
    id: 8,
    name: "True North Seeds",
    url: "truenorthseedbank.com",
    lastScraped: "1 hour ago",
    autoScrapeInterval: 12,
    isAutoEnabled: true,
  },
  {
    id: 9,
    name: "Growers Choice",
    url: "growerschoiceseeds.com",
    lastScraped: "20 minutes ago",
    autoScrapeInterval: 4,
    isAutoEnabled: true,
  },
  {
    id: 10,
    name: "Sensi Seeds",
    url: "sensiseeds.com",
    lastScraped: "4 hours ago",
    autoScrapeInterval: 24,
    isAutoEnabled: true,
  },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"sellers" | "scraper" | "stats">(
    "stats"
  )
  const [sellers, setSellers] = useState<Seller[]>(initialSellers)
  const [scraperSites, setScraperSites] =
    useState<ScraperSite[]>(initialScraperSites)

  const toggleSeller = (id: number) => {
    setSellers(
      sellers.map((seller) =>
        seller.id === id ? { ...seller, isActive: !seller.isActive } : seller
      )
    )
  }

  const handleManualScrape = (id: number) => {
    setScraperSites(
      scraperSites.map((site) =>
        site.id === id ? { ...site, lastScraped: "Just now" } : site
      )
    )
  }

  const toggleAutoScrape = (id: number) => {
    setScraperSites(
      scraperSites.map((site) =>
        site.id === id
          ? {
            ...site,
            isAutoEnabled: !site.isAutoEnabled,
            autoScrapeInterval: !site.isAutoEnabled
              ? 6
              : site.autoScrapeInterval,
          }
          : site
      )
    )
  }

  const updateInterval = (id: number, interval: number) => {
    setScraperSites(
      scraperSites.map((site) =>
        site.id === id ? { ...site, autoScrapeInterval: interval } : site
      )
    )
  }

  // Calculate stats
  const activeSellers = sellers.filter((s) => s.isActive).length
  const totalProducts = sellers.reduce(
    (sum, s) => sum + (s.stats?.productsScraped || 0),
    0
  )
  const avgSuccessRate = Math.round(
    sellers.reduce((sum, s) => sum + (s.stats?.successRate || 0), 0) /
    sellers.length
  )

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Manage sellers and scraping operations"
      sidebar={
        <DashboardSidebar title="Admin Panel">
          <DashboardSidebarItem
            icon={<BarChart3 />}
            isActive={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
          >
            Dashboard
          </DashboardSidebarItem>
          <DashboardSidebarItem
            icon={<Users />}
            isActive={activeTab === "sellers"}
            onClick={() => setActiveTab("sellers")}
          >
            Sellers
          </DashboardSidebarItem>
          <DashboardSidebarItem
            icon={<Settings />}
            isActive={activeTab === "scraper"}
            onClick={() => setActiveTab("scraper")}
          >
            Scrapers
          </DashboardSidebarItem>
        </DashboardSidebar>
      }
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        {activeTab === "stats" && (
          <>
            <StatsOverview
              stats={{
                totalSellers: sellers.length,
                activeSellers,
                totalProducts,
                successRate: avgSuccessRate,
                trends: {
                  sellers: { value: "+2", isPositive: true },
                  products: { value: "+156", isPositive: true },
                },
              }}
            />

            <DashboardCard className="mt-6">
              <h2 className="font-['Archivo_Black'] text-3xl uppercase text-(--brand-primary) tracking-tight mb-4">
                Recent Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sellers
                  .filter((s) => s.isActive)
                  .slice(0, 4)
                  .map((seller) => (
                    <SellerCard key={seller.id} seller={seller} />
                  ))}
              </div>
            </DashboardCard>
          </>
        )}

        {/* Sellers Management */}
        {activeTab === "sellers" && (
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
                  onToggleActive={toggleSeller}
                  showActions
                />
              ))}
            </div>
          </>
        )}

        {/* Scraper Management */}
        {activeTab === "scraper" && (
          <>
            <h2 className="font-['Archivo_Black'] text-3xl uppercase text-(--brand-primary) tracking-tight mb-4">
              Scraper Management
            </h2>
            <p className="font-['Poppins'] text-(--text-primary-muted) mb-6">
              Control manual and automatic scraping for each seller site
            </p>
            <div className="space-y-6">
              {scraperSites.map((site) => (
                <DashboardCard key={site.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-['Poppins'] font-bold text-lg text-(--text-primary) mb-1">
                        {site.name}
                      </h3>
                      <p className="font-['Poppins'] text-sm text-(--text-primary-muted)">
                        {site.url}
                      </p>
                      <p className="font-['Poppins'] text-xs text-(--text-primary-muted) mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last scraped: {site.lastScraped}
                      </p>
                    </div>
                    <DashboardButton
                      variant="secondary"
                      onClick={() => handleManualScrape(site.id)}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Manual Scrape
                    </DashboardButton>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t-[3px] border-(--border-color)">
                    <DashboardToggle
                      label="Auto Scrape"
                      isActive={site.isAutoEnabled}
                      onChange={() => toggleAutoScrape(site.id)}
                    />

                    {site.isAutoEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="font-['Poppins'] text-sm text-(--text-primary-muted)">
                          Interval:
                        </span>
                        <select
                          value={site.autoScrapeInterval || 6}
                          onChange={(e) =>
                            updateInterval(site.id, Number(e.target.value))
                          }
                          className="px-3 py-2 border-[3px] border-(--border-color) bg-(--bg-main) text-(--text-primary) font-['Poppins'] font-medium"
                        >
                          <option value={1}>Every 1 hour</option>
                          <option value={2}>Every 2 hours</option>
                          <option value={4}>Every 4 hours</option>
                          <option value={6}>Every 6 hours</option>
                          <option value={8}>Every 8 hours</option>
                          <option value={12}>Every 12 hours</option>
                          <option value={24}>Every 24 hours</option>
                        </select>
                      </div>
                    )}
                  </div>
                </DashboardCard>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
