'use client';

import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWeeklyHours } from '@/hooks/api/use-shifts';
import type { WeeklyHoursEntry } from '@/types/shift';

interface OvertimeWidgetProps {
  locationId: string;
  weekStart: string;
}

const STATUS_CONFIG = {
  on_track: { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle, bar: 'bg-emerald-500' },
  near_overtime: { label: 'Near OT', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle, bar: 'bg-amber-500' },
  overtime: { label: 'Overtime', color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle, bar: 'bg-red-500' },
};

function HoursBar({ hours }: { hours: number }) {
  const pct = Math.min((hours / 40) * 100, 100);
  const color = hours >= 40 ? 'bg-red-500' : hours >= 35 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Row({ entry }: { entry: WeeklyHoursEntry }) {
  const cfg = STATUS_CONFIG[entry.status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-32 text-sm text-slate-800 font-medium truncate">{entry.name}</div>
      <HoursBar hours={entry.weeklyHours} />
      <div className="flex items-center gap-1 min-w-[4.5rem] justify-end">
        <span className="text-sm font-semibold text-slate-900">{entry.weeklyHours}h</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

export function OvertimeWidget({ locationId, weekStart }: OvertimeWidgetProps) {
  const { data, isLoading } = useWeeklyHours(locationId, weekStart);

  const atRisk = data?.filter((e) => e.status !== 'on_track') ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Weekly Hours</h3>
          <p className="text-xs text-slate-500">
            {atRisk.length > 0 ? `${atRisk.length} staff near/over overtime` : 'All staff on track'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
        </div>
      ) : !data?.length ? (
        <p className="text-sm text-slate-400 text-center py-4">No assignments this week</p>
      ) : (
        <div>
          {data.map((entry) => <Row key={entry.userId} entry={entry} />)}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> On Track &lt; 35h</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Near OT 35–39h</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> OT 40h+</span>
      </div>
    </div>
  );
}
