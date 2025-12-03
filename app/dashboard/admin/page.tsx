"use client"

import { Clock, Play } from "lucide-react"
import { useState } from "react"

type Seller = {
    id: number
    name: string
    url: string
    isActive: boolean
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
    { id: 1, name: "SeedSupreme", url: "seedsupreme.com", isActive: true },
    { id: 2, name: "Vancover Seed bank", url: "vancouverseedbank.ca", isActive: true },
    { id: 3, name: "Crop King Seeds", url: "cropkingseeds.com", isActive: true },
    { id: 4, name: "Seedsman", url: "seedsman.com", isActive: false },
    { id: 5, name: "Herbies Seeds", url: "herbiesseeds.com", isActive: true },
    { id: 6, name: "Nirvana Shop", url: "nirvanashop.com", isActive: true },
    { id: 7, name: "Rocket Seeds", url: "rocketseeds.com", isActive: false },
    { id: 8, name: "True North Seeds", url: "truenorthseedbank.com", isActive: true },
    { id: 9, name: "Growers Choice", url: "growerschoiceseeds.com", isActive: true },
    { id: 10, name: "Sensi Seeds", url: "sensiseeds.com", isActive: true },
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
    const [activeTab, setActiveTab] = useState<"sellers" | "scraper">("sellers")
    const [sellers, setSellers] = useState<Seller[]>(initialSellers)
    const [scraperSites, setScraperSites] = useState<ScraperSite[]>(initialScraperSites)

    const toggleSeller = (id: number) => {
        setSellers(sellers.map((seller) => (seller.id === id ? { ...seller, isActive: !seller.isActive } : seller)))
    }

    const handleManualScrape = (id: number) => {
        setScraperSites(scraperSites.map((site) => (site.id === id ? { ...site, lastScraped: "Just now" } : site)))
    }

    const toggleAutoScrape = (id: number) => {
        setScraperSites(
            scraperSites.map((site) =>
                site.id === id
                    ? {
                        ...site,
                        isAutoEnabled: !site.isAutoEnabled,
                        autoScrapeInterval: !site.isAutoEnabled ? 6 : site.autoScrapeInterval,
                    }
                    : site,
            ),
        )
    }

    const updateInterval = (id: number, interval: number) => {
        setScraperSites(scraperSites.map((site) => (site.id === id ? { ...site, autoScrapeInterval: interval } : site)))
    }

    return (
        <div className="flex min-h-screen flex-col">

            <main className="flex-1 bg-[#e8dfc8]">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex gap-6">
                        {/* Sidebar */}
                        <div className="w-64 border-2 border-[#2d2d2d] bg-white p-4">
                            <h2 className="text-xl font-bold text-[#2f5233] mb-6">ADMIN PANEL</h2>
                            <nav className="flex flex-col gap-2">
                                <button
                                    onClick={() => setActiveTab("sellers")}
                                    className={`text-left px-4 py-3 border-2 border-[#2d2d2d] font-medium ${activeTab === "sellers" ? "bg-[#38a169] text-white" : "bg-white text-[#2d2d2d] hover:bg-[#d4c9b0]"
                                        }`}
                                >
                                    Sellers Management
                                </button>
                                <button
                                    onClick={() => setActiveTab("scraper")}
                                    className={`text-left px-4 py-3 border-2 border-[#2d2d2d] font-medium ${activeTab === "scraper" ? "bg-[#38a169] text-white" : "bg-white text-[#2d2d2d] hover:bg-[#d4c9b0]"
                                        }`}
                                >
                                    Scraper Management
                                </button>
                            </nav>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <div className="border-2 border-[#2d2d2d] bg-white p-8">
                                {activeTab === "sellers" ? (
                                    <>
                                        <h1 className="text-3xl font-bold text-[#2f5233] mb-2">SELLERS MANAGEMENT</h1>
                                        <p className="text-[#666666] mb-6">Manage affiliate marketing partners and their active status</p>

                                        <div className="space-y-4">
                                            {sellers.map((seller) => (
                                                <div
                                                    key={seller.id}
                                                    className="flex items-center justify-between border-2 border-[#2d2d2d] p-4 bg-[#f5f5f5]"
                                                >
                                                    <div>
                                                        <h3 className="font-bold text-[#2d2d2d]">{seller.name}</h3>
                                                        <p className="text-sm text-[#666666]">{seller.url}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span
                                                            className={`text-sm font-medium ${seller.isActive ? "text-[#38a169]" : "text-[#666666]"}`}
                                                        >
                                                            {seller.isActive ? "Active" : "Inactive"}
                                                        </span>
                                                        <button
                                                            onClick={() => toggleSeller(seller.id)}
                                                            className={`relative inline-flex h-8 w-14 items-center border-2 border-[#2d2d2d] ${seller.isActive ? "bg-[#38a169]" : "bg-[#d4c9b0]"
                                                                }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-6 w-6 transform bg-white border-2 border-[#2d2d2d] transition ${seller.isActive ? "translate-x-6" : "translate-x-0"
                                                                    }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-3xl font-bold text-[#2f5233] mb-2">SCRAPER MANAGEMENT</h1>
                                        <p className="text-[#666666] mb-6">Control manual and automatic scraping for each seller site</p>

                                        <div className="space-y-4">
                                            {scraperSites.map((site) => (
                                                <div key={site.id} className="border-2 border-[#2d2d2d] p-4 bg-[#f5f5f5]">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-[#2d2d2d]">{site.name}</h3>
                                                            <p className="text-sm text-[#666666]">{site.url}</p>
                                                            <p className="text-sm text-[#666666] mt-1">Last scraped: {site.lastScraped}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleManualScrape(site.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-[#d4a11e] text-[#2d2d2d] border-2 border-[#2d2d2d] font-medium hover:bg-[#c09219]"
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            Manual Scrape
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-6 pt-4 border-t-2 border-[#d4c9b0]">
                                                        <div className="flex items-center gap-3">
                                                            <Clock className="h-5 w-5 text-[#666666]" />
                                                            <span className="text-sm font-medium text-[#2d2d2d]">Auto Scrape:</span>
                                                            <button
                                                                onClick={() => toggleAutoScrape(site.id)}
                                                                className={`relative inline-flex h-8 w-14 items-center border-2 border-[#2d2d2d] ${site.isAutoEnabled ? "bg-[#38a169]" : "bg-[#d4c9b0]"
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-6 w-6 transform bg-white border-2 border-[#2d2d2d] transition ${site.isAutoEnabled ? "translate-x-6" : "translate-x-0"
                                                                        }`}
                                                                />
                                                            </button>
                                                            <span className={`text-sm ${site.isAutoEnabled ? "text-[#38a169]" : "text-[#666666]"}`}>
                                                                {site.isAutoEnabled ? "Enabled" : "Disabled"}
                                                            </span>
                                                        </div>

                                                        {site.isAutoEnabled && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-[#666666]">Interval:</span>
                                                                <select
                                                                    value={site.autoScrapeInterval || 6}
                                                                    onChange={(e) => updateInterval(site.id, Number(e.target.value))}
                                                                    className="px-3 py-1 border-2 border-[#2d2d2d] bg-white text-[#2d2d2d] font-medium"
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
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    )
}
