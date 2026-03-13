'use client';

import { toZonedTime } from 'date-fns-tz';
import { ShiftCard } from './shift-card';
import type { Shift } from '@/types/shift';

interface WeekCalendarProps {
  shifts: Shift[];
  weekStart: Date;
  locationTimezone: string;
  onShiftClick: (shift: Shift) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekCalendar({ shifts, weekStart, locationTimezone, onShiftClick }: WeekCalendarProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getShiftsForDay = (day: Date): Shift[] => {
    return shifts.filter((s) => {
      const shiftDay = toZonedTime(new Date(s.startTime), locationTimezone);
      return (
        shiftDay.getFullYear() === day.getFullYear() &&
        shiftDay.getMonth() === day.getMonth() &&
        shiftDay.getDate() === day.getDate()
      );
    });
  };

  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-2 min-h-[400px]">
      {days.map((day, i) => {
        const dayShifts = getShiftsForDay(day);
        const isToday =
          day.getFullYear() === today.getFullYear() &&
          day.getMonth() === today.getMonth() &&
          day.getDate() === today.getDate();

        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className={`text-center py-1.5 rounded-lg ${isToday ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <div className="text-xs font-medium">{DAY_LABELS[i]}</div>
              <div className={`text-base font-bold ${isToday ? 'text-white' : 'text-slate-900'}`}>
                {day.getDate()}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              {dayShifts.length === 0 ? (
                <div className="flex-1 border-2 border-dashed border-slate-100 rounded-lg" />
              ) : (
                dayShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} onClick={onShiftClick} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
