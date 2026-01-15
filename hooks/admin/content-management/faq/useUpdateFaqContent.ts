import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { FaqContentInput } from '@/schemas/faq.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function useUpdateFaqContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FaqContentInput) => {
      try {
        apiLogger.debug('Updating FAQ content', {
          categoriesCount: data.categories.length,
          totalFaqs: data.categories.reduce((sum, cat) => sum + cat.items.length, 0),
        });

        const response = await api.put('/admin/cms/faq', data);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.error || error.message;
          apiLogger.logError('Failed to update FAQ content:', new Error(message));
          throw new Error(message);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate admin FAQ cache
      queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'faq'] });
      // Invalidate public FAQ cache
      queryClient.invalidateQueries({ queryKey: ['content', 'faq'] });
      apiLogger.info('FAQ content updated successfully');
    },
    onError: (error) => {
      apiLogger.logError('Failed to update FAQ content:', error as Error);
    },
  });
}
