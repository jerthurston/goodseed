import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { FaqContentInput } from '@/schemas/faq.schema';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useFetchFaqContent(enabled: boolean = true) {
  return useQuery<FaqContentInput>({
    queryKey: ['admin', 'cms', 'faq'],
    queryFn: async () => {
      try {
        apiLogger.debug('Fetching FAQ content for admin');
        const response = await api.get<FaqContentInput>('/admin/cms/faq');
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.error || error.message;
          apiLogger.logError('Failed to fetch FAQ content:', new Error(message));
          throw new Error(message);
        }
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
