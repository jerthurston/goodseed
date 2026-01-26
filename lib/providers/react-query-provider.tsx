'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, useEffect } from 'react';
import { createLocalStoragePersister, PERSIST_CONFIG } from '@/lib/cache/query-persister';

type DefaultOptions = {
    queries?: {
        staleTime?: number;
        gcTime: number;
        refetchOnWindowFocus?: boolean;
        retry?: boolean | number;
    }
}
//--> có thể truyền defaultOptions để caching stratergy được linh hoạt hơn
interface ReactQueryProviderProps {
    children: React.ReactNode;
    defaultOptions?: DefaultOptions;
}

//--> define default config for react query with cannabis-specific coordination
const defaultQueryConfig: DefaultOptions = {
    queries: {
        staleTime: 30 * 1000,       // 30s - coordinate with Cloudflare 60s TTL
        gcTime: 5 * 60 * 1000,      // 5min browser memory retention
        refetchOnWindowFocus: false, // Avoid unnecessary refetches
        retry: 3                     // More retries for cannabis compliance reliability
    }
}

export function ReactQueryProvider({
    children,
    defaultOptions
}: ReactQueryProviderProps) {
    const [queryClient] = useState(
        () => new QueryClient({
            defaultOptions: defaultOptions || defaultQueryConfig,
        })
    );

    // Create persister once
    const [persister] = useState(() => createLocalStoragePersister());

    if (!persister) {
        // Fallback if localStorage not available
        console.log('[Cache] localStorage not available, using memory-only cache');
        return (
            <QueryClientProvider client={queryClient}>
                {children}
                <ReactQueryDevtools initialIsOpen={false} position='bottom' />
            </QueryClientProvider>
        );
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: PERSIST_CONFIG.MAX_AGE, // 24 hours
                dehydrateOptions: {
                    shouldDehydrateQuery: (query) => {
                        const key = query.queryKey[0] as string;
                        // Only persist seeds queries
                        return key === 'seeds';
                    },
                },
            }}
            onSuccess={() => {
                console.log('[Cache] ✅ Persistence enabled for /seeds queries (24h TTL, 2MB limit)');
            }}
        >
            {children}
            <ReactQueryDevtools initialIsOpen={false} position='bottom' />
        </PersistQueryClientProvider>
    );
}