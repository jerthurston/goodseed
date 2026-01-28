import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

interface UseDeleteWishlistFolderOptions {
  onSuccess?: () => void;
}

/**
 * Hook để delete wishlist folder
 * Không cho phép xóa folder "Uncategorized"
 * 
 * @example
 * ```tsx
 * const { deleteFolder, isPending } = useDeleteWishlistFolder({
 *   onSuccess: () => {
 *     // Switch to first folder after delete
 *     setCurrentFolder(folders[0]);
 *   }
 * });
 * 
 * // Delete folder
 * deleteFolder('folder-id-123');
 * ```
 */
export function useDeleteWishlistFolder(options?: UseDeleteWishlistFolderOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (folderId: string) => {
      if (!folderId) {
        toast.error('Folder ID is required');
        throw new Error('Missing folder ID');
      }

      // API call: DELETE /api/me/wishlist-folder/[id]
      const response = await api.delete(`/me/wishlist-folder/${folderId}`);

      return response.data;
    },

    onSuccess: (data, folderId) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success('Folder deleted successfully!');

      // Log
      apiLogger.info('[useDeleteWishlistFolder] Folder deleted', {
        folderId: folderId
      });

      // Custom callback
      options?.onSuccess?.();
    },

    onError: (error: any, folderId) => {
      const errorMessage = error?.response?.data?.error || 'Unknown error';

      // Handle specific error cases
      if (error?.response) {
        if (error.response.status === 403) {
          toast.error('You cannot delete the default "Uncategorized" folder');
        } else if (error.response.status === 404) {
          toast.error('Folder not found');
        } else {
          toast.error('Unable to delete folder');
        }

        apiLogger.logError('[useDeleteWishlistFolder] API error', error, {
          folderId: folderId,
          status: error.response.status,
          message: errorMessage
        });
      }
    },
  });

  return {
    deleteFolder: mutation.mutate,
    deleteFolderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
