'use client';

import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AvailabilityGrid } from '@/components/availability/availability-grid';

export default function StaffAvailabilityPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-white">
        <div className="border-b border-slate-100 px-8 py-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Staff Portal</p>
          <h1 className="text-xl font-semibold text-slate-900">My Availability</h1>
          <p className="text-sm text-slate-400 mt-0.5">Set your weekly hours and manage one-off exceptions</p>
        </div>
        <div className="max-w-2xl mx-auto px-8 py-6">

          {status === 'loading' || !userId ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <AvailabilityGrid userId={userId} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
