'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { 
  CreateWishlistFolderInput, 
  WishlistFolderResponse 
} from '@/schemas/wishlist-folder.schema';
import { WishlistFolderUI } from '@/types/wishlist-folder.type';

interface UseCreateWishlistFolderOptions {
  existingFolders?: WishlistFolderUI[];
  onSuccess?: (folder: WishlistFolderResponse) => void;
}

/**
 * Hook để tạo wishlist folder mới với validation và state management
 * 
 * @example
 * ```tsx
 * const { createFolder, isPending } = useCreateWishlistFolder({
 *   existingFolders: folders,
 *   onSuccess: (newFolder) => {
 *     setSelectedFolderId(newFolder.id);
 *   }
 * });
 * 
 * // Gọi đơn giản
 * <button onClick={() => createFolder(folderName)}>Create</button>
 * ```
 */
export function useCreateWishlistFolder(options?: UseCreateWishlistFolderOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (name: string): Promise<WishlistFolderResponse> => {
      // 1. Trim và validate empty
      const trimmedName = name.trim();
      
      if (!trimmedName) {
        toast.error('Folder name cannot be empty');
        throw new Error('Empty folder name');
      }

      // 2. Kiểm tra duplicate trong client state (tránh gọi API không cần thiết)
      if (options?.existingFolders) {
        const isDuplicate = options.existingFolders.some(
          folder => folder.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isDuplicate) {
          toast.error(`Folder "${trimmedName}" already exists`);
          throw new Error('Duplicate folder name');
        }
      }

      // 3. Gọi API
      const response = await api.post<WishlistFolderResponse>(
        '/me/wishlist-folder',
        { name: trimmedName }
      );
      return response.data;
    },

    onSuccess: (newFolder) => {
      // Invalidate queries để refetch danh sách folders
      queryClient.invalidateQueries({ 
        queryKey: ['wishlist-folders'] 
      });

      toast.success(`Folder "${newFolder.name}" created successfully!`);
      
      apiLogger.info('[useCreateWishlistFolder] Folder created', {
        folderId: newFolder.id,
        folderName: newFolder.name,
      });

      // Gọi custom onSuccess callback nếu có
      options?.onSuccess?.(newFolder);
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message;
      
      // Chỉ log error từ API, không log validation errors
      if (error?.response) {
        // Handle specific HTTP errors
        if (error.response.status === 409) {
          // Duplicate folder name từ server
          toast.error(errorMessage);
        } else if (error.response.status === 400) {
          // Validation error từ server
          toast.error('Invalid folder name. Please check and try again.');
        } else {
          // Generic server error
          toast.error('Unable to create folder. Please try again.');
        }
        
        apiLogger.logError('[useCreateWishlistFolder] API error', error as Error);
      }
      // Validation errors (empty, duplicate) đã được handle trong mutationFn
    },
  });

  return {
    createFolder: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}
