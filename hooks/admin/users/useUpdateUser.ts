/**
 * Hook to update user for admin
 * Uses Tanstack Query mutation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UpdateUserPayload {
  name?: string;
  role?: string;
  bio?: string;
  preferredLanguage?: string;
}

interface UpdateUserResponse {
  message: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    bio: string | null;
    preferredLanguage: string | null;
  };
}

export const useUpdateUser = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateUserResponse, Error, UpdateUserPayload>({
    mutationFn: async (data: UpdateUserPayload) => {
      const response = await api.patch(`/admin/users/${userId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] });
      
      toast.success(data.message || 'User updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user');
    }
  });
};
