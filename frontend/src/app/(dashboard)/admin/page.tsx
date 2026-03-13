'use client';

import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OvertimeWidget } from '@/components/schedule/overtime-widget';
import { OnDutyWidget } from '@/components/dashboard/on-duty-widget';
import { useLocations } from '@/hooks/api/use-locations';
import { Users, MapPin, Calendar, BarChart3 } from 'lucide-react';
import Link from 'next/link';

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { data: locations } = useLocations();
  const firstLocationId = locations?.[0]?.id ?? '';
  const weekStart = getMonday();

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user?.firstName}!
          </h2>
          <p className="text-slate-600 mt-1">
            Manage all locations, staff, and schedules from here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Locations</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">4</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <Link
            href="/admin/users"
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Staff</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">22</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Shifts</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Requests</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
            <div className="text-sm text-slate-500 text-center py-8">No recent activity</div>
          </div>

          {firstLocationId && (
            <OvertimeWidget locationId={firstLocationId} weekStart={weekStart} />
          )}

          <OnDutyWidget />
        </div>
      </div>
    </DashboardLayout>
  );
}
