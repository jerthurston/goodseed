'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

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

//--> define default config for react query
const defaultQueryConfig: DefaultOptions = {
    queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        retry: 1
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

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* tanstack tool chỉ sử dụng ở dev enviroment để debug */}
            <ReactQueryDevtools initialIsOpen={false} position='bottom' />
        </QueryClientProvider>
    )
}