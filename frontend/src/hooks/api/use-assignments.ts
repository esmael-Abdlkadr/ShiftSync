import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { shiftKeys } from './use-shifts';
import type { AssignStaffRequest, AssignStaffResponse, EligibleStaffMember } from '@/types/shift';

export function useEligibleStaff(shiftId: string) {
  return useQuery({
    queryKey: ['eligible-staff', shiftId],
    queryFn: async (): Promise<EligibleStaffMember[]> => {
      const { data } = await api.get<EligibleStaffMember[]>(`/shifts/${shiftId}/eligible-staff`);
      return data;
    },
    enabled: !!shiftId,
  });
}

export function useAssignStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shiftId,
      dto,
    }: {
      shiftId: string;
      dto: AssignStaffRequest;
    }): Promise<AssignStaffResponse> => {
      const { data } = await api.post<AssignStaffResponse>(`/shifts/${shiftId}/assign`, dto);
      return data;
    },
    onSuccess: (result, { shiftId }) => {
      if (result.assigned) {
        queryClient.invalidateQueries({ queryKey: shiftKeys.detail(shiftId) });
        queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ['eligible-staff', shiftId] });
      }
    },
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, userId }: { shiftId: string; userId: string }) => {
      await api.delete(`/shifts/${shiftId}/assign/${userId}`);
    },
    onSuccess: (_, { shiftId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(shiftId) });
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['eligible-staff', shiftId] });
    },
  });
}
