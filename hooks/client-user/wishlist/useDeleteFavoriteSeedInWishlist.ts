/**
 * useDeleteFavoriteSeedInWishlist() : Hook để call API route DELETE /api/me/wishlist/[seedId]
 * Chức năng: Xóa một seedProduct khỏi wishlist của user
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

interface DeleteWishlistParams {
  seedId: string; // ID của seed cần xóa khỏi wishlist
}

interface UseDeleteFavoriteSeedOptions {
  onSuccess?: (deletedSeedId: string) => void;
}

/**
 * Hook để xóa seed khỏi wishlist (unfavorite)
 * 
 * @example
 * ```tsx
 * const { removeFromWishlist, isPending } = useDeleteFavoriteSeedInWishlist({
 *   onSuccess: (seedId) => {
 *     console.log('Removed from wishlist:', seedId);
 *   }
 * });
 * 
 * // Remove seed from wishlist
 * removeFromWishlist({ seedId: 'seed-123' });
 * ```
 */
export const useDeleteFavoriteSeedInWishlist = (options?: UseDeleteFavoriteSeedOptions) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seedId }: DeleteWishlistParams) => {
      // Validation
      if (!seedId) {
        toast.error('Seed ID is required');
        throw new Error('Missing seedId');
      }

      apiLogger.debug('[useDeleteFavoriteSeedInWishlist] Removing seed from wishlist', {
        seedId,
      });

      // API call: DELETE /api/me/wishlist/[seedId]
      const response = await api.delete(`/me/wishlist/${seedId}`);

      return { seedId, ...response.data };
    },

    onSuccess: (data) => {
      // Invalidate queries để refetch data mới
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-folders'] });

      // Toast success
      toast.success('Removed from favorites');

      // Log
      apiLogger.info('[useDeleteFavoriteSeedInWishlist] Seed removed from wishlist', {
        seedId: data.seedId,
      });

      // Custom callback
      options?.onSuccess?.(data.seedId);
    },

    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Unknown error';

      // Handle specific error cases
      if (error?.response) {
        if (error.response.status === 404) {
          toast.error('This seed is not in your favorites');
        } else if (error.response.status === 400) {
          toast.error('Invalid seed ID');
        } else if (error.response.status === 401) {
          toast.error('Please login to manage favorites');
        } else {
          toast.error('Unable to remove from favorites');
        }

        apiLogger.logError('[useDeleteFavoriteSeedInWishlist] API error', error, {
          status: error.response.status,
          message: errorMessage,
        });
      } else {
        toast.error('Network error. Please try again.');
        apiLogger.logError('[useDeleteFavoriteSeedInWishlist] Network error', error);
      }
    },
  });

  return {
    removeFromWishlist: mutation.mutate,
    removeFromWishlistAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
};
