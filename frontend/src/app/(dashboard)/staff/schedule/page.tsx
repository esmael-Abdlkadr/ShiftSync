'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Calendar, ArrowLeftRight, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useShifts } from '@/hooks/api/use-shifts';
import { SwapRequestModal } from '@/components/swaps/swap-request-modal';
import { DropRequestModal } from '@/components/swaps/drop-request-modal';
import { format, startOfWeek, addWeeks, subWeeks, isAfter, isBefore, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Shift } from '@/types/shift';

function getWeekStart(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export default function StaffSchedulePage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [weekBase, setWeekBase] = useState(() => getWeekStart(new Date()));
  const [swapShift, setSwapShift] = useState<Shift | null>(null);
  const [dropShift, setDropShift] = useState<Shift | null>(null);

  const weekStart = weekBase.toISOString();
  const { data: shifts, isLoading } = useShifts({ weekStart, status: 'PUBLISHED' });

  // Filter to shifts where current user is assigned
  const myShifts = (shifts ?? []).filter((s) =>
    s.assignments.some((a) => a.userId === userId),
  );

  // Group by date string (YYYY-MM-DD)
  const grouped = myShifts.reduce<Record<string, Shift[]>>((acc, s) => {
    const key = format(new Date(s.startTime), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  // Build 7-day date array for the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekBase, i));
  const now = new Date();

  const isPast = (s: Shift) => isBefore(new Date(s.endTime), now);
  const isFuture = (s: Shift) => isAfter(new Date(s.startTime), now);

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">My Schedule</h1>
              <p className="text-xs text-slate-500">Your assigned shifts</p>
            </div>
          </div>

          {/* Week navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekBase(subWeeks(weekBase, 1))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">
              {format(weekBase, 'MMM d')} – {format(addDays(weekBase, 6), 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setWeekBase(addWeeks(weekBase, 1))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekBase(getWeekStart(new Date()))}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              This Week
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center text-slate-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm">Loading schedule…</p>
              </div>
            </div>
          ) : myShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Calendar className="h-12 w-12 mb-3" />
              <p className="text-base font-medium text-slate-600">No shifts this week</p>
              <p className="text-sm mt-1">Check another week or contact your manager.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayShifts = grouped[key] ?? [];
                if (dayShifts.length === 0) return null;

                return (
                  <div key={key}>
                    {/* Day header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">{format(day, 'd')}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">{format(day, 'EEEE, MMMM d')}</p>
                    </div>

                    {/* Shifts for the day */}
                    <div className="ml-11 space-y-2">
                      {dayShifts.map((shift) => {
                        const past = isPast(shift);
                        const future = isFuture(shift);
                        const tz = shift.location.timezone;

                        return (
                          <div
                            key={shift.id}
                            className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 ${
                              past ? 'opacity-60 border-slate-100' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`h-2 w-2 rounded-full shrink-0 ${past ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">
                                  {shift.requiredSkill.name} Shift
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{shift.location.name}</p>
                                <p className="text-xs font-medium text-slate-700 mt-0.5">
                                  {formatInTimeZone(new Date(shift.startTime), tz, 'h:mm a')}
                                  {' – '}
                                  {formatInTimeZone(new Date(shift.endTime), tz, 'h:mm a zzz')}
                                </p>
                              </div>
                            </div>

                            {/* Actions — only for future shifts */}
                            {future && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setSwapShift(shift)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  <ArrowLeftRight className="h-3.5 w-3.5" />
                                  Swap
                                </button>
                                <button
                                  onClick={() => setDropShift(shift)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Drop
                                </button>
                              </div>
                            )}
                            {past && (
                              <span className="text-xs text-slate-400 shrink-0">Completed</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SwapRequestModal
        shift={swapShift ?? ({} as Shift)}
        isOpen={!!swapShift}
        onClose={() => setSwapShift(null)}
        currentUserId={userId ?? ''}
      />
      <DropRequestModal
        shift={dropShift ?? ({} as Shift)}
        isOpen={!!dropShift}
        onClose={() => setDropShift(null)}
      />
    </DashboardLayout>
  );
}
