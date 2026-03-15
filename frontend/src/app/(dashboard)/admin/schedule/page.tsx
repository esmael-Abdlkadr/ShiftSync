'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, CalendarPlus, Calendar, CalendarSearch } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { WeekCalendar } from '@/components/schedule/week-calendar';
import { ShiftDetailPanel } from '@/components/schedule/shift-detail-panel';
import { CreateShiftModal } from '@/components/schedule/create-shift-modal';
import { useShifts } from '@/hooks/api/use-shifts';
import { useLocations } from '@/hooks/api/use-locations';
import { useSocketEvent } from '@/hooks/use-socket';
import { useQueryClient } from '@tanstack/react-query';
import { shiftKeys } from '@/hooks/api/use-shifts';
import type { Shift } from '@/types/shift';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export default function SchedulePage() {
  useSession();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);

  useSocketEvent('shift:published', () => {
    queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  });
  useSocketEvent('shift:updated', () => {
    queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  });
  useSocketEvent('assignment:created', () => {
    queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  });

  const { data: locations } = useLocations();
  const locationId = selectedLocationId || locations?.[0]?.id || '';
  const selectedLocation = locations?.find((l) => l.id === locationId);

  const { data: shifts, isLoading } = useShifts({
    locationId,
    weekStart: weekStart.toISOString(),
  });

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setSelectedShift(null);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setSelectedShift(null);
  };

  const goToToday = () => {
    setWeekStart(getMonday(new Date()));
    setSelectedShift(null);
  };

  const goToDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    setWeekStart(getMonday(new Date(e.target.value)));
    setSelectedShift(null);
  };

  const datePickerValue = weekStart.toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Schedule</h1>
              <p className="text-xs text-slate-500">Manage shifts and staff assignments</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" />
            Create Shift
          </button>
        </div>

        {/* Toolbar */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
          {/* Week navigator */}
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-900 min-w-56 text-center">
              {formatWeekRange(weekStart)}
            </span>
            <button onClick={nextWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
            <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Today
            </button>

            {/* Date picker — jump to any week */}
            <div className="relative ml-1">
              <button
                onClick={() => datePickerRef.current?.showPicker()}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
                title="Jump to date"
              >
                <CalendarSearch className="h-4 w-4" />
              </button>
              <input
                ref={datePickerRef}
                type="date"
                value={datePickerValue}
                onChange={goToDate}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Location selector */}
          <select
            value={locationId}
            onChange={(e) => { setSelectedLocationId(e.target.value); setSelectedShift(null); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.timezone})</option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="shrink-0 flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />Draft</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Published (open)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Published (full)</span>
          <span className="flex items-center gap-1.5 ml-auto"><span className="text-amber-500">★</span> Premium shift</span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-hidden flex">
          {/* Calendar area */}
          <div className={`flex-1 overflow-y-auto px-6 py-5 ${selectedShift ? 'pr-0' : ''}`}>
            {isLoading ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                    {Array.from({ length: 2 }).map((__, j) => (
                      <div key={j} className="h-20 bg-slate-50 border border-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <WeekCalendar
                shifts={shifts ?? []}
                weekStart={weekStart}
                locationTimezone={selectedLocation?.timezone ?? 'UTC'}
                onShiftClick={setSelectedShift}
              />
            )}
          </div>

          {/* Detail panel */}
          {selectedShift && (
            <div className="w-72 shrink-0 border-l border-slate-200 h-full min-h-0 overflow-hidden">
              <ShiftDetailPanel
                shift={selectedShift}
                onClose={() => setSelectedShift(null)}
              />
            </div>
          )}
        </div>
      </div>

      <CreateShiftModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        defaultLocationId={locationId}
      />
    </DashboardLayout>
  );
}
