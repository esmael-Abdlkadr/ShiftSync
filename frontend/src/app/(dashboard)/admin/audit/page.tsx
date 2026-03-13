'use client';

import { useState } from 'react';
import { ClipboardList, Download, RefreshCw } from 'lucide-react';
import { useAuditLogs } from '@/hooks/api/use-audit';
import { useLocations } from '@/hooks/api/use-locations';
import { useExportCsv } from '@/hooks/use-export-csv';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  DataTable,
  FilterSelect,
  type Column,
} from '@/components/ui/data-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry, QueryAuditParams } from '@/types/audit';

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'PUBLISH', label: 'Publish' },
  { value: 'UNPUBLISH', label: 'Unpublish' },
  { value: 'ASSIGN_STAFF', label: 'Assign Staff' },
  { value: 'UNASSIGN_STAFF', label: 'Unassign Staff' },
  { value: 'DEACTIVATE', label: 'Deactivate' },
  { value: 'APPROVE_SWAP', label: 'Approve Swap' },
  { value: 'REJECT_SWAP', label: 'Reject Swap' },
  { value: 'APPROVE_DROP', label: 'Approve Drop' },
  { value: 'REJECT_DROP', label: 'Reject Drop' },
];

const ENTITY_OPTIONS = [
  { value: 'Shift', label: 'Shift' },
  { value: 'ShiftAssignment', label: 'Shift Assignment' },
  { value: 'User', label: 'User' },
  { value: 'SwapRequest', label: 'Swap Request' },
  { value: 'DropRequest', label: 'Drop Request' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function ActionBadge({ action }: { action: string }) {
  let colour = 'bg-slate-100 text-slate-700';
  if (['CREATE', 'PUBLISH', 'APPROVE_SWAP', 'APPROVE_DROP'].includes(action)) {
    colour = 'bg-emerald-100 text-emerald-700';
  } else if (['UPDATE', 'UNPUBLISH', 'ASSIGN_STAFF'].includes(action)) {
    colour = 'bg-blue-100 text-blue-700';
  } else if (
    ['DELETE', 'UNASSIGN_STAFF', 'DEACTIVATE', 'REJECT_SWAP', 'REJECT_DROP'].includes(action)
  ) {
    colour = 'bg-red-100 text-red-700';
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colour}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

const CSV_COLUMNS = [
  { key: 'id', header: 'ID' },
  {
    key: 'createdAt',
    header: 'Date',
    getValue: (r: AuditLogEntry) => new Date(r.createdAt).toISOString(),
  },
  {
    key: 'actor',
    header: 'Actor',
    getValue: (r: AuditLogEntry) => `${r.user.firstName} ${r.user.lastName}`,
  },
  { key: 'actorEmail', header: 'Actor Email', getValue: (r: AuditLogEntry) => r.user.email },
  { key: 'action', header: 'Action' },
  { key: 'entityType', header: 'Entity Type' },
  { key: 'entityId', header: 'Entity ID' },
  {
    key: 'location',
    header: 'Location',
    getValue: (r: AuditLogEntry) => r.location?.name ?? '',
  },
];

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [locationId, setLocationId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: locationsData } = useLocations();
  const locationOptions =
    locationsData?.map((l: { id: string; name: string }) => ({
      value: l.id,
      label: l.name,
    })) ?? [];

  const params: QueryAuditParams = {
    page,
    limit,
    ...(locationId && { locationId }),
    ...(entityType && { entityType }),
    ...(action && { action }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading, refetch } = useAuditLogs(params);
  const { exportCsv } = useExportCsv();

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const handleReset = () => {
    setLocationId('');
    setEntityType('');
    setAction('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (r) =>
        new Date(r.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (r) => (
        <div>
          <div className="text-sm font-medium text-slate-900">
            {r.user.firstName} {r.user.lastName}
          </div>
          <div className="text-xs text-slate-500">{r.user.email}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => <ActionBadge action={r.action} />,
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (r) => (
        <div>
          <div className="text-sm text-slate-700">{r.entityType}</div>
          <div className="text-xs text-slate-400 font-mono truncate max-w-[120px]">
            {r.entityId.slice(0, 10)}…
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (r) => (
        <span className="text-sm text-slate-600">{r.location?.name ?? '—'}</span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Audit Log</h1>
              <p className="text-sm text-slate-500">
                Complete history of all system changes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => exportCsv(entries, CSV_COLUMNS, 'audit-log')}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
            <FilterSelect
              label="Location"
              value={locationId}
              onChange={handleFilterChange(setLocationId)}
              options={locationOptions}
            />
            <FilterSelect
              label="Entity Type"
              value={entityType}
              onChange={handleFilterChange(setEntityType)}
              options={ENTITY_OPTIONS}
            />
            <FilterSelect
              label="Action"
              value={action}
              onChange={handleFilterChange(setAction)}
              options={ACTION_OPTIONS}
            />
            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="w-full px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} total entries`}
          </p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={entries}
            keyExtractor={(r) => r.id}
            isLoading={isLoading}
            emptyState={
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-700">No audit entries found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting the filters or date range</p>
              </div>
            }
          />
        </div>

        {/* Pagination bar */}
        {total > 0 && (
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200">
            {/* Left: showing count + per-page selector */}
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>
                Showing{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span>
                {' '}–{' '}
                <span className="font-medium">{Math.min(page * limit, total)}</span>
                {' '}of{' '}
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

            {/* Right: page buttons */}
            {(() => {
              const totalPages = Math.ceil(total / limit);
              if (totalPages <= 1) return null;
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
                  <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pages.map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p)} className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{p}</button>
                    )
                  )}
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
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
