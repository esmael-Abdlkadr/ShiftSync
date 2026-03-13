import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Skill, UserSkill } from '@/types/user';
import { userKeys } from './use-users';

export const skillKeys = {
  all: ['skills'] as const,
  list: () => [...skillKeys.all, 'list'] as const,
  detail: (id: string) => [...skillKeys.all, 'detail', id] as const,
  userSkills: (userId: string) => [...skillKeys.all, 'user', userId] as const,
};

export function useSkills() {
  return useQuery({
    queryKey: skillKeys.list(),
    queryFn: async (): Promise<Skill[]> => {
      const { data } = await api.get<Skill[]>('/skills');
      return data;
    },
  });
}

export function useUserSkills(userId: string) {
  return useQuery({
    queryKey: skillKeys.userSkills(userId),
    queryFn: async (): Promise<UserSkill[]> => {
      const { data } = await api.get<UserSkill[]>(`/users/${userId}/skills`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<Skill> => {
      const { data } = await api.post<Skill>('/skills', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list() });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list() });
    },
  });
}

export function useAssignSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, skillId }: { userId: string; skillId: string }): Promise<UserSkill> => {
      const { data } = await api.post<UserSkill>(`/users/${userId}/skills`, { skillId });
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.userSkills(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useRemoveSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, skillId }: { userId: string; skillId: string }): Promise<void> => {
      await api.delete(`/users/${userId}/skills/${skillId}`);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.userSkills(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
