'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Loader2,
  ArrowLeftRight,
  ArrowDown,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useSocketEvent } from '@/hooks/use-socket';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

function getDestination(n: Notification, role?: string): string {
  const type = n.type;

  // Swap-related → land on swaps tab
  if (
    type === 'SWAP_REQUEST' ||
    type === 'SWAP_ACCEPTED' ||
    type === 'SWAP_REJECTED' ||
    type === 'SWAP_CANCELLED' ||
    type === 'SWAP_APPROVED' ||
    type === 'SWAP_SHIFT_EDITED' ||
    type === 'SWAP_PENDING_APPROVAL' ||
    type === 'SWAP_MANAGER_REJECTED'
  ) {
    return role === 'STAFF' ? '/staff/swaps?tab=swaps' : '/manager/requests?tab=swaps';
  }

  // Drop created / open → land on open-drops tab for manager
  if (type === 'DROP_CREATED') {
    return role === 'STAFF' ? '/staff/swaps?tab=drops' : '/manager/requests?tab=open-drops';
  }

  // Drop claimed → manager needs to approve, land on drop-claims tab
  if (type === 'DROP_CLAIMED') {
    return role === 'STAFF' ? '/staff/swaps?tab=drops' : '/manager/requests?tab=drops';
  }

  // Drop resolved (approved/rejected/cancelled) → staff lands on drops, manager on drop-claims
  if (
    type === 'DROP_APPROVED' ||
    type === 'DROP_CLAIM_REJECTED' ||
    type === 'DROP_CANCELLED'
  ) {
    return role === 'STAFF' ? '/staff/swaps?tab=drops' : '/manager/requests?tab=drops';
  }

  // Availability change → manager staff page
  if (type === 'AVAILABILITY_CHANGED') {
    return role === 'MANAGER' ? '/manager/staff' : '/admin/users';
  }

  // Overtime warning → manager schedule or admin schedule
  if (type === 'OVERTIME_WARNING') {
    return role === 'MANAGER' ? '/manager/schedule' : '/admin/schedule';
  }

  // Shift notifications → go to the relevant schedule
  if (type.startsWith('SHIFT')) {
    return role === 'STAFF'
      ? '/staff/schedule'
      : role === 'MANAGER'
        ? '/manager/schedule'
        : '/admin/schedule';
  }

  return '/notifications';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotifMeta {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  labelBg: string;
  labelText: string;
}

function getNotifMeta(type: string): NotifMeta {
  if (type.startsWith('SWAP'))
    return {
      icon: ArrowLeftRight,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      label: 'Swap',
      labelBg: 'bg-blue-50',
      labelText: 'text-blue-700',
    };
  if (type.startsWith('DROP'))
    return {
      icon: ArrowDown,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      label: 'Drop',
      labelBg: 'bg-purple-50',
      labelText: 'text-purple-700',
    };
  if (type === 'SHIFT_ASSIGNED')
    return {
      icon: Calendar,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Assigned',
      labelBg: 'bg-emerald-50',
      labelText: 'text-emerald-700',
    };
  if (type === 'SHIFT_PUBLISHED')
    return {
      icon: Calendar,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Published',
      labelBg: 'bg-emerald-50',
      labelText: 'text-emerald-700',
    };
  if (type === 'SHIFT_CHANGED')
    return {
      icon: AlertTriangle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      label: 'Shift Changed',
      labelBg: 'bg-orange-50',
      labelText: 'text-orange-700',
    };
  if (type.startsWith('SHIFT'))
    return {
      icon: Calendar,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Schedule',
      labelBg: 'bg-emerald-50',
      labelText: 'text-emerald-700',
    };
  if (type === 'AVAILABILITY_CHANGED')
    return {
      icon: Clock,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      label: 'Availability',
      labelBg: 'bg-sky-50',
      labelText: 'text-sky-700',
    };
  if (type === 'OVERTIME_WARNING' || type.includes('WARN') || type.includes('OVERTIME'))
    return {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      label: 'Overtime',
      labelBg: 'bg-amber-50',
      labelText: 'text-amber-700',
    };
  return {
    icon: Info,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    label: 'Info',
    labelBg: 'bg-slate-50',
    labelText: 'text-slate-600',
  };
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', filter],
    queryFn: () =>
      api
        .get<Notification[]>(
          `/notifications${filter === 'unread' ? '?unread=true' : ''}`,
        )
        .then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useSocketEvent('notification:new', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter pills */}
              <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
                {(['all', 'unread'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filter === f
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                  </button>
                ))}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !notifications?.length ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-200">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Updates about shifts, swaps, and drop requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const meta = getNotifMeta(n.type);
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                      const dest = getDestination(n, role);
                      if (dest !== '/notifications') router.push(dest);
                    }}
                    className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      n.isRead
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-white border-blue-200 shadow-sm hover:border-blue-300'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                      <Icon className={`h-4 w-4 ${meta.iconColor}`} />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-0.5" />
                          )}
                          <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                            {n.title}
                          </p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.labelBg} ${meta.labelText}`}>
                            {meta.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 leading-snug">
                        {n.message}
                      </p>
                    </div>

                    {/* Navigate arrow */}
                    {getDestination(n, role) !== '/notifications' && (
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
