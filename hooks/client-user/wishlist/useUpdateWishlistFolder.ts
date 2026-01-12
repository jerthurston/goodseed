import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

interface UpdateWishlistFolderParams {
  seedId: string;
  folderId: string;
}

interface UseUpdateWishlistFolderOptions {
  onSuccess?: (data: { seedId: string; folderId: string }) => void;
  onError?: (error: any) => void;
}

/**
 * Hook để update folder của seed trong wishlist
 * 
 * Use cases:
 * - Move seed from one folder to another
 * - Assign seed to a specific folder
 * 
 * @example
 * ```tsx
 * const { updateFolder, isPending } = useUpdateWishlistFolder({
 *   onSuccess: () => {
 *     console.log('Folder updated!');
 *   }
 * });
 * 
 * // Move seed to different folder
 * updateFolder({ seedId: 'seed-123', folderId: 'folder-456' });
 * ```
 */
export const useUpdateWishlistFolder = (options?: UseUpdateWishlistFolderOptions) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seedId, folderId }: UpdateWishlistFolderParams) => {
      // Validation
      if (!seedId || !folderId) {
        toast.error('Seed ID and Folder ID are required');
        throw new Error('Missing seedId or folderId');
      }

      // API call: PUT /api/me/wishlist/[seedId]
      const response = await api.put(`/me/wishlist/${seedId}`, {
        folderId,
      });

      return response.data;
    },

    onSuccess: (data, variables) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success(data.message || 'Folder updated!');

      // Log
      apiLogger.info('[useUpdateWishlistFolder] Folder updated', {
        seedId: variables.seedId,
        folderId: variables.folderId,
      });

      // Custom callback
      options?.onSuccess?.({
        seedId: variables.seedId,
        folderId: variables.folderId,
      });
    },

    onError: (error: any, variables) => {
      // Error handling
      if (error?.response?.status === 404) {
        if (error?.response?.data?.error?.includes('Folder not found')) {
          toast.error('Folder not found');
        } else {
          toast.error('Seed not found in wishlist');
        }
      } else if (error?.response?.status === 403) {
        toast.error('You do not have permission to use this folder');
      } else if (error?.response?.status === 401) {
        toast.error('Please log in to manage folders');
      } else {
        toast.error('Failed to update folder');
      }

      // Log error
      apiLogger.logError('[useUpdateWishlistFolder] API error', error);

      // Custom error callback
      options?.onError?.(error);
    },
  });

  return {
    updateFolder: mutation.mutate,
    updateFolderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
};
