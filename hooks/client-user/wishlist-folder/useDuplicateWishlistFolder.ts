import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import { WishlistFolderRaw } from '@/types/wishlist-folder.type';

interface UseDuplicateWishlistFolderOptions {
  onSuccess?: (duplicatedFolder: WishlistFolderRaw) => void;
}

/**
 * Hook để duplicate wishlist folder
 * Tạo folder mới với tên gốc + " (Copy)"
 * 
 * @example
 * ```tsx
 * const { duplicateFolder, isPending } = useDuplicateWishlistFolder({
 *   onSuccess: (newFolder) => {
 *     setCurrentFolder(newFolder);
 *   }
 * });
 * 
 * // Duplicate current folder
 * duplicateFolder('folder-id-123');
 * ```
 */
export function useDuplicateWishlistFolder(options?: UseDuplicateWishlistFolderOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (folderId: string) => {
      if (!folderId) {
        toast.error('Folder ID is required');
        throw new Error('Missing folder ID');
      }

      // API call: POST /api/me/wishlist-folder/[id]/duplicate
      const response = await api.post<WishlistFolderRaw>(
        `/me/wishlist-folder/${folderId}/duplicate`
      );

      return response.data;
    },

    onSuccess: (duplicatedFolder) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success(`Folder "${duplicatedFolder.name}" created successfully!`);

      // Log
      apiLogger.info('[useDuplicateWishlistFolder] Folder duplicated', {
        originalId: 'from-mutation-context',
        newFolderId: duplicatedFolder.id,
        newFolderName: duplicatedFolder.name,
        order: duplicatedFolder.order
      });

      // Custom callback
      options?.onSuccess?.(duplicatedFolder);
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Unknown error';

      // Handle specific error cases
      if (error?.response) {
        if (error.response.status === 404) {
          toast.error('Original folder not found');
        } else if (error.response.status === 409) {
          // Duplicate name conflict (nếu có nhiều copies)
          toast.error(errorMessage);
        } else if (error.response.status === 403) {
          toast.error('You cannot duplicate this folder');
        } else {
          toast.error('Unable to duplicate folder');
        }

        apiLogger.logError('[useDuplicateWishlistFolder] API error', error, {
          status: error.response.status,
          message: errorMessage
        });
      }
    },
  });

  return {
    duplicateFolder: mutation.mutate,
    duplicateFolderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
