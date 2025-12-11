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
export function useSeeds(options: UseSeedsInputOptions): UseSeedsOutputResult {
    apiLogger.logRequest('useSeeds', {
        options,
        enabled: options.enabled ?? true
    });

    const query = useQuery({
        queryKey: ['seeds', options],
        queryFn: async () => {
            const startTime = Date.now();
            try {
                const data = await SeedService.fetchSeeds(options);
                const duration = Date.now() - startTime;
                apiLogger.logResponse('useSeeds.queryFn', {}, {
                    rawSeedsCount: data.seeds.length,
                    pagination: data.pagination,
                    duration: `${duration}ms`
                });
                return data;
            } catch (error) {
                apiLogger.logError('useSeeds.queryFn', error as Error);
                throw error;
            }
        },
        enabled: options.enabled ?? true,
        placeholderData: (previousData) => previousData,
        staleTime: 5 * 60 * 1000,
        select: (data) => ({
            // Transform raw data to UI format
            seeds: SeedTransformer.toUIList(data.seeds),
            pagination: data.pagination,
        }),
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