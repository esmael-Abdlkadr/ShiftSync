'use client';

import { useState } from 'react';
import { BarChart3, Download, TrendingUp, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable, EmptyState, type Column } from '@/components/ui/data-table';
import { useHoursReport, usePremiumFairness } from '@/hooks/api/use-analytics';
import { useExportCsv } from '@/hooks/use-export-csv';
import type { HoursEntry, PremiumEntry, QueryAnalyticsParams } from '@/types/analytics';

type Tab = 'hours' | 'premium';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getDefaultDates() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 28);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: to.toISOString().split('T')[0],
  };
}

const STATUS_CONFIG = {
  on_target: { label: 'On Target', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  under: { label: 'Under', color: 'text-amber-700', bg: 'bg-amber-50' },
  over: { label: 'Over', color: 'text-red-700', bg: 'bg-red-50' },
  no_preference: { label: 'No Preference', color: 'text-slate-500', bg: 'bg-slate-100' },
};

function StatusBadge({ status }: { status: HoursEntry['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function FairnessBar({ score }: { score: number }) {
  const pct = Math.min((score / 2) * 100, 100);
  const color = score > 1.4 ? 'bg-red-500' : score < 0.6 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700 tabular-nums">{score.toFixed(2)}</span>
    </div>
  );
}

const HOURS_CSV_COLS: { key: string; header: string; getValue?: (r: HoursEntry) => string | number | null }[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'totalHours', header: 'Total Hours' },
  { key: 'weeklyAvg', header: 'Weekly Avg' },
  { key: 'desiredHours', header: 'Desired Hours/Week' },
  { key: 'gap', header: 'Gap' },
  { key: 'status', header: 'Status' },
];

const PREMIUM_CSV_COLS: { key: string; header: string; getValue?: (r: PremiumEntry) => string | number | null }[] = [
  { key: 'name', header: 'Name' },
  { key: 'premiumCount', header: 'Premium Shifts' },
  { key: 'fairShare', header: 'Fair Share' },
  { key: 'score', header: 'Fairness Score' },
];

export default function ManagerReportsPage() {
  const defaults = getDefaultDates();
  const [tab, setTab] = useState<Tab>('hours');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [applied, setApplied] = useState<QueryAnalyticsParams>({
    dateFrom: defaults.dateFrom,
    dateTo: defaults.dateTo,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: hoursData, isLoading: hoursLoading } = useHoursReport(applied);
  const { data: premiumData, isLoading: premiumLoading } = usePremiumFairness(applied);
  const { exportCsv } = useExportCsv();

  const handleApply = () => {
    setApplied({ dateFrom, dateTo });
    setPage(1);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  const handleLimitChange = (n: number) => {
    setLimit(n);
    setPage(1);
  };

  const allRows: HoursEntry[] | PremiumEntry[] =
    tab === 'hours' ? (hoursData?.entries ?? []) : (premiumData?.entries ?? []);

  const total = allRows.length;
  const totalPages = Math.ceil(total / limit);
  const pagedRows = allRows.slice((page - 1) * limit, page * limit);

  const handleExport = () => {
    if (tab === 'hours' && hoursData) {
      exportCsv(hoursData.entries, HOURS_CSV_COLS, `hours-report-${applied.dateFrom}-${applied.dateTo}`);
    } else if (tab === 'premium' && premiumData) {
      exportCsv(premiumData.entries, PREMIUM_CSV_COLS, `premium-fairness-${applied.dateFrom}-${applied.dateTo}`);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'hours', label: 'Hours & Scheduling', icon: TrendingUp },
    { id: 'premium', label: 'Premium Fairness', icon: Star },
  ];

  const hoursColumns: Column<HoursEntry>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      render: (r) => (
        <div>
          <span className="text-sm font-semibold text-slate-900">{r.totalHours}h</span>
          {r.hasDraftHours && (
            <span className="ml-1.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">incl. drafts</span>
          )}
        </div>
      ),
    },
    {
      key: 'weeklyAvg',
      header: 'Weekly Avg',
      render: (r) => <span className="text-sm text-slate-700">{r.weeklyAvg}h</span>,
    },
    {
      key: 'desiredHours',
      header: 'Desired / Week',
      render: (r) => (
        <span className="text-sm text-slate-600">
          {r.desiredHours !== null ? `${r.desiredHours}h` : <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: 'gap',
      header: 'Gap',
      render: (r) => {
        if (r.gap === null) return <span className="text-slate-400 text-sm">—</span>;
        return (
          <span className={`text-sm font-medium ${r.gap >= 0 ? 'text-slate-700' : 'text-amber-600'}`}>
            {r.gap >= 0 ? '+' : ''}{r.gap}h
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  const premiumColumns: Column<PremiumEntry>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (r) => <span className="text-sm font-medium text-slate-900">{r.name}</span>,
    },
    {
      key: 'premiumCount',
      header: 'Premium Shifts',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-semibold text-slate-900">{r.premiumCount}</span>
        </div>
      ),
    },
    {
      key: 'fairShare',
      header: 'Fair Share',
      render: (r) => <span className="text-sm text-slate-600">{r.fairShare} shifts</span>,
    },
    {
      key: 'score',
      header: 'Fairness Score',
      render: (r) => <FairnessBar score={r.score} />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Reports & Analytics</h1>
              <p className="text-xs text-slate-500">Hours distribution and premium shift fairness for your location</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="shrink-0 flex items-end gap-4 px-6 py-4 bg-white border-b border-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>
          <button
            onClick={handleApply}
            className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Apply
          </button>
          {applied.dateFrom && (
            <p className="text-xs text-slate-400 self-center pb-0.5">
              {hoursData ? `${hoursData.weeks}w range` : ''}
              {hoursData?.includesDrafts ? ' · includes drafts' : ''}
            </p>
          )}
        </div>

        <div className="shrink-0 flex border-b border-slate-200 bg-white px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'premium' && premiumData && (
          <div className="shrink-0 px-6 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Premium shifts</span> are Friday and Saturday evening shifts (tagged at
              creation). Score of <span className="font-semibold">1.0</span> = perfectly fair distribution.
              {premiumData.noPremiumShifts
                ? ' No premium shifts found in this period.'
                : ` ${premiumData.totalPremiumShifts} premium shifts distributed across ${premiumData.entries.length} active workers.`}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {tab === 'hours' && (
            <DataTable
              columns={hoursColumns}
              data={pagedRows as HoursEntry[]}
              keyExtractor={(r) => r.userId}
              isLoading={hoursLoading}
              emptyState={
                <EmptyState
                  icon={TrendingUp}
                  title="No hours data"
                  description="No shift assignments found for the selected date range."
                />
              }
            />
          )}

          {tab === 'premium' && (
            <DataTable
              columns={premiumColumns}
              data={pagedRows as PremiumEntry[]}
              keyExtractor={(r) => r.userId}
              isLoading={premiumLoading}
              emptyState={
                <EmptyState
                  icon={Star}
                  title="No data available"
                  description="No assignments found for the selected period."
                />
              }
            />
          )}
        </div>

        {total > 0 && (
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>
                Showing{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span>
                {' – '}
                <span className="font-medium">{Math.min(page * limit, total)}</span>
                {' of '}
                <span className="font-medium">{total}</span> results
              </span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (() => {
              const pages: (number | 'ellipsis')[] = [];
              if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (page > 3) pages.push('ellipsis');
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                if (page < totalPages - 2) pages.push('ellipsis');
                pages.push(totalPages);
              }
              return (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pages.map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                          page === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
