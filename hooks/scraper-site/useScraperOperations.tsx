import { apiLogger } from "@/lib/helpers/api-logger";
import { ScraperOperationService } from "@/lib/services/manual-scraper/scraper-operation.service";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";


export interface UseScraperOperationsResult {
    // Manual scrape operation
    triggerManualScrape: (id: string, scrapingConfig: { fullSiteCrawl?: boolean; startPage?: number; endPage?: number }) => Promise<void>
    isTriggering: boolean;
    triggerError: Error | null;
    activeJobs: Map<string, string>;

//     // Job management - New additions
//   cancelJob: (sellerId: string) => Promise<void>;
//   getJobStatus: (jobId: string) => Promise<any>;
//   clearCompletedJobs: () => void;

    //Job stop operation
    stopManualScrape:(sellerId:string, jobId:string)=>Promise<void>
    isStoppingJob:boolean;
    stopJobError:Error | null;
    removeActiveJob: (sellerId:string) => void;


    // Automatic scrape operations
    toggleAutoScrape: (id: string, currentState: boolean) => Promise<void>;
    isToggling: boolean;
    toggleError: Error | null;
    // Interval update operation
    updateInterval: (id: string, settings: { isAutoEnabled: boolean; autoScrapeInterval: number }) => Promise<void>;
    isUpdatingInterval: boolean;
    updateIntervalError: Error | null;
}

