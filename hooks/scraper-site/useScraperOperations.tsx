import { apiLogger } from "@/lib/helpers/api-logger";
import { ScraperOperationService } from "@/lib/services/scraper-site/scraper-operation.service";
import { useMutation } from "@tanstack/react-query";


export interface UseScraperOperationsResult {
    // Manual scrape operation
    triggerManualScrape: (id: string) => Promise<void>
    isTriggering: boolean;
    triggerError: Error | null;

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
    // Manual scrape operation
    const triggerMutation = useMutation({
        mutationFn: async (id: string) => {
            try {
                const data = await ScraperOperationService.triggerManualScrape(id);
                apiLogger.debug("useScraperOperation.triggerManualScrape", { data });
                return data;
            } catch (error) {
                apiLogger.logError("useScraperOperation.triggerManualScrape", error as Error);
                throw error;
            }
        },
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
        }:{
            id:string;
            settings: {isAutoEnabled:boolean; autoScrapeInterval:number}
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
        isTriggering:triggerMutation.isPending,
        triggerError:triggerMutation.error,

        // Automatic scrape operations
        toggleAutoScrape: async (id: string, currentState: boolean) => {
            await toggleMutation.mutateAsync({ id, currentState });
        },
        isToggling:toggleMutation.isPending,
        toggleError:toggleMutation.error,
        
        // Interval update operation
        updateInterval: async (id: string, settings: { isAutoEnabled: boolean; autoScrapeInterval: number }) => {
            await updateIntervalMutation.mutateAsync({ id, settings });
        },
        isUpdatingInterval:updateIntervalMutation.isPending,
        updateIntervalError:updateIntervalMutation.error
    }
}