'use client';

import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useUsers } from '@/hooks/api/use-users';
import { useLocations } from '@/hooks/api/use-locations';
import { useSession } from 'next-auth/react';
import {
  SearchInput,
  FilterSelect,
  EmptyState,
  Badge,
  BadgeGroup,
} from '@/components/ui/data-table';
import { DataTable, type Column } from '@/components/ui/data-table/data-table';
import type { UserListItem } from '@/types/user';
import { Briefcase, MapPin } from 'lucide-react';

const PAGE_SIZE = 20;

export default function ManagerStaffPage() {
  useSession();

  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [page, setPage] = useState(1);

  const { data: usersData, isLoading } = useUsers({
    search: search || undefined,
    locationId: locationId || undefined,
    role: 'STAFF',
    page,
    limit: PAGE_SIZE,
  });

  // Only show locations this manager manages — use all locations but display them all
  // (backend's useUsers with locationId filter already scopes correctly)
  const { data: locations } = useLocations();
  const locationOptions = (locations ?? []).map((l) => ({ value: l.id, label: l.name }));

  const users = usersData?.users ?? [];
  const total = usersData?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (u) => (
        <div>
          <p className="text-sm font-medium text-slate-900">
            {u.firstName} {u.lastName}
          </p>
          <p className="text-xs text-slate-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'skills',
      header: 'Skills',
      render: (u) => (
        <BadgeGroup
          badges={(u.skills ?? []).map((us) => ({
            id: us.id,
            label: us.skill.name,
            variant: 'warning' as const,
            icon: Briefcase,
          }))}
          emptyText="No skills"
        />
      ),
    },
    {
      key: 'locations',
      header: 'Certified Locations',
      render: (u) => (
        <BadgeGroup
          badges={(u.certifiedLocations ?? []).map((cert) => ({
            id: cert.id,
            label: cert.location.name,
            variant: 'success' as const,
            icon: MapPin,
          }))}
          emptyText="No locations"
        />
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (u) => (
        <span className="text-sm text-slate-600">{u.timezone ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.isActive ? 'success' : 'danger'}>
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Staff</h1>
              <p className="text-xs text-slate-500">Staff certified at your locations</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {total} staff member{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="shrink-0 flex items-end gap-4 px-6 py-4 bg-white border-b border-slate-200">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name or email…"
            className="w-72"
          />
          <FilterSelect
            label="Location"
            value={locationId}
            onChange={(v) => { setLocationId(v); setPage(1); }}
            options={locationOptions}
            placeholder="All Locations"
            className="w-52"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={users}
            keyExtractor={(u) => u.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={Search}
                title="No staff found"
                description="Try adjusting the search or location filter."
              />
            }
          />
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing{' '}
              <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span>
              {' – '}
              <span className="font-medium">{Math.min(page * PAGE_SIZE, total)}</span>
              {' of '}
              <span className="font-medium">{total}</span> staff
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                      page === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