export function useScraperOperations(refetchScraperSites: () => void): UseScraperOperationsResult {

    // giải thích: useState<Map<string,string>>(new Map()) : activeJobs là một Map lưu trữ các job đang chạy, với key là sellerId và value là jobId
    const [activeJobs, setActiveJobs] = useState<Map<string, string>>(new Map())
    // Manual scrape operation
    const triggerMutation = useMutation({
        mutationFn: async ({ id, scrapingConfig }: { id: string; scrapingConfig: { fullSiteCrawl?: boolean; startPage?: number; endPage?: number } }) => {
            try {
                apiLogger.debug("[Params truyền vào hook triggerMutation từ việc bấm manual scrape]", { id, scrapingConfig });
                const data = await ScraperOperationService.triggerManualScrape(id, scrapingConfig);
                apiLogger.debug("useScraperOperation.triggerManualScrape successfully", { data });
                return {
                    sellerId: id,
                    ...data
                };
            } catch (error) {
                apiLogger.logError("useScraperOperation.triggerManualScrape failed", error as Error);
                throw error;
            }
        },

        onSuccess: (response, { id: sellerId }) => {
            if (response.success) {
                const { jobId, sellerName, estimatedDuration } = response.data;
                // track active job
                setActiveJobs(prev => new Map(prev).set(sellerId, jobId))
                // kết quả cảu setActiveJobs là gì: 1 Map có key là sellerId và value là jobId
                // activeJobs sẽ có giá trị là 1 Map chứa các sellerId và jobId tương ứng. Để làm gì?  Để theo dõi các job đang chạy và có thể hủy bỏ chúng nếu cần thiết.

                toast.success(`Manual scrape started for ${sellerName}`, {
                    description: `Job ID: ${jobId} • Estimated: ${estimatedDuration}`,
                    action: {
                        label: "Track Progress",
                        onClick: () => window.open(response.data.statusUrl, '_blank')
                    },
                    duration: 5000
                });
            } else {
                // TODO: viết error handling sau - (function handleScraperError)
                 handleScraperError(response.error, sellerId);
            }
        },

        onError: (error: Error, sellerId) => {
            apiLogger.logError("useScraperOperation.triggerManualScrape", error, { sellerId });
            toast.error("Scraper Error", {
                description: "Unexpected error occurred. Please try again.",
                action: {
                    label: "Retry",
                    onClick: () => triggerMutation.mutate(sellerId)
                }
            });
        }

    })

    // Automatic scrape operations
    const toggleMutation = useMutation({
        mutationFn: async ({ id, currentState }: { id: string; currentState: boolean }) => {
            try {
                const settings = {
                    isAutoEnabled: !currentState,
                    autoScrapeInterval: !currentState ? 6 : 6 // Default to 6 hours when enabling
                };

                const data = await ScraperOperationService.toggleAutoScrape(id, settings);
                apiLogger.debug("useScraperOperation.toggleAutoScrape", { data });
                return data;
            } catch (error) {
                apiLogger.logError("useScraperOperation.toggleAutoScrape", error as Error);
                throw error;
            }

        }
    })

    // Interval update operation
    const updateIntervalMutation = useMutation({
        mutationFn: async ({
            id,
            settings
        }: {
            id: string;
            settings: { isAutoEnabled: boolean; autoScrapeInterval: number }
        }) => {

            try {
                const data = await ScraperOperationService.updateScraperSiteSettings(id, settings);

                apiLogger.logResponse("useScraperOperation.updateInterval", { data });

                return data;
            } catch (error) {
                apiLogger.logError("useScraperOperation.updateInterval", error as Error);
                throw error;
            }
        }
    })

    //Stop job mutation
    const stopManualJobMutation = useMutation({
        mutationFn: async({sellerId, jobId}:{sellerId:string ; jobId:string})=>{
            try {
                // TODO: Replace with actual API call
                apiLogger.debug("UseScraperOperation.stopJob", { sellerId, jobId });
                const result = await ScraperOperationService.stopManualScrape(sellerId, jobId);
                apiLogger.debug("UseScraperOperation.stopJob successfully", {result});
                
                return result;
            } catch (error) {
                apiLogger.logError("UseScraperOperation.stopJob failed", error as Error);
                throw error;
            }
        },

        onSuccess:(response, {sellerId})=>{
            // Remove from active jobs
            setActiveJobs(prev=>{
                const newMap = new Map(prev);
                newMap.delete(sellerId);
                return newMap;
            });

            toast.success("Job stopped successfully", {
                description: "The scraping job has been stopped.",
                duration: 5000
            });

            //  response owr onSuccess để làm gì: có thể dùng để cập nhật UI hoặc trạng thái
            apiLogger.logResponse("useScraperOperation.stopJob", { response });
        },

        onError: (error: Error, { sellerId }) => {
            apiLogger.logError("useScraperOperation.stopJob", error, { sellerId });
            toast.error("Job stop failed", {
                description: "Failed to stop the scraping job. Please try again.",
                duration: 5000
            });
        },

        
    })

    const removeActiveJob = (sellerId: string) => {
            setActiveJobs(prev => {
                const newMap = new Map(prev);
                newMap.delete(sellerId);
                return newMap;
            });
        }

    return {
        //Manual scrape operation
        triggerManualScrape: async (id: string, scrapingConfig: { fullSiteCrawl?: boolean; startPage?: number; endPage?: number }) => {
            await triggerMutation.mutateAsync({ id, scrapingConfig });
        },
        isTriggering: triggerMutation.isPending,
        triggerError: triggerMutation.error,
        activeJobs: activeJobs,

        // Automatic scrape operations
        toggleAutoScrape: async (id: string, currentState: boolean) => {
            await toggleMutation.mutateAsync({ id, currentState });
        },
        isToggling: toggleMutation.isPending,
        toggleError: toggleMutation.error,

        // Interval update operation
        updateInterval: async (id: string, settings: { isAutoEnabled: boolean; autoScrapeInterval: number }) => {
            await updateIntervalMutation.mutateAsync({ id, settings });
        },
        isUpdatingInterval: updateIntervalMutation.isPending,
        updateIntervalError: updateIntervalMutation.error,

        // Manual Stop job operation
        stopManualScrape: async (sellerId: string, jobId:string) => {
            // const jobId = activeJobs.get(sellerId);
            if(!jobId) {
                throw new Error("No active job found for this seller")
            }
            await stopManualJobMutation.mutateAsync({ sellerId, jobId });
        },
        isStoppingJob: stopManualJobMutation.isPending,
        stopJobError: stopManualJobMutation.error,
        removeActiveJob,
    }
}

  // Enhanced error handler with specific messages
  const handleScraperError = (error: any, sellerId: string) => {
    const errorMessages: Record<string, { title: string; description: string; action?: any }> = {
      'SELLER_NOT_FOUND': {
        title: "Seller Not Found",
        description: "The selected seller no longer exists in the database."
      },
      'SELLER_INACTIVE': {
        title: "Seller Inactive", 
        description: "This seller is currently disabled. Please activate it first.",
        action: {
          label: "Activate Seller",
          onClick: () => {/* Navigate to seller settings */}
        }
      },
      'SCRAPER_NOT_IMPLEMENTED': {
        title: "Scraper Not Available",
        description: `Scraper not implemented for this seller. Available sources: ${error.availableSources?.join(', ')}`
      },
      'SCRAPER_SOURCE_NOT_READY': {
        title: "Scraper Not Ready",
        description: "The scraper for this source is not ready for production use."
      },
      'JOB_ALREADY_RUNNING': {
        title: "Scrape Already Running",
        description: "A manual scrape is already in progress for this seller.",
        action: {
          label: "View Progress",
          onClick: () => window.open(error.statusUrl, '_blank')
        }
      },
      'NETWORK_ERROR': {
        title: "Connection Error",
        description: "Failed to connect to the scraper service. Please check your connection."
      }
    };

    const errorConfig = errorMessages[error.code] || {
      title: "Scraper Error",
      description: error.message || "An unknown error occurred."
    };

    toast.error(errorConfig.title, {
      description: errorConfig.description,
      action: errorConfig.action,
      duration: 7000
    });
  };