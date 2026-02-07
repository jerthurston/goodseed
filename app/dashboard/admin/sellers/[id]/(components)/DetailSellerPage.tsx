"use client"

import { useParams, useRouter } from "next/navigation"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faArrowLeft,
    faStore,
    faEdit,
    faPlay,
    faStop,
    faToolbox,
    faLink,
    faBug,
    faAdjust
} from '@fortawesome/free-solid-svg-icons'

import { DashboardCard, DashboardButton, DashboardToggle, AdminBreadcrumb } from "@/app/dashboard/(components)"
import { AutoScraperSection } from "@/components/custom/auto-scraper"
import { BeatLoaderSpinner } from "@/components/custom/loading"
import { useFetchSellerById } from "@/hooks/seller"
import { useSellerOperations } from "@/hooks/seller"
import { useAutoScraper } from "@/hooks/admin/auto-scrape/useAutoScraper"
import styles from "@/app/dashboard/(components)/dashboardAdmin.module.css"
import Link from "next/link"
import { toast } from "sonner"
import { useScraperOperations } from "@/hooks/scraper-site/useScraperOperations"
import { apiLogger } from "@/lib/helpers/api-logger"
import SellerScrapeJobLogs from "@/components/custom/scraper-job/SellerScrapeJobLogs"
import { useFetchJobDetail } from "@/hooks/admin/scrape-job"
import { getSellerDetailBreadcrumbs } from "@/app/dashboard/(components)/utils/breadcrumbHelpers"

import style from '@/app/dashboard/(components)/dashboardAdmin.module.css'
import ManageScrapingSourcesModal from "@/components/custom/modals/ManageScrapingSourcesModal"
import ActionConfirmModal from "@/components/custom/modals/ActionConfirmModal"
import UpdateSellerModal from "@/components/custom/modals/UpdateSellerModal"
import { useEffect, useState } from "react"
import { getActiveJob } from "@/lib/helpers/client/get-active-job"

