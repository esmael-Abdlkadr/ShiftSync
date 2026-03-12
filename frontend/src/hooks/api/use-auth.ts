import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/user';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async (): Promise<User> => {
      const { data } = await api.get<User>('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<AuthResponse> => {
      const { data } = await api.post<AuthResponse>('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me(), data.user);
    },
    meta: {
      errorMessage: 'Unable to sign in',
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (userData: RegisterRequest): Promise<AuthResponse> => {
      const { data } = await api.post<AuthResponse>('/auth/register', userData);
      return data;
    },
    meta: {
      errorMessage: 'Unable to create user',
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      queryClient.clear();
    },
  });
}

export { getErrorMessage };
