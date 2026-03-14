'use client';

import { useState } from 'react';
import { BarChart3, Download, TrendingUp, Star, DollarSign, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable, FilterSelect, EmptyState, type Column } from '@/components/ui/data-table';
import { useHoursReport, usePremiumFairness, useOvertimeCost } from '@/hooks/api/use-analytics';
import { useLocations } from '@/hooks/api/use-locations';
import { useExportCsv } from '@/hooks/use-export-csv';
import type { HoursEntry, PremiumEntry, CostEntry, QueryAnalyticsParams } from '@/types/analytics';

type Tab = 'hours' | 'premium' | 'cost';

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

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
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

const COST_CSV_COLS: { key: string; header: string; getValue?: (r: CostEntry) => string | number | null }[] = [
  { key: 'name', header: 'Name' },
  { key: 'totalHours', header: 'Total Hours' },
  { key: 'locationHours', header: 'Location Hours' },
  { key: 'overtimeHours', header: 'Overtime Hours' },
  { key: 'regularCost', header: 'Regular Cost ($)' },
  { key: 'overtimeCost', header: 'Overtime Cost ($)' },
  {
    key: 'totalCost',
    header: 'Total Cost ($)',
    getValue: (r) =>
      r.regularCost !== null && r.overtimeCost !== null
        ? Math.round((r.regularCost + r.overtimeCost) * 100) / 100
        : null,
  },
];

export default function ReportsPage() {
  const defaults = getDefaultDates();
  const [tab, setTab] = useState<Tab>('hours');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [locationId, setLocationId] = useState('');
  const [applied, setApplied] = useState<QueryAnalyticsParams>({
    dateFrom: defaults.dateFrom,
    dateTo: defaults.dateTo,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: locations } = useLocations();
  const { data: hoursData, isLoading: hoursLoading } = useHoursReport(applied);
  const { data: premiumData, isLoading: premiumLoading } = usePremiumFairness(applied);
  const { data: costData, isLoading: costLoading } = useOvertimeCost(applied);
  const { exportCsv } = useExportCsv();

  const locationOptions = (locations ?? []).map((l) => ({ value: l.id, label: l.name }));

  const handleApply = () => {
    setApplied({ dateFrom, dateTo, locationId: locationId || undefined });
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

  // Client-side pagination helpers
  const allRows =
    tab === 'hours'
      ? (hoursData?.entries ?? [])
      : tab === 'premium'
        ? (premiumData?.entries ?? [])
        : (costData?.entries ?? []);

  const total = allRows.length;
  const totalPages = Math.ceil(total / limit);
  const pagedRows = allRows.slice((page - 1) * limit, page * limit);

  const handleExport = () => {
    if (tab === 'hours' && hoursData) {
      exportCsv(hoursData.entries, HOURS_CSV_COLS, `hours-report-${applied.dateFrom}-${applied.dateTo}`);
    } else if (tab === 'premium' && premiumData) {
      exportCsv(premiumData.entries, PREMIUM_CSV_COLS, `premium-fairness-${applied.dateFrom}-${applied.dateTo}`);
    } else if (tab === 'cost' && costData) {
      exportCsv(costData.entries, COST_CSV_COLS, `cost-projection-${applied.dateFrom}-${applied.dateTo}`);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'hours', label: 'Hours & Scheduling', icon: TrendingUp },
    { id: 'premium', label: 'Premium Fairness', icon: Star },
    { id: 'cost', label: 'Cost Projection', icon: DollarSign },
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
      render: (r) => (
        <span className="text-sm text-slate-600">{r.fairShare} shifts</span>
      ),
    },
    {
      key: 'score',
      header: 'Fairness Score',
      render: (r) => <FairnessBar score={r.score} />,
    },
  ];

  const costColumns: Column<CostEntry>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{r.name}</span>
          {r.rateUnset && (
            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">rate not set</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      render: (r) => <span className="text-sm text-slate-700">{r.totalHours}h</span>,
    },
    {
      key: 'locationHours',
      header: 'Location Hours',
      render: (r) => <span className="text-sm text-slate-600">{r.locationHours}h</span>,
    },
    {
      key: 'overtimeHours',
      header: 'Overtime Hours',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.overtimeHours > 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          <span className={`text-sm font-medium ${r.overtimeHours > 0 ? 'text-red-600' : 'text-slate-600'}`}>
            {r.overtimeHours}h
          </span>
        </div>
      ),
    },
    {
      key: 'regularCost',
      header: 'Regular Cost',
      render: (r) => (
        <span className="text-sm text-slate-700">
          {r.regularCost !== null ? `$${r.regularCost.toFixed(2)}` : <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: 'overtimeCost',
      header: 'OT Cost (×1.5)',
      render: (r) => (
        <span className={`text-sm font-medium ${(r.overtimeCost ?? 0) > 0 ? 'text-red-600' : 'text-slate-700'}`}>
          {r.overtimeCost !== null ? `$${r.overtimeCost.toFixed(2)}` : <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      render: (r) => {
        if (r.regularCost === null) return <span className="text-slate-400 text-sm">—</span>;
        const total = (r.regularCost ?? 0) + (r.overtimeCost ?? 0);
        return <span className="text-sm font-semibold text-slate-900">${total.toFixed(2)}</span>;
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Reports & Analytics</h1>
              <p className="text-xs text-slate-500">Hours distribution, fairness scores, and cost projections</p>
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

        {/* Filter bar */}
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
          <FilterSelect
            label="Location"
            value={locationId}
            onChange={setLocationId}
            options={locationOptions}
            placeholder="All Locations"
            className="w-52"
          />
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

        {/* Tabs */}
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

        {/* Cost summary cards */}
        {tab === 'cost' && costData && (
          <div className="shrink-0 grid grid-cols-3 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200">
            <SummaryCard
              label="Regular Pay"
              value={`$${costData.summary.regularCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              sub="Hours up to 40h/week"
            />
            <SummaryCard
              label="Overtime Pay"
              value={`$${costData.summary.overtimeCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              sub="Hours over 40h/week × 1.5"
            />
            <SummaryCard
              label="Total Projected Cost"
              value={`$${costData.summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              sub={
                costData.summary.staffWithoutRate > 0
                  ? `${costData.summary.staffWithoutRate} staff excluded (rate not set)`
                  : 'All staff included'
              }
            />
          </div>
        )}

        {/* Premium note */}
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

        {/* Table */}
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
                  description="No shift assignments found for the selected date range and location."
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

          {tab === 'cost' && (
            <DataTable
              columns={costColumns}
              data={pagedRows as CostEntry[]}
              keyExtractor={(r) => r.userId}
              isLoading={costLoading && !costData}
              emptyState={
                <EmptyState
                  icon={DollarSign}
                  title="No cost data"
                  description="No assignments found for the selected period."
                />
              }
            />
          )}
        </div>

        {/* Pagination bar */}
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
