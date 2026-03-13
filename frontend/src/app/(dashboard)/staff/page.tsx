'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Calendar, ArrowLeftRight, AlertTriangle, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import Link from 'next/link';

export default function StaffDashboard() {
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
            <p className="text-slate-600 mt-1">View your shifts and manage availability.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Upcoming Shifts</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">3</p>
                </div>
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Hours This Week</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">24</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Requests</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">1</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ArrowLeftRight className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Next Shift</h3>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-16 h-16 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white">
                <span className="text-xs font-medium">MAR</span>
                <span className="text-2xl font-bold">14</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Morning Server Shift</p>
                <p className="text-sm text-slate-600">Downtown Location</p>
                <p className="text-sm text-slate-900 font-medium mt-1">9:00 AM - 3:00 PM</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/staff/swaps"
                className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-colors text-left block"
              >
                <Calendar className="w-6 h-6 text-violet-600 mb-2" />
                <p className="font-medium text-slate-900">My Schedule</p>
                <p className="text-xs text-slate-500 mt-1">View all shifts</p>
              </Link>
              <Link
                href="/staff/swaps"
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left block"
              >
                <ArrowLeftRight className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium text-slate-900">Swap Shift</p>
                <p className="text-xs text-slate-500 mt-1">Trade with coworker</p>
              </Link>
              <Link
                href="/staff/swaps"
                className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left block"
              >
                <AlertTriangle className="w-6 h-6 text-amber-600 mb-2" />
                <p className="font-medium text-slate-900">Drop Shift</p>
                <p className="text-xs text-slate-500 mt-1">Request coverage</p>
              </Link>
              <Link
                href="/staff/availability"
                className="p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left block"
              >
                <Clock className="w-6 h-6 text-green-600 mb-2" />
                <p className="font-medium text-slate-900">Availability</p>
                <p className="text-xs text-slate-500 mt-1">Set your hours</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
