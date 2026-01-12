/**
 * Hook để clear toàn bộ seeds trong một wishlist folder
 * (Move tất cả seeds từ folder hiện tại sang Uncategorized)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

interface ClearWishlistFolderOptions {
  onSuccess?: (folderId: string) => void;
  onError?: (error: Error) => void;
}

interface ClearWishlistFolderParams {
  folderId: string;
}

/**
 * Clear wishlist folder by moving all seeds to Uncategorized
 */
export const useClearWishlistFolder = (options?: ClearWishlistFolderOptions) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ folderId }: ClearWishlistFolderParams) => {
      apiLogger.debug('[useClearWishlistFolder] Clearing folder', { folderId });

      // baseURL already includes /api, so just use /me/wishlist-folder/...
      const response = await api.post(`/me/wishlist-folder/${folderId}/clear`);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries để refresh UI
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      toast.success(data.message || 'Folder cleared successfully!');

      apiLogger.info('[useClearWishlistFolder] Success', {
        folderId: variables.folderId,
        movedCount: data.movedCount
      });

      // Callback
      options?.onSuccess?.(variables.folderId);
    },
    onError: (error: any, variables) => {
      const errorMessage = error.response?.data?.error || 'Failed to clear folder';

      // Handle specific errors
      if (error.response?.status === 404) {
        toast.error('Folder not found');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to clear this folder');
      } else if (error.response?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }

      apiLogger.logError('[useClearWishlistFolder] Error', error as Error, {
        folderId: variables.folderId
      });

      // Callback
      options?.onError?.(error as Error);
    }
  });

  return {
    clearFolder: mutation.mutate,
    clearFolderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error
  };
};
