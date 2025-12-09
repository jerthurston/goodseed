import api from "@/lib/api";
import { apiLogger } from "@/lib/helpers/api-logger";
import { SeedApiResponseRaw, UseSeedsInputOptions } from "@/types/seed.type";

export class SeedService {
    private static CACHE_KEY_PREFIX = 'seed_service_';
    private static CACHE_KEY_LIST = 'seed_service_list';

    public static async fetchSeeds(
        options: UseSeedsInputOptions
    ): Promise<SeedApiResponseRaw> {
        const startTime = Date.now();
        const params = new URLSearchParams();

        // Search keyword
        if (options.searchKeyword?.trim()) {
            params.append('search', options.searchKeyword.trim());
        }

        // Filters
        if (options.filters?.cannabisTypes?.length) {
            params.append('cannabisTypes', options.filters.cannabisTypes.join(','));
        }
        if (options.filters?.seedTypes?.length) {
            params.append('seedTypes', options.filters.seedTypes.join(','));
        }
        if (options.filters?.priceRange) {
            params.append('minPrice', options.filters.priceRange.min.toString());
            params.append('maxPrice', options.filters.priceRange.max.toString());
        }
        if (options.filters?.thcRange) {
            params.append('minTHC', options.filters.thcRange.min.toString());
            params.append('maxTHC', options.filters.thcRange.max.toString());
        }
        if (options.filters?.cbdRange) {
            params.append('minCBD', options.filters.cbdRange.min.toString());
            params.append('maxCBD', options.filters.cbdRange.max.toString());
        }

        // Sorting
        if (options.sortBy) {
            const sortByValue = Array.isArray(options.sortBy)
                ? options.sortBy[0] // Take first if array
                : options.sortBy;
            params.append('sortBy', sortByValue);
        }
        if (options.sortOrder) {
            params.append('sortOrder', options.sortOrder);
        }

        // Pagination
        params.append('page', (options.page || 1).toString());
        params.append('limit', (options.limit || 20).toString());

        const url = `/seed?${params.toString()}`;

        // Log request
        apiLogger.logRequest('SeedService.fetchSeeds', {
            url,
            options,
            params: Object.fromEntries(params.entries())
        });

        try {
            const response = await api.get<SeedApiResponseRaw>(url);
            const data = response.data;
            const duration = Date.now() - startTime;

            // Log response with metrics
            apiLogger.logResponse('SeedService.fetchSeeds', {
                seedCount: data.seeds?.length || 0,
                total: data.pagination?.total || 0,
                page: data.pagination?.page || 1,
                totalPages: data.pagination?.totalPages || 0,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });

            return data;
        } catch (error) {
            const duration = Date.now() - startTime;
            apiLogger.logError('SeedService.fetchSeeds', error as Error, {
                endpoint: url,
                duration: `${duration}ms`,
            });
            throw error;
        }
    }

}



