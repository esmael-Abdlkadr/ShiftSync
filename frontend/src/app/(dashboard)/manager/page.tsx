'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Clock, ClipboardList, Calendar, Plus, BarChart3 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OnDutyWidget } from '@/components/dashboard/on-duty-widget';
import { useSwaps } from '@/hooks/api/use-swaps';
import { useDrops } from '@/hooks/api/use-drops';
import { useShifts } from '@/hooks/api/use-shifts';
import Link from 'next/link';
import { isToday } from 'date-fns';

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  const weekStart = getMonday();
  const { data: shifts, isLoading: shiftsLoading } = useShifts({ weekStart, status: 'PUBLISHED' });
  const { data: swaps, isLoading: swapsLoading } = useSwaps({ status: 'PENDING_MANAGER' });
  const { data: drops, isLoading: dropsLoading } = useDrops({ status: 'PENDING_MANAGER' });

  const todayShifts = (shifts ?? []).filter((s) => isToday(new Date(s.startTime)));
  const pendingApprovals = (swaps?.length ?? 0) + (drops?.length ?? 0);
  const pendingLoading = swapsLoading || dropsLoading;

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Welcome back, {session?.user?.firstName}!
            </h2>
            <p className="text-slate-600 mt-1">Manage your location schedules and staff.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Today&apos;s Shifts</p>
                  {shiftsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 mt-1">{todayShifts.length}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Approvals</p>
                  {pendingLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 mt-1">{pendingApprovals}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            {/* On duty count comes from live OnDutyWidget, show placeholder stat */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">This Week&apos;s Shifts</p>
                  {shiftsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 mt-1">{shifts?.length ?? 0}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <OnDutyWidget />
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/manager/schedule"
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left block"
              >
                <Plus className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="font-medium text-slate-900">Create Shift</p>
                <p className="text-xs text-slate-500 mt-1">Schedule new shift</p>
              </Link>
              <Link
                href="/manager/schedule"
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left block"
              >
                <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium text-slate-900">View Schedule</p>
                <p className="text-xs text-slate-500 mt-1">Weekly calendar</p>
              </Link>
              <Link
                href="/manager/requests"
                className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left block"
              >
                <ClipboardList className="w-6 h-6 text-amber-600 mb-2" />
                <p className="font-medium text-slate-900">Approvals</p>
                <p className="text-xs text-slate-500 mt-1">Swap & drop requests</p>
              </Link>
              <Link
                href="/admin/reports"
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left block"
              >
                <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-slate-900">Analytics</p>
                <p className="text-xs text-slate-500 mt-1">Hours & overtime</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
