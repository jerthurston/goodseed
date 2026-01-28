import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { FaqContentInput } from '@/schemas/faq.schema';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useFaqContent() {
  return useQuery<FaqContentInput>({
    queryKey: ['content', 'faq'],
    queryFn: async () => {
      try {
        apiLogger.debug('Fetching FAQ content');
        const response = await api.get<FaqContentInput>('/content/faq');
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
    staleTime: 5 * 60 * 1000, // 5 minutes - content doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 2,
  });
}
