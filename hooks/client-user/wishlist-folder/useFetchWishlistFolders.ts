'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';
import { transformWishlistFolderRawToUI } from '@/lib/transfomers/wishlist-folder/transformWishlistFolderRawToUI';
import { WishlistFolderRaw } from '@/types/wishlist-folder.type';

/**
 * Hook để fetch tất cả wishlist folders của user
 * 
 * @example
 * ```tsx
 * const { folders, isLoading, error } = useFetchWishlistFolders();
 * 
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 * 
 * return folders.map(folder => <FolderItem key={folder.id} {...folder} />);
 * ```
 */
export function useFetchWishlistFolders() {
  const query = useQuery<ReturnType<typeof transformWishlistFolderRawToUI>, Error>({
    queryKey: ['wishlist-folders'],
    queryFn: async () => {
      try {
        const response = await api.get<WishlistFolderRaw[]>('/me/wishlist-folder');
        apiLogger.debug('[useFetchWishlistFolders] folders before transforming', {folders: response.data});
        // transform response data
        const wishlistFolders = response.data
        const folders = transformWishlistFolderRawToUI(wishlistFolders)
        apiLogger.debug('[useFetchWishlistFolders]  folders after transforming', {folders});
        return folders;
      } catch (error) {
        apiLogger.logError('[useFetchWishlistFolders]', error as Error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    folders: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
