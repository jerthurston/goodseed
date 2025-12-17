import { apiLogger } from "@/lib/helpers/api-logger";
import { ScraperOperationService } from "@/lib/services/scraper-site/scraper-operation.service";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";


export interface UseScraperOperationsResult {
    // Manual scrape operation
    triggerManualScrape: (id: string) => Promise<void>
    isTriggering: boolean;
    triggerError: Error | null;
    activeJobs: Map<string, string>;

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
        mutationFn: async (id: string) => {
            try {
                const data = await ScraperOperationService.triggerManualScrape(id);
                apiLogger.debug("useScraperOperation.triggerManualScrape", { data });
                return {
                    sellerId: id,
                    ...data
                };
            } catch (error) {
                apiLogger.logError("useScraperOperation.triggerManualScrape", error as Error);
                throw error;
            }
        },

        onSuccess: (response, sellerId) => {
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

    return {
        //Manual scrape operation
        triggerManualScrape: async (id: string) => {
            await triggerMutation.mutateAsync(id);
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
        updateIntervalError: updateIntervalMutation.error
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