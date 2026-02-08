// hooks/seed/useSeeds.tsx

'use client';

import { apiLogger } from '@/lib/helpers/api-logger';
import { SeedService } from '@/lib/services/seed/seed.service';
import { SeedTransformer } from '@/lib/transfomers/seed.transformer';
import { UseSeedsInputOptions, UseSeedsOutputResult } from '@/types/seed.type';
import { useQuery } from '@tanstack/react-query';



/**
 * Custom hook useSeeds với TanStack Query
 */
export function useFetchSeeds(options: UseSeedsInputOptions): UseSeedsOutputResult {
    //--> Log: options input
    apiLogger.logRequest('useSeeds', {
        options,
        enabled: options.enabled ?? true
    });
    // useQuery function with cache testing logs
    const query = useQuery({
        queryKey: ['seeds', options],
        queryFn: async () => {
            const startTime = Date.now();
            apiLogger.logRequest('useSeeds.queryFn', { options });
            try {
                
                const data = await SeedService.fetchSeeds(options);
                const duration = Date.now() - startTime;

                apiLogger.logResponse('useSeeds.queryFn', {}, {
                    rawSeedsCount: data.seeds.length,
                    pagination: data.pagination,
                    duration: `${duration}ms`,
                    cacheSource: 'DATABASE_HIT'
                });

                return data;

            } catch (error) {
                apiLogger.logError('❌ [TanStack] Fetch failed:', error as Error);
                apiLogger.logError('useSeeds.queryFn', error as Error);
                throw error;
            }
        },
        enabled: options.enabled ?? true,
        placeholderData: (previousData) => previousData,
        staleTime: 30 * 1000,  // 30s - coordinate with Cloudflare 60s TTL
        gcTime: 5 * 60 * 1000, // 5min browser retention
        retry: 3,              // Cannabis compliance reliability
        select: (data) => ({
            // Transform raw data to UI format
            seeds: SeedTransformer.toUIList(data.seeds),
            pagination: data.pagination,
        }),
    });

    // Log cache status for testing
    const cacheStatus = query.isStale ? 'STALE' : 'FRESH';
    const dataSource = query.isFetching ? 'FETCHING' : (query.data ? 'CACHE_HIT' : 'NO_DATA');

    apiLogger.logResponse('useSeeds.queryFn', {}, {
        cacheStatus,
        dataSource,
        query: options
    });

    const result: UseSeedsOutputResult = {
        seeds: query.data?.seeds || [],
        pagination: query.data?.pagination || null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };

    apiLogger.logResponse('useSeeds', {}, {
        seedsCount: result.seeds.length,
        pagination: result.pagination,
        isLoading: result.isLoading,
        isFetching: result.isFetching,
        isError: result.isError,
        hasError: !!result.error
    });

    return result;
}