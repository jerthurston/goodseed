import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import type { WishlistItemRaw } from '@/types/wishlist.type';

interface CreateWishlistParams {
  seedId: string;
}

interface UseCreateFavoriteSeedOptions {
  onSuccess?: (wishlist: WishlistItemRaw) => void;
}

/**
 * Hook để thêm seed vào wishlist (favorite)
 * 
 * Behavior:
 * - API automatically adds to "Uncategorized" folder
 * - Uncategorized folder is created if it doesn't exist
 * 
 * @example
 * ```tsx
 * const { addToWishlist, isPending } = useCreateFavoriteSeedInWishlist({
 *   onSuccess: (wishlist) => {
 *     console.log('Added to wishlist:', wishlist);
 *   }
 * });
 * 
 * // Add to Uncategorized (automatic)
 * addToWishlist({ seedId: 'seed-123' });
 * ```
 */

/**
 * useCreateFavoriteSeedInWishlist() : Hook để call API route POST /api/me/wishlist
 * @param {string} seedId (theo prisma) - ID của seedProduct cần thêm vào wishlist
 * Chức năng: Thêm hoặc tạo một seedProduct trong wishlist của user (auto-assign to Uncategorized)
 */
export const useCreateFavoriteSeedInWishlist = (options?: UseCreateFavoriteSeedOptions) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seedId }: CreateWishlistParams) => {
      // Validation
      if (!seedId) {
        toast.error('Seed ID is required');
        throw new Error('Missing seedId');
      }

      // API call: POST /api/me/wishlist
      const response = await api.post<WishlistItemRaw>('/me/wishlist', {
        seedId,
      });

      return response.data;
    },

    onSuccess: (wishlist) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success('Added to favorites!');

      // Log
      apiLogger.info('[useCreateFavoriteSeedInWishlist] Seed added to wishlist', {
        wishlistId: wishlist.id,
        seedId: wishlist.seedId,
        folders: wishlist.wishlistFolderItems?.map(item => item.wishlistFolder.name) || [],
      });

      // Custom callback
      options?.onSuccess?.(wishlist);
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Unknown error';

      // Handle specific error cases
      if (error?.response) {
        if (error.response.status === 409) {
          // Duplicate: Seed already in wishlist
          toast.error('This seed is already in your favorites');
        } else if (error.response.status === 404) {
          toast.error('Seed or folder not found');
        } else if (error.response.status === 400) {
          toast.error('Invalid data provided');
        } else {
          toast.error('Unable to add to favorites');
        }

        apiLogger.logError('[useCreateFavoriteSeedInWishlist] API error', error, {
          status: error.response.status,
          message: errorMessage,
        });
      }
    },
  });

  return {
    addToWishlist: mutation.mutate,
    addToWishlistAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
};
