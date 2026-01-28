'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import type { NotificationPreferenceUpdate } from '@/schemas/notification-preference.schema';
import { toast } from 'sonner';
import { apiLogger } from '@/lib/helpers/api-logger';

interface UpdateNotificationPreferenceResponse {
  message: string;
  data: {
    id: string;
    userId: string;
    receiveSpecialOffers: boolean;
    receivePriceAlerts: boolean;
    receiveBackInStock: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface UpdateNotificationPreferenceError {
  error: string;
  details?: Array<{
    code: string;
    message: string;
    path: string[];
  }>;
}

/**
 * Update user notification preferences
 * 
 * Features:
 * - Zod validation on API side
 * - Automatic cache invalidation (refetch user data)
 * - Toast notifications for success/error
 * - Optimistic updates (optional)
 * - Uses axios instance from lib/api.ts
 * 
 * Usage:
 * ```tsx
 * const { mutate, isPending, error } = useUpdateNotificationPreference();
 * 
 * mutate({
 *   receiveSpecialOffers: true,
 *   receivePriceAlerts: false,
 * });
 * ```
 */
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateNotificationPreferenceResponse,
    AxiosError<UpdateNotificationPreferenceError>,
    NotificationPreferenceUpdate
  >({
    mutationFn: async (data: NotificationPreferenceUpdate) => {
      const response = await api.put<UpdateNotificationPreferenceResponse>(
        '/me/notification-preference',
        data
      );
      return response.data;
    },

    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      // Show success toast
      toast.success('Notification preferences updated successfully');

      apiLogger.debug('✅ [useUpdateNotificationPreference] Updated:', data.data);
    },

    onError: (error) => {
      apiLogger.logError('🔍 [useUpdateNotificationPreference] Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Show error toast with specific message
      const errorMessage =
        error.response?.data?.error || 'Failed to update notification preferences';
      
      toast.error(errorMessage);

      // Log validation errors if any
      if (error.response?.data?.details) {
        apiLogger.logError('Validation errors:', {detail:error.response.data.details});
      }
    },
  });
}
