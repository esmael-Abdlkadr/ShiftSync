'use client';

import { useSession } from 'next-auth/react';
import { Clock, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AvailabilityGrid } from '@/components/availability/availability-grid';

export default function StaffAvailabilityPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">My Availability</h1>
              <p className="text-xs text-slate-500">
                Set your weekly recurring hours and add one-off exceptions
              </p>
            </div>
          </div>

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
