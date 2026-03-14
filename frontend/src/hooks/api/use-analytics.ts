import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  HoursReport,
  PremiumReport,
  CostReport,
  QueryAnalyticsParams,
} from '@/types/analytics';

export const analyticsKeys = {
  all: ['analytics'] as const,
  hours: (params: QueryAnalyticsParams) => [...analyticsKeys.all, 'hours', params] as const,
  premium: (params: QueryAnalyticsParams) => [...analyticsKeys.all, 'premium', params] as const,
  cost: (params: QueryAnalyticsParams) => [...analyticsKeys.all, 'cost', params] as const,
};

function buildSearchParams(params: QueryAnalyticsParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params.dateTo) search.set('dateTo', params.dateTo);
  if (params.locationId) search.set('locationId', params.locationId);
  return search;
}

export function useHoursReport(params: QueryAnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.hours(params),
    queryFn: async (): Promise<HoursReport> => {
      const { data } = await api.get<HoursReport>(
        `/analytics/hours?${buildSearchParams(params)}`,
      );
      return data;
    },
  });
}

export function usePremiumFairness(params: QueryAnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.premium(params),
    queryFn: async (): Promise<PremiumReport> => {
      const { data } = await api.get<PremiumReport>(
        `/analytics/premium-fairness?${buildSearchParams(params)}`,
      );
      return data;
    },
  });
}

export function useOvertimeCost(params: QueryAnalyticsParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.cost(params),
    queryFn: async (): Promise<CostReport> => {
      const { data } = await api.get<CostReport>(
        `/analytics/overtime-cost?${buildSearchParams(params)}`,
      );
      return data;
    },
  });
}
