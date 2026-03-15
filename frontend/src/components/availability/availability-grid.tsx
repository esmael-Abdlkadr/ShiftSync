'use client';

import { useState } from 'react';
import {
  useUserAvailability,
  useUserAvailabilityExceptions,
  useSetAvailability,
  useAddAvailabilityException,
  useRemoveAvailabilityException,
} from '@/hooks/api/use-availability';
import type { DayOfWeek, AvailabilitySlot, CreateExceptionRequest } from '@/types/user';
import toast from 'react-hot-toast';
import { Loader2, Save, Plus, Trash2, Moon, X } from 'lucide-react';

interface AvailabilityGridProps {
  userId: string;
}

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'MONDAY', label: 'Monday', short: 'Mon' },
  { value: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { value: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { value: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { value: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { value: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

type AvailabilityState = Record<DayOfWeek, DayAvailability>;

const DEFAULT_AVAILABILITY: DayAvailability = {
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
};

function isOvernight(startTime: string, endTime: string): boolean {
  return endTime < startTime && endTime !== '00:00';
}

export function AvailabilityGrid({ userId }: AvailabilityGridProps) {
  const { data: availability, isLoading: availLoading } = useUserAvailability(userId);
  const { data: exceptions, isLoading: exceptionsLoading } = useUserAvailabilityExceptions(userId);

  const setAvailability = useSetAvailability();
  const addException = useAddAvailabilityException();
  const removeException = useRemoveAvailabilityException();

  const buildState = (slots: typeof availability): AvailabilityState =>
    DAYS.reduce((acc, day) => {
      const found = slots?.find((a) => a.dayOfWeek === day.value);
      acc[day.value] = found
        ? { enabled: true, startTime: found.startTime, endTime: found.endTime }
        : { ...DEFAULT_AVAILABILITY };
      return acc;
    }, {} as AvailabilityState);

  const [syncedAvailability, setSyncedAvailability] = useState(availability);
  const [localAvailability, setLocalAvailability] = useState<AvailabilityState>(() => buildState(availability));
  const [hasChanges, setHasChanges] = useState(false);

  if (availability !== syncedAvailability) {
    setSyncedAvailability(availability);
    setLocalAvailability(buildState(availability));
    setHasChanges(false);
  }

  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<CreateExceptionRequest>({
    date: '',
    isAvailable: false,
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
  });

  const handleDayToggle = (day: DayOfWeek) => {
    setLocalAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setLocalAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveAvailability = async () => {
    const slots: AvailabilitySlot[] = DAYS.filter((day) => localAvailability[day.value].enabled).map(
      (day) => ({
        dayOfWeek: day.value,
        startTime: localAvailability[day.value].startTime,
        endTime: localAvailability[day.value].endTime,
      })
    );

    try {
      await setAvailability.mutateAsync({ userId, availability: slots });
      toast.success('Availability saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save availability');
    }
  };

  const handleAddException = async () => {
    if (!exceptionForm.date) {
      toast.error('Please select a date');
      return;
    }

    try {
      await addException.mutateAsync({
        userId,
        exception: exceptionForm,
      });
      toast.success('Exception added');
      setShowExceptionForm(false);
      setExceptionForm({
        date: '',
        isAvailable: false,
        startTime: '09:00',
        endTime: '17:00',
        reason: '',
      });
    } catch {
      toast.error('Failed to add exception');
    }
  };

  const handleRemoveException = async (exceptionId: string) => {
    try {
      await removeException.mutateAsync({ userId, exceptionId });
      toast.success('Exception removed');
    } catch {
      toast.error('Failed to remove exception');
    }
  };

  if (availLoading || exceptionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Weekly availability */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">Weekly Schedule</p>
            <p className="text-xs text-slate-400 mt-0.5">Toggle days and set your available hours</p>
          </div>
          {hasChanges && (
            <button
              onClick={handleSaveAvailability}
              disabled={setAvailability.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {setAvailability.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save changes
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {DAYS.map((day) => {
            const dayState = localAvailability[day.value];
            const overnight = dayState.enabled && isOvernight(dayState.startTime, dayState.endTime);

            return (
              <div key={day.value} className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${dayState.enabled ? 'bg-white' : 'bg-slate-50/50'}`}>
                {/* Toggle */}
                <button
                  onClick={() => handleDayToggle(day.value)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${dayState.enabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${dayState.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>

                {/* Day label */}
                <span className={`w-10 text-sm font-medium ${dayState.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                  {day.short}
                </span>

                {/* Time inputs or unavailable */}
                {dayState.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={dayState.startTime}
                      onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                    />
                    <span className="text-xs text-slate-400 font-medium">to</span>
                    <input
                      type="time"
                      value={dayState.endTime}
                      onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                    />
                    {overnight && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                        <Moon className="h-3 w-3" />
                        Overnight
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex-1 text-sm text-slate-400">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exceptions */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">One-off Exceptions</p>
            <p className="text-xs text-slate-400 mt-0.5">Override your schedule for specific dates</p>
          </div>
          <button
            onClick={() => setShowExceptionForm(!showExceptionForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {showExceptionForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showExceptionForm ? 'Cancel' : 'Add exception'}
          </button>
        </div>

        {showExceptionForm && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
                <select
                  value={exceptionForm.isAvailable ? 'available' : 'unavailable'}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, isAvailable: e.target.value === 'available' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  <option value="unavailable">Unavailable all day</option>
                  <option value="available">Available (custom hours)</option>
                </select>
              </div>
            </div>

            {exceptionForm.isAvailable && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Start time</label>
                  <input
                    type="time"
                    value={exceptionForm.startTime}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">End time</label>
                  <input
                    type="time"
                    value={exceptionForm.endTime}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={exceptionForm.reason}
                onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                placeholder="e.g. Doctor appointment"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
              />
            </div>

            <button
              onClick={handleAddException}
              disabled={addException.isPending}
              className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {addException.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Add exception'}
            </button>
          </div>
        )}

        {exceptions && exceptions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {exceptions.map((exc) => (
              <div key={exc.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${exc.isAvailable ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(exc.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {exc.isAvailable ? `Available · ${exc.startTime} – ${exc.endTime}` : 'Unavailable'}
                      {exc.reason && ` · ${exc.reason}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveException(exc.id)}
                  disabled={removeException.isPending}
                  className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">No exceptions set</p>
          </div>
        )}
      </div>
    </div>
  );
}
