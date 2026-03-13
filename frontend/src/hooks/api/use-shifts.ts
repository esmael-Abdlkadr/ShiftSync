import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Shift,
  CreateShiftRequest,
  UpdateShiftRequest,
  QueryShiftsParams,
  WeeklyHoursEntry,
} from '@/types/shift';

export const shiftKeys = {
  all: ['shifts'] as const,
  lists: () => [...shiftKeys.all, 'list'] as const,
  list: (params: QueryShiftsParams) => [...shiftKeys.lists(), params] as const,
  details: () => [...shiftKeys.all, 'detail'] as const,
  detail: (id: string) => [...shiftKeys.details(), id] as const,
  weeklyHours: (locationId: string, weekStart: string) =>
    [...shiftKeys.all, 'weekly-hours', locationId, weekStart] as const,
};

export function useShifts(params: QueryShiftsParams = {}) {
  return useQuery({
    queryKey: shiftKeys.list(params),
    queryFn: async (): Promise<Shift[]> => {
      const searchParams = new URLSearchParams();
      if (params.locationId) searchParams.set('locationId', params.locationId);
      if (params.weekStart) searchParams.set('weekStart', params.weekStart);
      if (params.status) searchParams.set('status', params.status);
      if (params.skillId) searchParams.set('skillId', params.skillId);
      const { data } = await api.get<Shift[]>(`/shifts?${searchParams}`);
      return data;
    },
    enabled: !!params.locationId || !!params.weekStart,
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: shiftKeys.detail(id),
    queryFn: async (): Promise<Shift> => {
      const { data } = await api.get<Shift>(`/shifts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateShiftRequest): Promise<Shift> => {
      const { data } = await api.post<Shift>('/shifts', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: dto }: { id: string; data: UpdateShiftRequest }): Promise<Shift> => {
      const { data } = await api.patch<Shift>(`/shifts/${id}`, dto);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    },
  });
}

export function usePublishShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Shift> => {
      const { data } = await api.post<Shift>(`/shifts/${id}/publish`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    },
  });
}

export function useUnpublishShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Shift> => {
      const { data } = await api.post<Shift>(`/shifts/${id}/unpublish`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    },
  });
}

export function useWeeklyHours(locationId: string, weekStart: string) {
  return useQuery({
    queryKey: shiftKeys.weeklyHours(locationId, weekStart),
    queryFn: async (): Promise<WeeklyHoursEntry[]> => {
      const { data } = await api.get<WeeklyHoursEntry[]>(
        `/shifts/weekly-hours/${locationId}?weekStart=${weekStart}`,
      );
      return data;
    },
    enabled: !!locationId && !!weekStart,
  });
}
