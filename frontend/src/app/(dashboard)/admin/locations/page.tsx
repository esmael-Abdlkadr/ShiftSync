'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useLocations } from '@/hooks/api/use-locations';
import { MapPin, Users, Briefcase, Calendar, Clock, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Location } from '@/types/user';

function LocationCard({ location }: { location: Location }) {
  const count = location._count;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{location.name}</h3>
            {location.address && (
              <p className="text-sm text-slate-400 mt-0.5">{location.address}</p>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
          <Clock className="h-3 w-3" />
          {location.timezone}
        </span>
      </div>

      {/* Stats */}
      {count && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Managers</span>
            </div>
            <p className="text-lg font-semibold text-slate-900 tabular-nums">{count.managers}</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Staff</span>
            </div>
            <p className="text-lg font-semibold text-slate-900 tabular-nums">{count.certifiedStaff}</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Shifts</span>
            </div>
            <p className="text-lg font-semibold text-slate-900 tabular-nums">{count.shifts}</p>
          </div>
        </div>
      )}

      {/* Action */}
      <Link
        href={`/admin/schedule?locationId=${location.id}`}
        className="flex items-center justify-between text-sm text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg px-4 py-2.5 hover:bg-slate-50 transition-colors mt-auto"
      >
        <span>View schedule</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocations();

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-white">
        {/* Header */}
        <div className="border-b border-slate-100 px-8 py-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
            Admin Portal
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Locations</h1>
          <p className="text-sm text-slate-400 mt-0.5">All restaurant locations and their current status</p>
        </div>

        <div className="px-8 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : !locations?.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <MapPin className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">No locations found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
