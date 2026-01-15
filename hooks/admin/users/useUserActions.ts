/**
 * Hook to perform admin actions on user
 * Uses Tanstack Query mutation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

type AdminAction = 'BAN' | 'UNBAN' | 'VERIFY_EMAIL' | 'PROMOTE' | 'DEMOTE';

interface UserActionPayload {
  userId: string;
  action: AdminAction;
}

interface UserActionResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: Date | null;
  };
}

export const useUserActions = () => {
  const queryClient = useQueryClient();

  return useMutation<UserActionResponse, Error, UserActionPayload>({
    mutationFn: async ({ userId, action }: UserActionPayload) => {
      const response = await api.post(`/admin/users/${userId}/actions`, { action });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', variables.userId] });
      
      toast.success(data.message || 'Action performed successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to perform action');
    }
  });
};
