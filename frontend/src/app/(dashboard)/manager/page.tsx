'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Clock, Users, ClipboardList, BarChart3, Calendar, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OnDutyWidget } from '@/components/dashboard/on-duty-widget';
import Link from 'next/link';

export default function ManagerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen overflow-y-auto">
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
                  <p className="text-3xl font-bold text-slate-900 mt-1">8</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Staff On Duty</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">5</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Approvals</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">2</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <OnDutyWidget />
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Manager Actions</h3>
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
                href="/manager/schedule"
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left block"
              >
                <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-slate-900">Overtime</p>
                <p className="text-xs text-slate-500 mt-1">Hours tracking</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
