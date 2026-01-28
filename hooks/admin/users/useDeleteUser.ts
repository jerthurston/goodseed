/**
 * Hook to delete user for admin
 * Uses Tanstack Query mutation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

interface DeleteUserResponse {
  message: string;
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteUserResponse, Error, string>({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      
      toast.success(data.message || 'User deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete user');
    }
  });
};
