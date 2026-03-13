import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PaginatedUsers,
  UserWithDetails,
  UpdateUserRequest,
  QueryUsersParams,
  User,
} from '@/types/user';
import type { ImportResult } from '@/components/ui/csv-import/csv-import-modal';
import type { ImportUserRow } from '@/lib/validations/csv-import';
import type { CreateUserFormData } from '@/lib/validations/auth';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: QueryUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(params: QueryUsersParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async (): Promise<PaginatedUsers> => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.role) searchParams.set('role', params.role);
      if (params.locationId) searchParams.set('locationId', params.locationId);
      if (params.skillId) searchParams.set('skillId', params.skillId);
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const { data } = await api.get<PaginatedUsers>(`/users?${searchParams}`);
      return data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async (): Promise<UserWithDetails> => {
      const { data } = await api.get<UserWithDetails>(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserRequest }): Promise<User> => {
      const { data: response } = await api.patch<User>(`/users/${id}`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserFormData): Promise<User> => {
      const { data: response } = await api.post<{ user: User }>('/auth/register', data);
      return response.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useImportUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: ImportUserRow[]): Promise<ImportResult> => {
      const { data } = await api.post<ImportResult>('/users/import', { rows });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
