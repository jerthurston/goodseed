import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HomepageContentInput } from '@/schemas/content-page.schema';
import api from '@/lib/api';
import axios from 'axios';
import { apiLogger } from '@/lib/helpers/api-logger';

interface UpdateHomepageResponse {
  message: string;
  data: HomepageContentInput;
}

/**
 * Hook to update homepage content
 * Uses Tanstack Query mutation for optimistic updates and cache invalidation
 */
export function useUpdateHomepageContent() {
  const queryClient = useQueryClient();

  return useMutation<UpdateHomepageResponse, Error, HomepageContentInput>({
    mutationFn: async (data: HomepageContentInput) => {
      try {
        apiLogger.debug('Homepage content submission', {
          hasHero: !!data.hero,
          hasHowItWorks: !!data.howItWorks,
          hasFeatures: !!data.features,
          hasCta: !!data.cta,
          howItWorksSteps: data.howItWorks?.steps?.length || 0,
          featuresCount: data.features?.features?.length || 0,
        });

        const response = await api.put<UpdateHomepageResponse>('/admin/cms/homepage', data);
        
        apiLogger.info('Homepage content updated successfully');

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error || 'Failed to update homepage content';
          apiLogger.logError('Homepage content update failed', new Error(errorMessage), {
            status: error.response?.status,
            errorDetails: error.response?.data,
          });
          throw new Error(errorMessage);
        }
        
        apiLogger.logError('Homepage content update failed', error as Error);
        throw error;
      }
    },
    onSuccess: (response) => {
      // Invalidate and refetch homepage content query
      queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'homepage'] });
      
      // Optionally update cache directly with new data
      queryClient.setQueryData(['admin', 'cms', 'homepage'], response.data);
    },
    onError: (error) => {
      apiLogger.logError('Failed to update homepage', error);
    },
  });
}

