/**
 * Hook to fetch single user detail for admin
 * Uses Tanstack Query for data fetching and caching
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: Date | null;
  image: string | null;
  acquisitionDate: Date;
  lastActiveAt: Date | null;
  acquisitionSource: string | null;
  bio: string | null;
  preferredLanguage: string | null;
  lifetimeValue: number | null;
  totalSpent: number | null;
  totalChatSessions: number;
  notificationPreference: {
    receiveSpecialOffers: boolean;
    receivePriceAlerts: boolean;
    receiveBackInStock: boolean;
  } | null;
  _count: {
    wishlist: number;
    wishlistFolder: number;
  };
}

interface FetchUserDetailResponse {
  user: UserDetail;
}

export const useFetchUserDetail = (userId: string) => {
  return useQuery<FetchUserDetailResponse>({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
