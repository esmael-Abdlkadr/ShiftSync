import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Availability, AvailabilityException, AvailabilitySlot, CreateExceptionRequest } from '@/types/user';
import { userKeys } from './use-users';

export const availabilityKeys = {
  all: ['availability'] as const,
  user: (userId: string) => [...availabilityKeys.all, 'user', userId] as const,
  exceptions: (userId: string) => [...availabilityKeys.all, 'exceptions', userId] as const,
};

export function useUserAvailability(userId: string) {
  return useQuery({
    queryKey: availabilityKeys.user(userId),
    queryFn: async (): Promise<Availability[]> => {
      const { data } = await api.get<Availability[]>(`/users/${userId}/availability`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useUserAvailabilityExceptions(userId: string) {
  return useQuery({
    queryKey: availabilityKeys.exceptions(userId),
    queryFn: async (): Promise<AvailabilityException[]> => {
      const { data } = await api.get<AvailabilityException[]>(`/users/${userId}/availability/exceptions`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, availability }: { userId: string; availability: AvailabilitySlot[] }): Promise<Availability[]> => {
      const { data } = await api.put<Availability[]>(`/users/${userId}/availability`, { availability });
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useAddAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, exception }: { userId: string; exception: CreateExceptionRequest }): Promise<AvailabilityException> => {
      const { data } = await api.post<AvailabilityException>(`/users/${userId}/availability/exceptions`, exception);
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.exceptions(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useRemoveAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, exceptionId }: { userId: string; exceptionId: string }): Promise<void> => {
      await api.delete(`/users/${userId}/availability/exceptions/${exceptionId}`);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.exceptions(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}
