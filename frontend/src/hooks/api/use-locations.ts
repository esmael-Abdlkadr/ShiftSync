import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Location } from '@/types/user';

export const locationKeys = {
  all: ['locations'] as const,
  list: () => [...locationKeys.all, 'list'] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
};

interface LocationWithManagers extends Location {
  managers: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }[];
  certifiedStaff: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }[];
}

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.list(),
    queryFn: async (): Promise<Location[]> => {
      const { data } = await api.get<Location[]>('/locations');
      return data;
    },
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: async (): Promise<LocationWithManagers> => {
      const { data } = await api.get<LocationWithManagers>(`/locations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