export default function DetailSellerClient() {
    const params = useParams()
    const router = useRouter()
    const sellerId = params?.id as string

    // Separate loading states for different operations
    const [isQuickTestLoading, setIsQuickTestLoading] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
    const [showStopJobModal, setShowStopJobModal] = useState(false)

    // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
    const { seller, isLoading, isFetching, isError, error, refetch: refetchSeller } = useFetchSellerById(sellerId);
    const [activeScrapeJobId, setActiveScrapeJobId] = useState<string | undefined>();

    // Fetch active job detail with real-time polling
    const {
        job: activeJobDetail,
        isLoading: isJobDetailLoading,
        refetch: refetchJobDetail
    } = useFetchJobDetail({
        jobId: activeScrapeJobId,
        sellerId,
        enablePolling: true // Enable 5s polling for active jobs
    });

    // Use seller operations hook for toggle status
    const { toggleSellerStatus, isUpdating, updateError } = useSellerOperations(refetchSeller);


    // Auto scraper hook for enhanced functionality
    const {
        startSellerAutoScraper,
        stopSellerAutoScraper,
        updateSellerInterval,
        isLoading: isAutoScraperLoading,
    } = useAutoScraper()

    // TODO: Cần thiết lập lại hàm refetchScraperSites cho đúng
    const refetchScraperSites = () => {
        // Implement refetch logic here
    }

    const {
        useTriggerScrape,
        isTriggering,
        triggerError,
        activeJobs,
        //Stop
        useStopManualScrape,
        isStoppingJob,
        stopJobError,
        removeActiveJob
    } = useScraperOperations(refetchScraperSites)

    // Modal states
    const [isManageSourcesModalOpen, setIsManageSourcesModalOpen] = useState(false)

    // Check if there's an active scrape job running - disable all operations for safety
    const hasActiveJob = Boolean(activeScrapeJobId);
    const isAnyOperationInProgress = hasActiveJob || isTriggering || isStoppingJob || isQuickTestLoading || isUpdating;



    useEffect(() => {
        // Lấy job đang được thêm vào (pending) từ thông tin của seller có được
        const pendingScrapeJob = getActiveJob(seller);
        const jobId = pendingScrapeJob?.jobId; // ✅ Lấy thông tin jobId trong queue bull để bỏ
        setActiveScrapeJobId(jobId);
    }, [seller]) // ✅ Thêm seller vào dependency

    // Function to show stop job confirmation modal
    const handleStopJob = async (sellerId: string) => {
        if (!activeScrapeJobId) {
            toast.error("No active job found for this seller.");
            return;
        }
        // Show confirmation modal instead of stopping directly
        setShowStopJobModal(true);
    }

    // Function to actually stop the job after confirmation
    const handleConfirmStopJob = async () => {
        if (!activeScrapeJobId) {
            toast.error("No active job found.");
            setShowStopJobModal(false);
            return;
        }

        try {
            // Show loading toast
            toast.loading(`Stopping job ${activeScrapeJobId.slice(0, 8)}...`, {
                id: `stop-${sellerId}`
            });

            // Call stop job function
            await useStopManualScrape(sellerId, activeScrapeJobId);

            // Clear state after successful stop
            setActiveScrapeJobId(undefined);

            toast.dismiss(`stop-${sellerId}`);
            toast.success(`Job stopped successfully`);
        } catch (error) {
            toast.dismiss(`stop-${sellerId}`);
            // Error toast already shown by hook's onError handler
            apiLogger.logError("Failed to stop job:", error as Error, { sellerId });
        } finally {
            setShowStopJobModal(false);
        }
    }

    const handleManualScrape = async (sellerId: string, sellerName: string) => {
        try {
            // Show loading toast
            toast.loading(`Initiating scrape for ${sellerName}...`, {
                id: `scrape-${sellerId}`
            });

            // Option 1: test manual trigger với fullsiteCrawl. Let schema defaults handle startPage/endPage
            const scrapingConfig = { fullSiteCrawl: true };
            // Option 2: test với số page cố định với startPage và endPage
            // const scrapingConfig = { startPage: 1, endPage: 30 };
            const result = await useTriggerScrape(sellerId, scrapingConfig);

            // Success toast
            toast.dismiss(`scrape-${sellerId}`);
            toast.success(`Manual scrape started for ${sellerName}!`, {
                description: "Check the jobs panel for progress updates"
            });

            // Refetch seller data to update UI with new job
            setTimeout(() => {
                refetchSeller();
            }, 1000);

        } catch (error) {
            // Dismiss loading toast
            toast.dismiss(`scrape-${sellerId}`);

            // Error toast with specific message
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            toast.error(`Manual scrape failed for ${sellerName}`, {
                description: errorMessage
            });

            apiLogger.logError("Manual scrape failed:", error as Error, { sellerId, sellerName });
        }
    }

    const handleQuickTest = async (sellerId: string, sellerName: string) => {
        try {
            setIsQuickTestLoading(true)

            // Show loading toast
            toast.loading(`Starting quick test for ${sellerName} (2 pages)...`, {
                id: `test-${sellerId}`
            });
            // Quick test with 2 pages
            const result = await useTriggerScrape(
                sellerId,
                {
                    startPage: 1,
                    endPage: 2,
                    fullSiteCrawl: false,
                    mode: 'test'
                }
            );
            // Success toast
            toast.dismiss(`test-${sellerId}`);
            toast.success(`Quick test started for ${sellerName}!`, {
                description: "Testing first 2 pages only - check results in ~30 seconds"
            });

            setIsQuickTestLoading(false);

            // Refetch seller data to update UI with new job
            setTimeout(() => {
                refetchSeller();
            }, 1000);

        } catch (error) {
            // Dismiss loading toast
            toast.dismiss(`test-${sellerId}`);

            // Error toast
            toast.error(`Quick test failed for ${sellerName}`, {
                description: error instanceof Error ? error.message : "Unknown error occurred"
            });

            apiLogger.logError("Quick test failed:", error as Error);
            setIsQuickTestLoading(false)
        }
    }

    const handleToggleAutoScrape = async (sellerId: string, currentIsAutoEnabled: boolean) => {
        if (hasActiveJob) {
            toast.error('Cannot change auto scrape settings while scraping job is running', {
                description: 'Please wait for the current job to complete or stop it first.'
            });
            return;
        }

        try {
            if (currentIsAutoEnabled) {
                // Disable: set autoScrapeInterval to null
                await updateSellerInterval.mutateAsync({
                    sellerId,
                    interval: null
                });
            } else {
                // Enable: set autoScrapeInterval to default 24 hours
                await updateSellerInterval.mutateAsync({
                    sellerId,
                    interval: 6
                });
            }
        } catch (error) {
            apiLogger.logError("Error toggling auto scrape:", { error });
            toast.error(`Failed to ${currentIsAutoEnabled ? 'disable' : 'enable'} auto scrape`);
        }
    }

    const handleIntervalChange = async (sellerId: string, interval: number) => {
        if (hasActiveJob) {
            toast.error('Cannot change scraping interval while scraping job is running', {
                description: 'Please wait for the current job to complete or stop it first.'
            });
            return;
        }

        try {
            await updateSellerInterval.mutateAsync({
                sellerId,
                interval
            });
        } catch (error) {
            apiLogger.logError("Error updating interval:", { error });
            toast.error("Failed to update scraping interval");
        }
    }
    const handleConfigSource = () => {
        if (hasActiveJob) {
            toast.error('Cannot configure sources while scraping job is running', {
                description: 'Please wait for the current job to complete or stop it first.'
            });
            return;
        }
        setIsManageSourcesModalOpen(true);
    }

    const handleConfirmToggle = async () => {
        if (!seller) return;

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

    const handleEditSeller = (sellerId: string) => {
        if (hasActiveJob) {
            toast.error('Cannot edit seller while scraping job is running', {
                description: 'Please wait for the current job to complete or stop it first.'
            });
            return;
        }
        setIsUpdateModalOpen(true);
    };

    const handleUpdateSellerSuccess = () => {
        // Refetch seller data after successful update
        refetchSeller();

        // Show success toast
        toast.success('Seller Updated', {
            description: 'The seller has been updated successfully',
            duration: 3000,
        });
    };

    const handleToggleStatus = () => {
        if (hasActiveJob) {
            toast.error('Cannot change seller status while scraping job is running', {
                description: 'Please wait for the current job to complete or stop it first.'
            });
            return;
        }
        setShowConfirmModal(true);
    };

    // NOW WE CAN HAVE CONDITIONAL RETURNS AFTER ALL HOOKS ARE CALLED

    // ✅ Show BeatLoaderSpinner until ALL data is fully loaded
    // Use isFetching instead of isLoading to catch cache updates when navigating between sellers
    // Also check if seller data matches current sellerId to prevent showing stale data
    const isDataMismatch = seller && seller.id !== sellerId;
    const isInitialLoading = isLoading || isFetching || isDataMismatch || (activeScrapeJobId && isJobDetailLoading);

    if (isInitialLoading) {
        return <BeatLoaderSpinner />;
    }

    // Check for error or missing seller FIRST before accessing seller properties
    if (isError || !seller) {
        return (
            <div className="max-w-360 w-full min-h-screen bg-(--bg-main) p-6">
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
                        variant="outline"
                        onClick={() => router.push("/dashboard/admin")}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                        <span className="hidden lg:block">
                            Back to Dashboard
                        </span>
                    </DashboardButton>
                </div>
            </div>
        )
    }

    // At this point, seller is guaranteed to exist due to the checks above
    // Create a non-null reference for TypeScript
    const currentSeller = seller

    return (
        <div className="max-w-360 mx-auto w-full min-h-screen bg-(--bg-main) p-1 lg:p-6">
            {/* Breadcrumb Navigation */}
            <AdminBreadcrumb items={getSellerDetailBreadcrumbs(currentSeller.name)} />

            {/* Header */}
            <div className="flex flex-col-reverse gap-4 lg:flex-row items-start lg:items-center justify-between">
                <div className="py-2 lg:py-4">
                    <h1 className="text-3xl lg:text-4xl uppercase text-(--brand-primary) tracking-tight mb-2">
                        {currentSeller.name}
                    </h1>
                    <p className="font-['Poppins'] text-(--text-primary-muted)">
                        Seller Details & Management
                    </p>
                </div>
                {/* Back to Button */}
                {/* <DashboardButton
          variant="outline"
          onClick={() => router.push("/dashboard/admin")}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-0 lg:mr-2" />
          <span className="hidden lg:block">
            Back to Dashboard
          </span>
        </DashboardButton> */}
            </div>

            {/*--> Seller Configuration section */}
            <div className="space-y-6">
                <DashboardCard>
                    <div className={styles.cardHeader}>
                        <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={faAdjust} className="text-xl text-(--brand-primary)" />
                            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                                Configuration
                            </h2>
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row w-full gap-2">
                        {/* Scraping Sources Button */}
                        <DashboardButton
                            onClick={handleConfigSource}
                            disabled={hasActiveJob}
                            className={`flex flex-row items-center justify-start${hasActiveJob ? 'opacity-50 cursor-not-allowed' : ''}  `}
                        >
                            <FontAwesomeIcon icon={faLink} className={`mr-2 ${hasActiveJob ? 'opacity-50' : ''}`} />
                            {hasActiveJob ? 'Scraping Sources (Job Running)' : 'Scraping Sources'}
                        </DashboardButton>
                        {/* Hidden/ Deactivate seed product of seller in /seeds */}
                        <DashboardButton
                            variant="outline"
                            onClick={handleToggleStatus}
                            disabled={isAnyOperationInProgress}
                            className={`flex flex-row items-center justify-start ${isAnyOperationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FontAwesomeIcon icon={currentSeller.isActive ? faStop : faPlay} className={`mr-2 ${isAnyOperationInProgress ? 'opacity-50' : ''}`} />
                            {isAnyOperationInProgress
                                ? (currentSeller.isActive ? 'Deactivate (Job Running)' : 'Activate (Job Running)')
                                : (currentSeller.isActive ? 'Deactivate' : 'Activate')
                            }
                        </DashboardButton>
                        {/* Edit Seller Button */}
                        <DashboardButton
                            variant="outline"
                            onClick={() => handleEditSeller(currentSeller.id)}
                            disabled={hasActiveJob}
                            className={`flex flex-row items-center justify-start ${hasActiveJob ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FontAwesomeIcon icon={faEdit} className={`mr-2 ${hasActiveJob ? 'opacity-50' : ''}`} />
                            <span className="whitespace-nowrap">
                                {hasActiveJob ? 'Edit Seller (Job Running)' : 'Edit Seller'}
                            </span>
                        </DashboardButton>
                    </div>
                </DashboardCard>

                {/* Scraper Actions section */}
                <DashboardCard key={currentSeller.id}>
                    <div className="flex flex-col lg:flex-row items-start justify-between gap-2 mb-4">
                        <div>
                            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                                Scraping Actions
                            </h2>
                            {/* <p className="underline text-sm text-(--text-primary-muted)">
                <FontAwesomeIcon icon={faLink} className="mr-1" />
                {currentSeller.url}
              </p> */}
                            {/* <p className="font-['Poppins'] text-xs text-(--text-primary-muted) mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last scraped: {currentSeller.lastScraped}
              </p> */}
                        </div>

                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-4 border-t-[3px] border-(--border-color)  overflow-hidden w-full">
                        <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
                            <DashboardToggle
                                label="Auto Scrape"
                                isActive={currentSeller.isAutoEnabled}
                                onChange={() => handleToggleAutoScrape(currentSeller.id, currentSeller.isAutoEnabled)}
                                disabled={isAnyOperationInProgress}
                            />

                            {currentSeller.isAutoEnabled && (
                                <div className="flex items-center gap-2">
                                    <span className={style.toggleLabel}>
                                        Interval:
                                    </span>
                                    <select
                                        value={currentSeller.autoScrapeInterval || 6}
                                        onChange={(e) => handleIntervalChange(currentSeller.id, Number(e.target.value))}
                                        disabled={isAnyOperationInProgress}
                                        className={style.selectInterval}
                                    >
                                        <option value={6}>Every 6 hours</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Manual Scrape Button trigger */}
                        <div className="flex flex-col gap-2 w-full lg:w-60">
                            {activeScrapeJobId ? (
                                // Stop button - khi có job đang chạy
                                <DashboardButton
                                    variant="danger"
                                    onClick={() => handleStopJob(currentSeller.id)}
                                    disabled={isStoppingJob}
                                    className="flex items-center gap-2"
                                >
                                    {isStoppingJob ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-red-600" />
                                            Stopping...
                                        </>
                                    ) : (
                                        <div className="flex flex-row lg:flex-row gap-1 items-center">
                                            <FontAwesomeIcon icon={faStop} className="h-4 w-4" />
                                            <div className="w-full">
                                                Stop Job
                                                <span className="hidden lg:block">
                                                    (#{activeScrapeJobId.slice(0, 8)})
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </DashboardButton>
                            ) : (
                                // Khi không có job chạy. Hiển thị Manula scraper và Test Quick button
                                <div className="flex flex-col gap-2">
                                    {/* // Start button - khi không có job đang chạy */}
                                    <DashboardButton
                                        variant="secondary"
                                        onClick={() => handleManualScrape(currentSeller.id, currentSeller.name)}
                                        disabled={isAnyOperationInProgress}
                                        className="flex items-center gap-2"
                                    >
                                        {isTriggering ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
                                                Starting Manual...
                                            </>
                                        ) : hasActiveJob ? (
                                            <div className="flex flex-row gap-1 items-center">
                                                <FontAwesomeIcon icon={faToolbox} className="h-3 w-3 opacity-50" />
                                                <div className="w-0 h-5 border border-(--border-color)"></div>
                                                <span className="whitespace-nowrap">
                                                    Manual Scrape (Job Running)
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-row items-center gap-2">
                                                <FontAwesomeIcon icon={faToolbox} size="lg" />
                                                <div className="w-0 h-5 border border-(--border-color)"></div>
                                                <span className="whitespace-nowrap">
                                                    Manual Scrape
                                                </span>
                                            </div>
                                        )}
                                    </DashboardButton>
                                    {/* Quick Test Scrape with first page */}
                                    <DashboardButton
                                        variant="outline"
                                        onClick={() => handleQuickTest(currentSeller.id, currentSeller.name)}
                                        disabled={isAnyOperationInProgress}
                                        className={`flex items-center gap-2 text-sm transition-all duration-200 ${isAnyOperationInProgress ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-50'
                                            }`}
                                    >
                                        {isQuickTestLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-orange-300 border-t-orange-600" />
                                                Testing...
                                            </>
                                        ) : hasActiveJob ? (
                                            <div className="flex flex-col gap-1 items-center flex-1/2">
                                                <FontAwesomeIcon icon={faBug} size="lg" className="opacity-50" />
                                                <div className="w-0 h-5 border border-(--border-color)"></div>
                                                <span className="whitespace-break-spaces">
                                                    Quick Test (Job Running)
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-row items-center gap-2">
                                                <FontAwesomeIcon icon={faBug} size="lg" />
                                                <div className="w-0 h-5 border border-(--border-color)"></div>
                                                <span className="whitespace-nowrap">Quick Test</span>
                                            </div>
                                        )}
                                    </DashboardButton>

                                </div>
                            )}

                            {/* Show job status badge - when active job exists */}
                            {activeScrapeJobId && (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                    Active Job: #{activeScrapeJobId.slice(0, 8)}
                                </div>
                            )}

                            {/* Show error message if triggerError exists */}
                            {triggerError && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                                    <div className="w-2 h-2 bg-red-600 rounded-full" />
                                    <span className="text-xs">
                                        Error: {triggerError.message || "Manual scrape failed"}
                                    </span>
                                </div>
                            )}

                            {/* Quick test status */}
                            {isQuickTestLoading && (
                                <div className="flex items-center gap-2 text-sm text-orange-600">
                                    <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                                    Quick test running...
                                </div>
                            )}
                        </div>
                    </div>
                </DashboardCard>

                {/*--> Auto-scraper status section */}
                <AutoScraperSection
                    seller={{
                        id: currentSeller.id,
                        name: currentSeller.name,
                        isAutoEnabled: currentSeller.isAutoEnabled,
                        autoScrapeInterval: currentSeller.autoScrapeInterval
                    }}
                    onRefresh={() => {
                        // This will trigger a refetch of seller data
                        window.location.reload(); // Simple refresh for now
                    }}
                />

                {/*--> SELLER INFORMATION CARD */}
                <DashboardCard>
                    <div className={styles.cardHeader}>
                        <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={faStore} className="text-xl text-(--brand-primary)" />
                            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
                                Seller Information
                            </h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Column 1: Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Seller ID
                                </label>
                                <p className="font-mono text-(--text-primary) text-xs">
                                    {currentSeller.id}
                                </p>
                            </div>
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
                                    Affiliate Tag
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary)">
                                    {currentSeller.affiliateTag || (
                                        <span className="text-(--text-primary-muted) italic">Not set</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Column 2: Status & Scraping Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Status
                                </label>
                                <p className={`font-['Poppins'] font-semibold ${currentSeller.isActive ? 'text-(--brand-primary)' : 'text-(--danger-color)'}`}>
                                    {currentSeller.isActive ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Last Scrape Status
                                </label>
                                <p className="text-(--text-primary)">
                                    {currentSeller.status ? (
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${currentSeller.status === 'COMPLETED'
                                            ? 'bg-green-100 text-green-800'
                                            : currentSeller.status === 'FAILED'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {currentSeller.status}
                                        </span>
                                    ) : (
                                        <span className="text-(--text-primary-muted) italic">No scrapes yet</span>
                                    )}
                                </p>
                            </div>
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
                                    Auto Scrape Interval
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary)">
                                    {currentSeller.autoScrapeInterval
                                        ? `Every ${currentSeller.autoScrapeInterval} hours`
                                        : (
                                            <span className="text-(--text-primary-muted) italic">Disabled</span>
                                        )
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Column 3: Statistics & Timestamps */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Success Rate
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary) font-semibold">
                                    {currentSeller.stats.successRate.toFixed(1)}%
                                </p>
                                <p className="text-xs text-(--text-primary-muted) mt-1 italic">
                                    Completed / Finished jobs
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Products Scraped
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary) font-semibold">
                                    {currentSeller.stats.productsScraped?.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Total Runs
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary) font-semibold">
                                    {currentSeller.stats.totalRuns}
                                </p>
                                <p className="text-xs text-(--text-primary-muted) mt-1 italic">
                                    Finished jobs only
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Created At
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary) text-sm">
                                    {currentSeller.createdAt}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-(--text-primary-muted)">
                                    Last Updated
                                </label>
                                <p className="font-['Poppins'] text-(--text-primary) text-sm">
                                    {currentSeller.updatedAt}
                                </p>
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                {/* Statistics Card */}
                {/* <DashboardCard>
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
        </DashboardCard> */}

                {/* Scrape Job Logs - Using SellerScrapeJobLogs component */}
                <SellerScrapeJobLogs sellerId={sellerId} />

            </div>

        {/*--> MODALS SECTION */}

            {/* Sources Management Modal */}
            <ManageScrapingSourcesModal
                isOpen={isManageSourcesModalOpen}
                onClose={() => setIsManageSourcesModalOpen(false)}
                sellerId={sellerId}
                sellerName={currentSeller.name}
                onUpdateSuccess={() => {
                    // Optionally refetch seller data if needed
                    console.log('Scraping sources updated')
                }}
            />

            {/* Active/Deactivate confirmation Modal */}
            <ActionConfirmModal
                isOpen={showConfirmModal}
                onClose={handleCloseModal}
                onConfirm={handleConfirmToggle}
                actionType={currentSeller.isActive ? 'deactivate' : 'activate'}
                sellerName={currentSeller.name}
                isLoading={isUpdating}
            />

            {/* Stop Job Confirmation Modal */}
            <ActionConfirmModal
                isOpen={showStopJobModal}
                onClose={() => setShowStopJobModal(false)}
                onConfirm={handleConfirmStopJob}
                actionType="stop-job"
                sellerName={currentSeller.name}
                jobId={activeScrapeJobId}
                isLoading={isStoppingJob}
            />

            {/* Update Seller Modal */}
            <UpdateSellerModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                onUpdateSuccess={handleUpdateSellerSuccess}
                sellerId={currentSeller.id}
            />

        </div>
    )
}