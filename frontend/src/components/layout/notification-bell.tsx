'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useSocketEvent } from '@/hooks/use-socket';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
}

interface NotificationItem {
  id: string;
  isRead: boolean;
}

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', 'unread'],
    queryFn: () =>
      api
        .get<NotificationItem[]>('/notifications?unread=true')
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const unreadCount = data?.length ?? 0;

  useSocketEvent<NotificationPayload>('notification:new', (payload) => {
    // Refetch so badge count is accurate
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast(payload.title, { icon: '🔔', duration: 4000 });
  });

  return (
    <span className="relative inline-flex items-center">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </span>
  );
}
