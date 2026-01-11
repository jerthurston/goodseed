import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import { WishlistFolderRaw } from '@/types/wishlist-folder.type';
import { UpdateWishlistFolderInput } from '@/schemas/wishlist-folder.schema';

interface UpdateFolderParams {
  folderId: string;
  data: UpdateWishlistFolderInput;
}

interface UseUpdateWishlistFolderOptions {
  onSuccess?: (updatedFolder: WishlistFolderRaw) => void;
}

/**
 * Hook để update wishlist folder (rename, reorder)
 * 
 * @example
 * ```tsx
 * const { updateFolder, isPending } = useUpdateWishlistFolder({
 *   onSuccess: (updatedFolder) => {
 *     setCurrentFolder(updatedFolder);
 *   }
 * });
 * 
 * // Rename folder
 * updateFolder({ folderId: 'xxx', data: { name: 'New Name' } });
 * ```
 */
export function useUpdateWishlistFolder(options?: UseUpdateWishlistFolderOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ folderId, data }: UpdateFolderParams) => {
      // Validation: Check if at least one field is provided
      if (!data.name && data.order === undefined) {
        toast.error('Please provide at least one field to update');
        throw new Error('No update data provided');
      }

      // Validation: Trim and validate name if provided
      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        if (!trimmedName) {
          toast.error('Folder name cannot be empty');
          throw new Error('Empty folder name');
        }
        data.name = trimmedName;
      }

      // API call
      const response = await api.put<WishlistFolderRaw>(
        `/me/wishlist-folder/${folderId}`,
        data
      );

      return response.data;
    },

    onSuccess: (updatedFolder) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success(`Folder "${updatedFolder.name}" updated successfully!`);

      // Log
      apiLogger.info('[useUpdateWishlistFolder] Folder updated', {
        folderId: updatedFolder.id,
        folderName: updatedFolder.name,
        order: updatedFolder.order
      });

      // Custom callback
      options?.onSuccess?.(updatedFolder);
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Unknown error';

      // Handle specific error cases
      if (error?.response) {
        if (error.response.status === 403) {
          toast.error('You cannot rename the default "Uncategorized" folder');
        } else if (error.response.status === 404) {
          toast.error('Folder not found');
        } else if (error.response.status === 409) {
          // Duplicate folder name
          toast.error(errorMessage);
        } else if (error.response.status === 400) {
          toast.error('Invalid folder data');
        } else {
          toast.error('Unable to update folder');
        }

        apiLogger.logError('[useUpdateWishlistFolder] API error', error, {
          status: error.response.status,
          message: errorMessage
        });
      }
    },
  });

  return {
    updateFolder: mutation.mutate,
    updateFolderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
