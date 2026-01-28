'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiLogger } from '@/lib/helpers/api-logger';

interface DeleteAccountResponse {
  message: string;
  deletedUser: {
    id: string;
    email: string;
  };
}

interface DeleteAccountError {
  error: string;
}

/**
 * Delete current user account
 * 
 * Features:
 * - Hard delete with cascade (removes all related data)
 * - Auto sign out after successful deletion
 * - Redirect to homepage
 * - Toast notifications
 * - Uses axios instance from lib/api.ts
 * 
 * Security:
 * - User can only delete their own account
 * - Requires active session
 * - All related data cascade deleted (OAuth, sessions, preferences)
 * 
 * Usage:
 * ```tsx
 * const { mutate: deleteAccount, isPending } = useDeleteAccount();
 * 
 * // In confirmation handler
 * deleteAccount();
 * ```
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<DeleteAccountResponse, AxiosError<DeleteAccountError>, void>({
    mutationFn: async () => {
      const response = await api.delete<DeleteAccountResponse>('/me');
      return response.data;
    },

    onSuccess: async (data) => {
      apiLogger.logResponse('✅ [useDeleteAccount] Account deleted:', data.deletedUser);

      // Clear all cache
      queryClient.clear();

      // Show success message
      toast.success('Your account has been permanently deleted');

      // Sign out user (clear session)
      await signOut({ redirect: false });

      // Redirect to homepage after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    },

    onError: (error) => {
      apiLogger.logError('🔍 [useDeleteAccount] Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Show error message
      const errorMessage = error.response?.data?.error || 'Failed to delete account';
      toast.error(errorMessage);
    },
  });
}
