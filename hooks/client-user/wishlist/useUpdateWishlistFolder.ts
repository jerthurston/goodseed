import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

interface UpdateWishlistFoldersParams {
  seedId: string;
  folderIds: string[];
}

interface UseUpdateWishlistFoldersOptions {
  onSuccess?: (data: { seedId: string; folderIds: string[] }) => void;
  onError?: (error: any) => void;
}

/**
 * Hook để update folders của seed trong wishlist (Many-to-Many)
 * 
 * Use cases:
 * - Assign seed to multiple folders
 * - Move seed between folders
 * - Update folder assignments
 * 
 * @example
 * ```tsx
 * const { updateFolders, isPending } = useUpdateWishlistFolders({
 *   onSuccess: () => {
 *     console.log('Folders updated!');
 *   }
 * });
 * 
 * // Assign seed to multiple folders
 * updateFolders({ 
 *   seedId: 'seed-123', 
 *   folderIds: ['folder-1', 'folder-2', 'folder-3'] 
 * });
 * ```
 */
export const useUpdateWishlistFolders = (options?: UseUpdateWishlistFoldersOptions) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seedId, folderIds }: UpdateWishlistFoldersParams) => {
      // Validation
      if (!seedId || !folderIds || folderIds.length === 0) {
        toast.error('Seed ID and at least one Folder ID are required');
        throw new Error('Missing seedId or folderIds');
      }

      // API call: PUT /api/me/wishlist/[seedId]
      const response = await api.put(`/me/wishlist/${seedId}`, {
        folderIds,
      });

      return response.data;
    },

    onSuccess: (data, variables) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success(data.message || 'Folders updated!');

      // Log
      apiLogger.info('[useUpdateWishlistFolders] Folders updated', {
        seedId: variables.seedId,
        folderIds: variables.folderIds,
      });

      // Custom callback
      options?.onSuccess?.({
        seedId: variables.seedId,
        folderIds: variables.folderIds,
      });
    },

    onError: (error: any, variables) => {
      // Error handling
      if (error?.response?.status === 404) {
        toast.error('Seed not found in wishlist');
      } else if (error?.response?.status === 403) {
        toast.error('One or more folders not found or not accessible');
      } else if (error?.response?.status === 401) {
        toast.error('Please log in to manage folders');
      } else {
        toast.error('Failed to update folders');
      }

      // Log error
      apiLogger.logError('[useUpdateWishlistFolders] API error', error);

      // Custom error callback
      options?.onError?.(error);
    },
  });

  return {
    updateFolders: mutation.mutate,
    updateFoldersAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
};

// Backward compatibility: Export old hook name with deprecation warning
/**
 * @deprecated Use useUpdateWishlistFolders instead (supports multiple folders)
 */
export const useUpdateWishlistFolder = useUpdateWishlistFolders;
