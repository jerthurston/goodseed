/**
 * Hook to fetch users list for admin
 * Uses Tanstack Query for data fetching and caching
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface FetchUsersParams {
  search?: string;
  role?: 'all' | 'USER' | 'ADMIN' | 'BANNED';
  page?: number;
  limit?: number;
}

interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: Date | null;
  image: string | null;
  acquisitionDate: Date;
  lastActiveAt: Date | null;
  acquisitionSource: string | null;
  lifetimeValue: number | null;
  totalSpent: number | null;
  preferredLanguage: string | null;
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

interface FetchUsersResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    timestamp: string;
    filters: {
      search: string | null;
      role: string;
    };
  };
}

export const useFetchUsers = (params: FetchUsersParams = {}) => {
  const { search = '', role = 'all', page = 1, limit = 20 } = params;

  return useQuery<FetchUsersResponse>({
    queryKey: ['admin', 'users', { search, role, page, limit }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (search) queryParams.append('search', search);
      if (role && role !== 'all') queryParams.append('role', role);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
