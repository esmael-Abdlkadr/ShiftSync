import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AuditLogEntry,
  AuditLogsResponse,
  QueryAuditParams,
} from '@/types/audit';

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: QueryAuditParams) => [...auditKeys.lists(), params] as const,
  shift: (shiftId: string) => [...auditKeys.all, 'shift', shiftId] as const,
};

export function useAuditLogs(params: QueryAuditParams = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: async (): Promise<AuditLogsResponse> => {
      const search = new URLSearchParams();
      if (params.locationId) search.set('locationId', params.locationId);
      if (params.dateFrom) search.set('dateFrom', params.dateFrom);
      if (params.dateTo) search.set('dateTo', params.dateTo);
      if (params.entityType) search.set('entityType', params.entityType);
      if (params.action) search.set('action', params.action);
      if (params.actorId) search.set('actorId', params.actorId);
      if (params.page) search.set('page', String(params.page));
      if (params.limit) search.set('limit', String(params.limit));
      const { data } = await api.get<AuditLogsResponse>(`/audit?${search}`);
      return data;
    },
  });
}

export function useShiftAuditHistory(shiftId: string) {
  return useQuery({
    queryKey: auditKeys.shift(shiftId),
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data } = await api.get<AuditLogEntry[]>(
        `/audit/shift/${shiftId}`,
      );
      return data;
    },
    enabled: !!shiftId,
  });
}
