'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users } from 'lucide-react';
import { useSocketEvent } from '@/hooks/use-socket';
import { api } from '@/lib/api';

interface OnDutyStaff {
  userId: string;
  name: string;
  email: string;
  skill: { id: string; name: string };
  shiftStart: string;
  shiftEnd: string;
  location?: { id: string; name: string; timezone: string };
}

interface OnDutyLocation {
  location: { id: string; name: string; timezone: string };
  staff: OnDutyStaff[];
}

function formatTime(utcStr: string, tz: string) {
  return new Date(utcStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
}

export function OnDutyWidget() {
  const { data, isLoading } = useQuery<OnDutyLocation[]>({
    queryKey: ['on-duty'],
    queryFn: () => api.get<OnDutyLocation[]>('/shifts/on-duty').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const [liveData, setLiveData] = useState<OnDutyLocation[] | null>(null);

  useSocketEvent<Record<string, OnDutyStaff[]>>('duty:update', (grouped) => {
    const locations: OnDutyLocation[] = Object.entries(grouped).map(
      ([, entries]) => ({
        location: entries[0]?.location ?? { id: '', name: 'Unknown', timezone: 'UTC' },
        staff: entries,
      }),
    );
    setLiveData(locations);
  });

  const displayed = liveData ?? data ?? [];
  const totalOnDuty = displayed.reduce((sum, loc) => sum + loc.staff.length, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">On Duty Now</h3>
            <p className="text-xs text-slate-500">{totalOnDuty} staff currently working</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {isLoading && !liveData ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No staff currently on duty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((loc) => (
            <div key={loc.location.id}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {loc.location.name}
              </p>
              <div className="space-y-1.5">
                {loc.staff.map((s) => (
                  <div
                    key={s.userId}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                        {s.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.skill?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-600 font-medium">
                        {formatTime(s.shiftStart, loc.location.timezone)}
                        {' – '}
                        {formatTime(s.shiftEnd, loc.location.timezone)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {loc.location.timezone.replace('America/', '')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
