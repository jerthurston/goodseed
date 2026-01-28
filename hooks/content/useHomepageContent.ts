import { useQuery } from '@tanstack/react-query';
import type { HomepageContentInput } from '@/schemas/content-page.schema';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * Public hook to fetch homepage content for displaying on the homepage
 * Uses Tanstack Query for caching and SSR support
 */
export function useHomepageContent() {
  return useQuery<HomepageContentInput>({
    queryKey: ['content', 'homepage'],
    queryFn: async () => {
      try {
        apiLogger.debug('Fetching public homepage content');

        const response = await api.get<HomepageContentInput>('/content/homepage');
        
        apiLogger.debug('Public homepage content fetched successfully');

        return response.data;
      } catch (error) {
        apiLogger.logError('Failed to fetch public homepage content', error as Error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - content doesn't change often
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer
    retry: 2,
  });
}
