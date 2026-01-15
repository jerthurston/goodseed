import { useQuery } from '@tanstack/react-query';
import type { HomepageContentInput } from '@/schemas/content-page.schema';
import api from '@/lib/api';
import axios from 'axios';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Hook to fetch homepage content from API
 * Uses Tanstack Query for caching and state management
 */
export function useFetchHomepageContent(enabled: boolean = true) {
  return useQuery<HomepageContentInput>({
    queryKey: ['admin', 'cms', 'homepage'],
    queryFn: async () => {
      try {
        apiLogger.debug('Fetching homepage content');

        const response = await api.get<HomepageContentInput>('/admin/cms/homepage');
        
        apiLogger.debug('Homepage content fetched successfully');

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error || 'Failed to fetch homepage content';
          apiLogger.logError('Failed to fetch homepage content', new Error(errorMessage), {
            status: error.response?.status,
            errorDetails: error.response?.data,
          });
          throw new Error(errorMessage);
        }
        
        apiLogger.logError('Failed to fetch homepage content', error as Error);
        throw error;
      }
    },
    enabled, // Fetch automatically by default
    staleTime: 1000 * 60 * 5, // 5 minutes - content doesn't change often
    retry: 2,
  });
}
