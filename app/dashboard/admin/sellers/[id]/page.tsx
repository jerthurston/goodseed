"use client"

import { useParams, useRouter } from "next/navigation"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft, faStore, faEdit, faTrash, faEye, faPlay, faStop, faRefresh } from '@fortawesome/free-solid-svg-icons'
import {
  DashboardLayout,
  DashboardCard,
  DashboardButton,
  DashboardToggle,
} from "../../../(components)"
import { useFetchSellerById } from "@/hooks/seller"
import styles from "../../../(components)/dashboardAdmin.module.css"
import Link from "next/link"
import { Clock, PlayCircle } from "lucide-react"
import { Play } from "next/font/google"
import { toast } from "sonner"
import { useScraperOperations } from "@/hooks/scraper-site/useScraperOperations"
import { apiLogger } from "@/lib/helpers/api-logger"

import style from '../../../(components)/dashboardAdmin.module.css'

export default function AdminSellerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sellerId = params.id as string

  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { seller, isLoading, isError, error } = useFetchSellerById(sellerId)
  
  // TODO: Cần thiết lập lại hàm refetchScraperSites cho đúng
  const refetchScraperSites = () => {
    // Implement refetch logic here
  }

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

  // NOW WE CAN HAVE CONDITIONAL RETURNS AFTER ALL HOOKS ARE CALLED
  if (isLoading) {
    return (
      <div className="max-w-[1440px] w-full min-h-screen bg-(--bg-main) p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--brand-primary) mx-auto"></div>
            <p className="mt-4 font-['Poppins'] text-(--text-primary-muted)">
              Loading seller details...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isError || (!isLoading && !seller)) {
    return (
      <div className="max-w-[1440px] w-full min-h-screen bg-(--bg-main) p-6">
        <div className="text-center py-12">
          <h1 className="font-['Archivo_Black'] text-3xl text-(--text-primary) mb-4">
            {isError ? 'Error Loading Seller' : 'Seller Not Found'}
          </h1>
          <p className="text-(--text-primary-muted) mb-6">
            {isError 
              ? `Error: ${error?.message || 'Failed to load seller data'}`
              : `Seller with ID "${sellerId}" not found.`
            }
          </p>
          <DashboardButton
            onClick={() => router.push("/dashboard/admin")}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Dashboard
          </DashboardButton>
        </div>
      </div>
    )
  }

   const handleManualScrape = async (sellerId: string, sellerName: string) => {
    try {
      // Show loading state immediately
      toast.loading(`Initiating scrape for ${sellerName}...`, {
        id: `scrape-${sellerId}` // Use consistent ID for updates
      },
    );

      await triggerManualScrape(
        sellerId,
        { maxPages: 30 }
      );

      // Success toast is handled in the hook
      toast.dismiss(`scrape-${sellerId}`);
      
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(`scrape-${sellerId}`);
      
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


  const handleRunScraper = async () => {
    // TODO: Implement scraper run logic
    console.log("Running scraper for seller:", seller!.id)
  }

  const handleToggleStatus = async () => {
    // TODO: Implement toggle status logic
    console.log("Toggling status for seller:", seller!.id)
  }

  // At this point, seller is guaranteed to exist due to the checks above
  // Create a non-null reference for TypeScript
  const currentSeller = seller!
  
  return (
    <div className="max-w-[1440px] mx-auto w-full min-h-screen bg-(--bg-main) p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-['Archivo_Black'] text-4xl uppercase text-(--brand-primary) tracking-tight mb-2">
            {currentSeller.name}
          </h1>
          <p className="font-['Poppins'] text-(--text-primary-muted)">
            Seller Details & Management
          </p>
        </div>
        <DashboardButton
          onClick={() => router.push("/dashboard/admin")}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to Dashboard
        </DashboardButton>
      </div>

      <div className="space-y-6">

{/* Actions Card */}

<DashboardCard key={currentSeller.id}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-['Poppins'] font-bold text-lg text-(--text-primary) mb-1">
                  {currentSeller.name}
                </h3>
                <p className="font-['Poppins'] text-sm text-(--text-primary-muted)">
                  {currentSeller.url}
                </p>
                <p className="font-['Poppins'] text-xs text-(--text-primary-muted) mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last scraped: {currentSeller.lastScraped}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <DashboardButton
                  variant="secondary"
                  onClick={() => handleManualScrape(currentSeller.id, currentSeller.name)}  
                  disabled={isTriggering || activeJobs.has(currentSeller.id)}
                  className="flex items-center gap-2"
                >
                  {isTriggering || activeJobs.has(currentSeller.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
                      {activeJobs.has(currentSeller.id) ? 'Scraping...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Manual Scrape
                    </>
                  )}
                </DashboardButton>

                {/* Show job status badge */}
                {activeJobs.has(currentSeller.id) && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    Job ID: {activeJobs.get(currentSeller.id)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t-[3px] border-(--border-color)">
              <DashboardToggle
                label="Auto Scrape"
                isActive={currentSeller.isAutoEnabled}
                onChange={() => handleToggleAutoScrape(currentSeller.id, currentSeller.isAutoEnabled)}
              />

              {currentSeller.isAutoEnabled && (
                <div className="flex items-center gap-2">
                  <span className={style.toggleLabel}>
                    Interval:
                  </span>
                  <select
                    value={currentSeller.autoScrapeInterval || 6}
                    onChange={(e) =>
                      updateInterval(currentSeller.id, {
                        isAutoEnabled: currentSeller.isAutoEnabled,
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

        <DashboardCard>
          <div className={styles.cardHeader}>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faPlay} className="text-xl text-(--brand-primary)" />
              <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                Actions
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <DashboardButton
              onClick={handleRunScraper}
            >
              <FontAwesomeIcon icon={faPlay} className="mr-2" />
              Run Scraper
            </DashboardButton>
            
            <DashboardButton
              onClick={handleToggleStatus}
            >
              <FontAwesomeIcon icon={currentSeller.isActive ? faStop : faPlay} className="mr-2" />
              {currentSeller.isActive ? 'Deactivate' : 'Activate'}
            </DashboardButton>

            <DashboardButton
              onClick={() => window.open(currentSeller.url, '_blank')}
            >
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              View Website
            </DashboardButton>

            <DashboardButton
              onClick={() => {
                // TODO: Navigate to edit page
                console.log("Edit seller:", currentSeller.id)
              }}
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              Edit Seller
            </DashboardButton>
          </div>
        </DashboardCard>

        {/* Seller Info Card */}
        <DashboardCard>
          <div className={styles.cardHeader}>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faStore} className="text-xl text-(--brand-primary)" />
              <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                Seller Information
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-(--text-primary-muted)">
                  Seller Name
                </label>
                <p className="font-['Poppins'] text-(--text-primary) font-semibold">
                  {currentSeller.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-(--text-primary-muted)">
                  Website URL
                </label>
                <p className="font-['Poppins'] text-(--text-primary) break-all">
                  <Link 
                    href={currentSeller.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-(--brand-primary) hover:underline"
                  >
                    {currentSeller.url}
                  </Link>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-(--text-primary-muted)">
                  Status
                </label>
                <p className={`font-['Poppins'] font-semibold ${currentSeller.isActive ? 'text-(--brand-primary)' : 'text-(--danger-color)'}`}>
                  {currentSeller.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-(--text-primary-muted)">
                  Last Scraped
                </label>
                <p className="font-['Poppins'] text-(--text-primary)">
                  {currentSeller.lastScraped || "Never"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-(--text-primary-muted)">
                  Success Rate
                </label>
                <p className="font-['Poppins'] text-(--text-primary) font-semibold">
                  {currentSeller.stats.successRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-(--text-primary-muted)">
                  Products Scraped
                </label>
                <p className="font-['Poppins'] text-(--text-primary) font-semibold">
                  {currentSeller.stats.productsScraped.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Statistics Card */}
        <DashboardCard>
          <div className={styles.cardHeader}>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faRefresh} className="text-xl text-(--brand-primary)" />
              <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                Scraping Statistics
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color)">
              <h3 className="font-['Archivo Black'] text-2xl text-(--brand-primary) mb-2">
                {currentSeller.stats.totalRuns}
              </h3>
              <p className="text-(--text-primary-muted)">Total Runs</p>
            </div>
            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color)">
              <h3 className="font-['Archivo Black'] text-2xl text-(--brand-primary) mb-2">
                {currentSeller.stats.productsScraped}
              </h3>
              <p className="text-(--text-primary-muted)">Products Found</p>
            </div>
            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color)">
              <h3 className="font-['Archivo Black'] text-2xl text-(--brand-primary) mb-2">
                {currentSeller.stats.successRate.toFixed(1)}%
              </h3>
              <p className="text-(--text-primary-muted)">Success Rate</p>
            </div>
          </div>
        </DashboardCard>

        
      </div>
    </div>
  )
}