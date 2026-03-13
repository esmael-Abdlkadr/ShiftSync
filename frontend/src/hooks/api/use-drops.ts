import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  DropRequest,
  CreateDropRequestPayload,
  ReviewDropPayload,
} from '@/types/swap';

export const dropKeys = {
  all: ['drops'] as const,
  lists: () => [...dropKeys.all, 'list'] as const,
  list: (params?: object) => [...dropKeys.lists(), params] as const,
  open: () => [...dropKeys.all, 'open'] as const,
};

export function useDrops(params?: { status?: string; locationId?: string }) {
  return useQuery({
    queryKey: dropKeys.list(params),
    queryFn: async (): Promise<DropRequest[]> => {
      const { data } = await api.get<DropRequest[]>('/drops', { params });
      return data;
    },
  });
}

export function useOpenDrops() {
  return useQuery({
    queryKey: dropKeys.open(),
    queryFn: async (): Promise<DropRequest[]> => {
      const { data } = await api.get<DropRequest[]>('/drops/open');
      return data;
    },
  });
}

export function useCreateDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDropRequestPayload): Promise<DropRequest> => {
      const { data } = await api.post<DropRequest>('/drops', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dropKeys.lists() }),
  });
}

export function useClaimDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<DropRequest> => {
      const { data } = await api.patch<DropRequest>(`/drops/${id}/claim`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dropKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dropKeys.open() });
    },
  });
}

export function useReviewDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & ReviewDropPayload): Promise<DropRequest> => {
      const { data } = await api.patch<DropRequest>(`/drops/${id}/review`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dropKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dropKeys.open() });
    },
  });
}

export function useCancelDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<DropRequest> => {
      const { data } = await api.delete<DropRequest>(`/drops/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dropKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dropKeys.open() });
    },
  });
}
