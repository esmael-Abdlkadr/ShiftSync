import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  SwapRequest,
  CreateSwapRequestPayload,
  RespondSwapPayload,
  ReviewSwapPayload,
} from '@/types/swap';

export const swapKeys = {
  all: ['swaps'] as const,
  lists: () => [...swapKeys.all, 'list'] as const,
  list: (params?: object) => [...swapKeys.lists(), params] as const,
};

export function useSwaps(params?: { status?: string; locationId?: string }) {
  return useQuery({
    queryKey: swapKeys.list(params),
    queryFn: async (): Promise<SwapRequest[]> => {
      const { data } = await api.get<SwapRequest[]>('/swaps', { params });
      return data;
    },
  });
}

export function useCreateSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSwapRequestPayload): Promise<SwapRequest> => {
      const { data } = await api.post<SwapRequest>('/swaps', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: swapKeys.lists() }),
  });
}

export function useRespondToSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & RespondSwapPayload): Promise<SwapRequest> => {
      const { data } = await api.patch<SwapRequest>(`/swaps/${id}/respond`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: swapKeys.lists() }),
  });
}

export function useReviewSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & ReviewSwapPayload): Promise<SwapRequest> => {
      const { data } = await api.patch<SwapRequest>(`/swaps/${id}/review`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: swapKeys.lists() }),
  });
}

export function useCancelSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<SwapRequest> => {
      const { data } = await api.delete<SwapRequest>(`/swaps/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: swapKeys.lists() }),
  });
}
