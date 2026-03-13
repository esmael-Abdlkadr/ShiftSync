'use client';

import { useState, useEffect } from 'react';
import {
  useUserAvailability,
  useUserAvailabilityExceptions,
  useSetAvailability,
  useAddAvailabilityException,
  useRemoveAvailabilityException,
} from '@/hooks/api/use-availability';
import type { DayOfWeek, AvailabilitySlot, CreateExceptionRequest } from '@/types/user';
import toast from 'react-hot-toast';
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Moon,
  AlertCircle,
} from 'lucide-react';

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

  const [localAvailability, setLocalAvailability] = useState<AvailabilityState>(() =>
    DAYS.reduce((acc, day) => {
      acc[day.value] = { ...DEFAULT_AVAILABILITY };
      return acc;
    }, {} as AvailabilityState)
  );

  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<CreateExceptionRequest>({
    date: '',
    isAvailable: false,
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (availability) {
      const newState = DAYS.reduce((acc, day) => {
        const found = availability.find((a) => a.dayOfWeek === day.value);
        if (found) {
          acc[day.value] = {
            enabled: true,
            startTime: found.startTime,
            endTime: found.endTime,
          };
        } else {
          acc[day.value] = { ...DEFAULT_AVAILABILITY };
        }
        return acc;
      }, {} as AvailabilityState);
      setLocalAvailability(newState);
      setHasChanges(false);
    }
  }, [availability]);

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
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-700">Weekly Recurring Availability</h4>
          {hasChanges && (
            <button
              onClick={handleSaveAvailability}
              disabled={setAvailability.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {setAvailability.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
          )}
        </div>

        <div className="space-y-2">
          {DAYS.map((day) => {
            const dayState = localAvailability[day.value];
            const overnight = dayState.enabled && isOvernight(dayState.startTime, dayState.endTime);

            return (
              <div
                key={day.value}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  dayState.enabled
                    ? overnight
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  onClick={() => handleDayToggle(day.value)}
                  className={`w-20 text-left font-medium text-sm ${
                    dayState.enabled ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {day.short}
                </button>

                {dayState.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={dayState.startTime}
                      onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={dayState.endTime}
                      onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    {overnight && (
                      <div className="flex items-center gap-1 text-purple-600 text-xs">
                        <Moon className="h-3 w-3" />
                        Overnight
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">Not available</span>
                )}

                <button
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    dayState.enabled
                      ? 'text-red-600 hover:bg-red-100'
                      : 'text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {dayState.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-700">Exceptions (One-off Changes)</h4>
          <button
            onClick={() => setShowExceptionForm(!showExceptionForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" />
            Add Exception
          </button>
        </div>

        {showExceptionForm && (
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select
                  value={exceptionForm.isAvailable ? 'available' : 'unavailable'}
                  onChange={(e) =>
                    setExceptionForm({ ...exceptionForm, isAvailable: e.target.value === 'available' })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="unavailable">Unavailable</option>
                  <option value="available">Available (custom hours)</option>
                </select>
              </div>
            </div>

            {exceptionForm.isAvailable && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={exceptionForm.startTime}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End Time</label>
                  <input
                    type="time"
                    value={exceptionForm.endTime}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={exceptionForm.reason}
                onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                placeholder="e.g., Doctor appointment"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExceptionForm(false)}
                className="flex-1 py-2 px-4 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddException}
                disabled={addException.isPending}
                className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {addException.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Add'}
              </button>
            </div>
          </div>
        )}

        {exceptions && exceptions.length > 0 ? (
          <div className="space-y-2">
            {exceptions.map((exc) => (
              <div
                key={exc.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  exc.isAvailable
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle
                    className={`h-4 w-4 ${exc.isAvailable ? 'text-emerald-600' : 'text-red-600'}`}
                  />
                  <div>
                    <div className={`font-medium text-sm ${exc.isAvailable ? 'text-emerald-700' : 'text-red-700'}`}>
                      {new Date(exc.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {exc.isAvailable
                        ? `Available ${exc.startTime} - ${exc.endTime}`
                        : 'Unavailable'}
                      {exc.reason && ` • ${exc.reason}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveException(exc.id)}
                  disabled={removeException.isPending}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No exceptions set</p>
        )}
      </div>
    </div>
  );
}
