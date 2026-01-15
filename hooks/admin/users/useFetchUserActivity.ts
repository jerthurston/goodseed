/**
 * Hook to fetch user activity for admin
 * Uses Tanstack Query for data fetching and caching
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

type ActivityType = 'wishlist' | 'folder' | 'all';

interface FetchActivityParams {
  userId: string;
  limit?: number;
  type?: ActivityType;
}

interface Activity {
  id: string;
  date: string;
  action: string;
  details: string;
  metadata: Record<string, any>;
  type: 'wishlist' | 'folder';
}

interface FetchActivityResponse {
  activities: Activity[];
  user: {
    id: string;
    name: string | null;
  };
  meta: {
    total: number;
    limit: number;
    type: string;
  };
}

export const useFetchUserActivity = ({ userId, limit = 20, type = 'all' }: FetchActivityParams) => {
  return useQuery<FetchActivityResponse>({
    queryKey: ['admin', 'users', userId, 'activity', { limit, type }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      if (type !== 'all') queryParams.append('type', type);

      const response = await api.get(`/admin/users/${userId}/activity?${queryParams.toString()}`);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
