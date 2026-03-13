'use client';

import { Users, Star, AlertTriangle } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';
import type { Shift } from '@/types/shift';

interface ShiftCardProps {
  shift: Shift;
  onClick: (shift: Shift) => void;
}

function formatTime(utcStr: string, timezone: string): string {
  const zoned = toZonedTime(new Date(utcStr), timezone);
  return zoned.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function ShiftCard({ shift, onClick }: ShiftCardProps) {
  const tz = shift.location.timezone;
  const filled = shift.assignments.length;
  const isFull = filled >= shift.headcount;
  const isEmpty = filled === 0;
  const isPublished = shift.status === 'PUBLISHED';

  const cardColor = isPublished
    ? isFull
      ? 'border-emerald-400 bg-emerald-50'
      : 'border-blue-400 bg-blue-50'
    : 'border-slate-300 bg-white';

  const statusDot = isPublished
    ? isFull
      ? 'bg-emerald-500'
      : 'bg-blue-500'
    : 'bg-slate-400';

  return (
    <button
      onClick={() => onClick(shift)}
      className={`w-full text-left rounded-lg border p-2 hover:shadow-md transition-shadow ${cardColor}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-800 truncate">
          {formatTime(shift.startTime, tz)} – {formatTime(shift.endTime, tz)}
        </span>
        <div className="flex items-center gap-1">
          {shift.isPremium && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
        </div>
      </div>

      <div className="text-xs text-slate-600 truncate">{shift.requiredSkill.name}</div>

      <div className="flex items-center gap-1 mt-1.5">
        <Users className="h-3 w-3 text-slate-400" />
        <span className={`text-xs font-medium ${isEmpty ? 'text-red-500' : isFull ? 'text-emerald-600' : 'text-slate-600'}`}>
          {filled}/{shift.headcount}
        </span>
        {!isFull && filled > 0 && (
          <AlertTriangle className="h-3 w-3 text-amber-500 ml-auto" />
        )}
      </div>
    </button>
  );
}
