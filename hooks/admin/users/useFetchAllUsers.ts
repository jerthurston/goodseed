/**
 * Hook to fetch all users for export (no pagination)
 * Uses Tanstack Query for data fetching
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiLogger } from '@/lib/helpers/api-logger';

interface FetchAllUsersParams {
  search?: string;
  role?: 'all' | 'USER' | 'ADMIN' | 'BANNED';
  enabled?: boolean; // Only fetch when explicitly enabled
}

interface UserExportData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: Date | null;
  image: string | null;
  bio: string | null;
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

interface FetchAllUsersResponse {
  users: UserExportData[];
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

export const useFetchAllUsers = (params: FetchAllUsersParams = {}) => {
  const { search = '', role = 'all', enabled = false } = params;

  return useQuery<FetchAllUsersResponse>({
    queryKey: ['admin', 'users', 'export', { search, role }],
    queryFn: async () => {
      apiLogger.info('Fetching all users for export', {
        filters: { search, role }
      });

      const queryParams = new URLSearchParams();
      
      if (search) queryParams.append('search', search);
      if (role && role !== 'all') queryParams.append('role', role);
      queryParams.append('limit', '10000'); // High limit for export
      queryParams.append('page', '1');

      const response = await api.get<FetchAllUsersResponse>(`/admin/users?${queryParams.toString()}`);
      
      apiLogger.info('Fetched all users for export', {
        count: response.data.users.length,
        total: response.data.pagination.total
      });

      return response.data;
    },
    enabled, // Only run when enabled is true
    staleTime: 0, // Always fetch fresh data for export
    gcTime: 1 * 60 * 1000, // 1 minute - clean up quickly after export
    retry: 2, // Retry twice on failure
  });
};

export type { UserExportData, FetchAllUsersResponse };
