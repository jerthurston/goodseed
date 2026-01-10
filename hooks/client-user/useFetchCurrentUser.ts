'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * User Profile Data (from /api/me)
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  image: string | null;
  notificationPreference: {
    receiveSpecialOffers: boolean;
    receivePriceAlerts: boolean;
    receiveBackInStock: boolean;
  } | null;
}

/**
 * Fetch current authenticated user profile
 * 
 * Features:
 * - Auto cache 5 minutes (staleTime) for user pages
 * - NO CACHE for admin/dashboard pages (per coding instructions)
 * - Refetch on window focus
 * - Retry once on failure
 * - Uses axios instance from lib/api.ts
 * 
 * Usage:
 * ```tsx
 * const { data: user, isLoading, error, refetch } = useCurrentUser();
 * 
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 * 
 * return <div>{user?.name}</div>;
 * ```
 */
export function useFetchCurrentUser() {
  const pathname = usePathname();
  
  // Check if current page is admin/dashboard - NO CACHE per instructions
  const isAdminPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');

  return useQuery<UserProfile, Error>({
    queryKey: ['current-user'],
    
    queryFn: async () => {
      try {
        const response = await api.get<UserProfile>('/me');
        
        apiLogger.debug('✅ [useCurrentUser] User data loaded:', {response:response.data});
        return response.data;
        
      } catch (error) {
        // Log error for debugging
        if (error instanceof AxiosError) {
          apiLogger.logError('🔍 [useCurrentUser] Axios Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          
          // Handle specific status codes
          if (error.response?.status === 401) {
            throw new Error('Unauthorized - Please sign in');
          }
          if (error.response?.status === 404) {
            throw new Error('User not found');
          }
          
          // Get error message from response
          const errorMessage = error.response?.data?.error || error.message;
          throw new Error(errorMessage);
        }
        
        // Generic error
        apiLogger.logError('🔍 [useCurrentUser] Generic Error:', error as Error);
        throw new Error('Failed to fetch user profile');
      }
    },

    // Cache configuration - NO CACHE for dashboard/admin pages
    staleTime: isAdminPage ? 0 : 5 * 60 * 1000, // 0ms for admin, 5min for others
    gcTime: isAdminPage ? 0 : 10 * 60 * 1000, // Garbage collect
    
    // Refetch behavior
    refetchOnWindowFocus: true,
    refetchOnMount: isAdminPage, // Always refetch on admin pages
    
    // Error handling
    retry: 1,
    retryDelay: 1000,
    
    // Don't throw to error boundary
    throwOnError: false,
  });
}
