'use client';

import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OvertimeWidget } from '@/components/schedule/overtime-widget';
import { OnDutyWidget } from '@/components/dashboard/on-duty-widget';
import { useLocations } from '@/hooks/api/use-locations';
import { useUsers } from '@/hooks/api/use-users';
import { useSwaps } from '@/hooks/api/use-swaps';
import { useDrops } from '@/hooks/api/use-drops';
import { useAuditLogs } from '@/hooks/api/use-audit';
import { useShifts } from '@/hooks/api/use-shifts';
import { useOvertimeCost } from '@/hooks/api/use-analytics';
import { Loader2, CheckCircle2, ArrowLeftRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { SwapRequest, DropRequest } from '@/types/swap';

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getCurrentWeekRange() {
  const start = new Date();
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    dateFrom: start.toISOString().split('T')[0],
    dateTo: end.toISOString().split('T')[0],
  };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_SHIFT: 'created a shift',
  UPDATE_SHIFT: 'updated a shift',
  DELETE_SHIFT: 'deleted a shift',
  ASSIGN_STAFF: 'assigned staff',
  REMOVE_ASSIGNMENT: 'removed an assignment',
  PUBLISH_SHIFT: 'published a shift',
  UNPUBLISH_SHIFT: 'unpublished a shift',
  APPROVE_SWAP: 'approved a swap',
  REJECT_SWAP: 'rejected a swap',
  APPROVE_DROP: 'approved a drop',
  REJECT_DROP: 'rejected a drop',
  UPDATE_USER: 'updated a user',
  DEACTIVATE_USER: 'deactivated a user',
};

function StatCard({
  label,
  value,
  loading,
  href,
  sub,
}: {
  label: string;
  value: number | string;
  loading?: boolean;
  href?: string;
  sub?: string;
}) {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">{label}</p>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      ) : (
        <>
          <p className="text-3xl font-semibold text-slate-900 tabular-nums">{value}</p>
          {sub ? <p className="text-xs text-slate-400 mt-1">{sub}</p> : null}
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}

function NeedsAttention({
  swaps,
  drops,
  loading,
}: {
  swaps: SwapRequest[];
  drops: DropRequest[];
  loading: boolean;
}) {
  const items = [
    ...swaps.map((s) => ({
      id: s.id,
      label: `${s.initiator.firstName} ${s.initiator.lastName} → ${s.target.firstName} ${s.target.lastName}`,
      sub: s.shift.location?.name ?? '',
      badge: 'Swap',
    })),
    ...drops.map((d) => ({
      id: d.id,
      label: `${d.requestor.firstName} ${d.requestor.lastName}`,
      sub: d.shift.location?.name ?? '',
      badge: 'Drop',
    })),
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Needs Attention</p>
        {items.length > 0 && (
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <CheckCircle2 className="h-7 w-7 text-slate-300" />
          <p className="text-sm text-slate-400">Nothing pending</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href="/manager/requests"
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ArrowLeftRight className="h-4 w-4 text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0 ml-2">
                  {item.badge}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <Link
            href="/manager/requests"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Inbox className="h-3.5 w-3.5" />
            View all requests →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const weekStart = getMonday();
  const weekRange = getCurrentWeekRange();

  const { data: locations, isLoading: locationsLoading } = useLocations();
  const { data: usersData, isLoading: usersLoading } = useUsers({ role: 'STAFF', limit: 1 });
  const { data: shifts, isLoading: shiftsLoading } = useShifts({ weekStart, status: 'PUBLISHED' });
  const { data: swaps, isLoading: swapsLoading } = useSwaps({ status: 'PENDING_MANAGER' });
  const { data: drops, isLoading: dropsLoading } = useDrops({ status: 'PENDING_MANAGER' });
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ limit: 6 });
  const { data: overtimeCost, isLoading: overtimeCostLoading } = useOvertimeCost(weekRange);

  const firstLocationId = locations?.[0]?.id ?? '';
  const locationCount = locations?.length ?? 0;
  const staffCount = usersData?.pagination?.total ?? 0;
  const activeShifts = shifts?.length ?? 0;
  const pendingCount = (swaps?.length ?? 0) + (drops?.length ?? 0);
  const pendingLoading = swapsLoading || dropsLoading;

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-white">
        {/* Header */}
        <div className="border-b border-slate-100 px-8 py-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
            Admin Portal
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Good {getGreeting()}, {session?.user?.firstName}.
          </h1>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Stat row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Locations" value={locationCount} loading={locationsLoading} href="/admin/locations" />
            <StatCard label="Total Staff" value={staffCount} loading={usersLoading} href="/admin/users" />
            <StatCard label="Active Shifts" value={activeShifts} loading={shiftsLoading} href="/admin/schedule" />
            <StatCard label="Needs Attention" value={pendingCount} loading={pendingLoading} />
            <StatCard
              label="Projected OT Cost"
              value={`$${(overtimeCost?.summary.overtimeCost ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              loading={overtimeCostLoading}
              href="/admin/reports"
              sub={`Total: $${(overtimeCost?.summary.totalCost ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Needs Attention */}
            <NeedsAttention swaps={swaps ?? []} drops={drops ?? []} loading={pendingLoading} />

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Recent Activity</p>
                <Link href="/admin/audit" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
                  View all →
                </Link>
              </div>
              {auditLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                </div>
              ) : auditData?.entries.length ? (
                <ul className="divide-y divide-slate-100">
                  {auditData.entries.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0 mt-0.5">
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700 leading-snug">
                          <span className="font-medium text-slate-900">
                            {entry.user.firstName} {entry.user.lastName}
                          </span>{' '}
                          {ACTION_LABELS[entry.action] ?? entry.action.toLowerCase().replace(/_/g, ' ')}
                          {entry.location ? (
                            <span className="text-slate-400"> · {entry.location.name}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">No activity yet</p>
              )}
            </div>

            {/* Widgets */}
            <div className="flex flex-col gap-4">
              {firstLocationId && (
                <OvertimeWidget locationId={firstLocationId} weekStart={weekStart} />
              )}
              <OnDutyWidget />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
