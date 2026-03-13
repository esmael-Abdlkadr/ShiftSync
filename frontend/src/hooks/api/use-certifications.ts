import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserLocationCertification } from '@/types/user';
import { userKeys } from './use-users';

export const certificationKeys = {
  all: ['certifications'] as const,
  user: (userId: string) => [...certificationKeys.all, 'user', userId] as const,
};

export function useUserCertifications(userId: string, includeDecertified = false) {
  return useQuery({
    queryKey: [...certificationKeys.user(userId), includeDecertified],
    queryFn: async (): Promise<UserLocationCertification[]> => {
      const { data } = await api.get<UserLocationCertification[]>(
        `/users/${userId}/certifications?includeDecertified=${includeDecertified}`
      );
      return data;
    },
    enabled: !!userId,
  });
}

export function useCertifyLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, locationId }: { userId: string; locationId: string }): Promise<UserLocationCertification> => {
      const { data } = await api.post<UserLocationCertification>(`/users/${userId}/certifications`, { locationId });
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDecertifyLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, locationId }: { userId: string; locationId: string }): Promise<UserLocationCertification> => {
      const { data } = await api.delete<UserLocationCertification>(`/users/${userId}/certifications/${locationId}`);
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useRecertifyLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, locationId }: { userId: string; locationId: string }): Promise<UserLocationCertification> => {
      const { data } = await api.post<UserLocationCertification>(`/users/${userId}/certifications/${locationId}/recertify`);
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
