
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
import { ScraperSite } from '@/types/scraperStite.type'
import React from 'react'
import { useScraperOperations } from "@/hooks/scraper-site/useScraperOperations"
import { toast } from "sonner"
import { apiLogger } from "@/lib/helpers/api-logger"
import style from './dashboardAdmin.module.css'

interface DashboardScraperSitesTabContentProps {
  scraperSites: ScraperSite[];
  refetchScraperSites: () => void;
}

const DashboardScraperSitesTabContent: React.FC<DashboardScraperSitesTabContentProps> = ({ scraperSites, refetchScraperSites }) => {

  console.log("Rendering DashboardScraperSitesTabContent with sites:", scraperSites);

  const {
    triggerManualScrape,
    isTriggering,
    triggerError,
    activeJobs,

    toggleAutoScrape,
    isToggling,
    toggleError,

    updateInterval,
    isUpdatingInterval,
    updateIntervalError

  } = useScraperOperations(refetchScraperSites)


  const handleManualScrape = async (id: string, siteName: string) => {
    try {
      // Show loading state immediately
      toast.loading(`Initiating scrape for ${siteName}...`, {
        id: `scrape-${id}` // Use consistent ID for updates
      });
      
      await triggerManualScrape(id);
      
      // Success toast is handled in the hook
      toast.dismiss(`scrape-${id}`);
      
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(`scrape-${id}`);
      
      // Error is handled in the hook, but we can add fallback
      console.error("Manual scrape failed:", error);
    }
  }

  const handleToggleAutoScrape = async (id: string, currentState: boolean) => {
    try {
      await toggleAutoScrape(id, currentState);
      toast.success(`Auto scrape ${!currentState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      apiLogger.logError("Error toggling auto scrape:", { error });
      toast.error(`Error toggling auto scrape for ${id}`);
    }
  }

  const handleUpdateInterval = async (id: string, currentSettings: { isAutoEnabled: boolean; autoScrapeInterval: number }) => {
    try {
      await updateInterval(id, currentSettings)
    } catch (error) {
      console.error("Error updating interval:", error)
    }
  }
  return (
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
              <div className="flex flex-col gap-2">
                <DashboardButton
                  variant="secondary"
                  onClick={() => handleManualScrape(site.id, site.name)}
                  disabled={isTriggering || activeJobs.has(site.id)}
                  className="flex items-center gap-2"
                >
                  {isTriggering || activeJobs.has(site.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
                      {activeJobs.has(site.id) ? 'Scraping...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Manual Scrape
                    </>
                  )}
                </DashboardButton>

                {/* Show job status badge */}
                {activeJobs.has(site.id) && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    Job ID: {activeJobs.get(site.id)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t-[3px] border-(--border-color)">
              <DashboardToggle
                label="Auto Scrape"
                isActive={site.isAutoEnabled}
                onChange={() => handleToggleAutoScrape(site.id, site.isAutoEnabled)}
              />

              {site.isAutoEnabled && (
                <div className="flex items-center gap-2">
                  <span className={style.toggleLabel}>
                    Interval:
                  </span>
                  <select
                    value={site.autoScrapeInterval || 6}
                    onChange={(e) =>
                      updateInterval(site.id, {
                        isAutoEnabled: site.isAutoEnabled,
                        autoScrapeInterval: Number(e.target.value)
                      })
                    }
                    className={style.selectInterval}
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
  )
}

export default DashboardScraperSitesTabContent