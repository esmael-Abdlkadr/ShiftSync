'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUsers, useDeleteUser, useImportUsers } from '@/hooks/api/use-users';
import { useSkills } from '@/hooks/api/use-skills';
import { useLocations } from '@/hooks/api/use-locations';
import { UserDetailModal } from '@/components/users/user-detail-modal';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  SearchInput,
  FilterSelect,
  EmptyState,
  Badge,
  BadgeGroup,
  ActionMenu,
  Checkbox,
  BulkActionsBar,
  Pagination,
  type ActionMenuItem,
} from '@/components/ui/data-table';
import { ConfirmDeactivate, ConfirmBulkAction } from '@/components/ui/confirmation-modal';
import { AddUserModal } from '@/components/users/add-user-modal';
import { CsvExportButton } from '@/components/ui/csv-export-button';
import { CsvImportModal } from '@/components/ui/csv-import/csv-import-modal';
import { importUserRowSchema, USER_CSV_COLUMNS } from '@/lib/validations/csv-import';
import type { ImportUserRow } from '@/lib/validations/csv-import';
import type { QueryUsersParams, UserRole, UserListItem } from '@/types/user';
import toast from 'react-hot-toast';
import {
  Users,
  Filter,
  MapPin,
  Briefcase,
  Clock,
  UserPlus,
  Upload,
  Mail,
  Globe,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  UserX,
  Loader2,
} from 'lucide-react';

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'purple' | 'primary' | 'default' }> = {
  ADMIN: { label: 'Admin', variant: 'purple' },
  MANAGER: { label: 'Manager', variant: 'primary' },
  STAFF: { label: 'Staff', variant: 'default' },
};

export default function UsersPage() {
  const { status } = useSession();
  const router = useRouter();

  const [params, setParams] = useState<QueryUsersParams>({ page: 1, limit: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userToDeactivate, setUserToDeactivate] = useState<UserListItem | null>(null);
  const [showBulkDeactivate, setShowBulkDeactivate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: usersData, isLoading } = useUsers(params);
  const { data: skills } = useSkills();
  const { data: locations } = useLocations();
  const deleteUser = useDeleteUser();
  const importUsers = useImportUsers();
  const users = usersData?.users || [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => {
        const newParams = { ...prev, search: searchInput || undefined, page: 1 };
        return newParams;
      });
      setSelectedIds(new Set());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (key: keyof QueryUsersParams, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
    setSelectedIds(new Set());
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setSearchInput('');
    setParams({ page: 1, limit: 10 });
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(users.map((u) => u.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return;
    
    try {
      await deleteUser.mutateAsync(userToDeactivate.id);
      toast.success('User deactivated successfully');
      setUserToDeactivate(null);
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteUser.mutateAsync(id)));
      toast.success(`${count} user(s) deactivated successfully`);
      setSelectedIds(new Set());
      setShowBulkDeactivate(false);
    } catch {
      toast.error('Failed to deactivate some users');
    }
  };

  const hasActiveFilters = params.role || params.locationId || params.skillId || params.search;
  const activeFilterCount = [params.role, params.locationId, params.skillId].filter(Boolean).length;

  const skillOptions = skills?.map((s) => ({ value: s.id, label: s.name })) || [];
  const locationOptions = locations?.map((l) => ({ value: l.id, label: l.name })) || [];

  const isAllSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const exportColumns = [
    { key: 'firstName', header: 'firstName', getValue: (u: UserListItem) => u.firstName },
    { key: 'lastName', header: 'lastName', getValue: (u: UserListItem) => u.lastName },
    { key: 'email', header: 'email', getValue: (u: UserListItem) => u.email },
    { key: 'role', header: 'role', getValue: (u: UserListItem) => u.role },
    { key: 'timezone', header: 'timezone', getValue: (u: UserListItem) => u.timezone ?? '' },
    { key: 'desiredWeeklyHours', header: 'desiredWeeklyHours', getValue: (u: UserListItem) => u.desiredWeeklyHours ?? '' },
  ];

  const getActionItems = (user: UserListItem): ActionMenuItem[] => [
    {
      label: 'View Details',
      icon: Eye,
      onClick: () => { setOpenInEditMode(false); setSelectedUserId(user.id); },
    },
    {
      label: 'Edit User',
      icon: Pencil,
      onClick: () => { setOpenInEditMode(true); setSelectedUserId(user.id); },
    },
    {
      label: 'Deactivate',
      icon: Trash2,
      onClick: () => setUserToDeactivate(user),
      variant: 'danger',
      disabled: user.role === 'ADMIN',
    },
  ];

  const renderUserRow = (user: UserListItem) => {
    const config = ROLE_CONFIG[user.role];
    
    return (
      <tr
        key={user.id}
        onClick={() => setSelectedUserId(user.id)}
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <td className="px-6 py-3 w-12" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(user.id)}
            onChange={() => handleToggleSelect(user.id)}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium text-sm shrink-0">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-900 truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={config.variant}>{config.label}</Badge>
        </td>
        <td className="px-4 py-3">
          <BadgeGroup
            badges={
              user.skills?.map((us) => ({
                id: us.id,
                label: us.skill.name,
                variant: 'warning' as const,
                icon: Briefcase,
              })) || []
            }
            emptyText="No skills"
          />
        </td>
        <td className="px-4 py-3">
          <BadgeGroup
            badges={
              user.certifiedLocations?.map((cert) => ({
                id: cert.id,
                label: cert.location.name,
                variant: 'success' as const,
                icon: MapPin,
              })) || []
            }
            emptyText="No locations"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <div>
              <div className="text-sm font-medium text-slate-900">
                {user.desiredWeeklyHours ?? '-'} hrs/wk
              </div>
              {user.timezone && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Globe className="h-3 w-3" />
                  {user.timezone.replace('America/', '')}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {user.isActive !== false ? (
            <Badge variant="success" icon={CheckCircle}>
              Active
            </Badge>
          ) : (
            <Badge variant="danger" icon={XCircle}>
              Inactive
            </Badge>
          )}
        </td>
        <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
          <ActionMenu items={getActionItems(user)} />
        </td>
      </tr>
    );
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {usersData?.pagination.total ?? 0} users total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
              <CsvExportButton
                data={users}
                columns={exportColumns}
                filename="users"
              />
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-slate-200 shrink-0">
          <div className="flex flex-col lg:flex-row gap-4">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by name or email..."
              className="flex-1"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FilterSelect
                  label="Role"
                  value={params.role || ''}
                  onChange={(v) => handleFilterChange('role', v)}
                  options={[
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'MANAGER', label: 'Manager' },
                    { value: 'STAFF', label: 'Staff' },
                  ]}
                  placeholder="All Roles"
                />
                <FilterSelect
                  label="Location"
                  value={params.locationId || ''}
                  onChange={(v) => handleFilterChange('locationId', v)}
                  options={locationOptions}
                  placeholder="All Locations"
                />
                <FilterSelect
                  label="Skill"
                  value={params.skillId || ''}
                  onChange={(v) => handleFilterChange('skillId', v)}
                  options={skillOptions}
                  placeholder="All Skills"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={usersData?.pagination.total ?? 0}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          actions={[
            {
              label: 'Deactivate Selected',
              icon: UserX,
              onClick: () => setShowBulkDeactivate(true),
              variant: 'danger',
            },
          ]}
        />

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first user'
              }
              action={hasActiveFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
            />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Skills</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Locations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>{users.map(renderUserRow)}</tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {usersData?.pagination && (
          <Pagination
            pagination={usersData.pagination}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          defaultEditMode={openInEditMode}
          onClose={() => { setSelectedUserId(null); setOpenInEditMode(false); }}
        />
      )}

      <ConfirmDeactivate
        isOpen={!!userToDeactivate}
        onClose={() => setUserToDeactivate(null)}
        onConfirm={handleDeactivateUser}
        itemName={userToDeactivate ? `${userToDeactivate.firstName} ${userToDeactivate.lastName}` : undefined}
        isLoading={deleteUser.isPending}
      />

      <ConfirmBulkAction
        isOpen={showBulkDeactivate}
        onClose={() => setShowBulkDeactivate(false)}
        onConfirm={handleBulkDeactivate}
        count={selectedIds.size}
        action="Deactivate"
        itemType="users"
        variant="warning"
        isLoading={deleteUser.isPending}
      />

      <AddUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
      />

      <CsvImportModal<ImportUserRow>
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={async (rows) => {
          const result = await importUsers.mutateAsync(rows);
          if (result.succeeded > 0) {
            toast.success(`${result.succeeded} user(s) imported successfully`);
          }
          if (result.failed > 0) {
            toast.error(`${result.failed} row(s) failed to import`);
          }
          return result;
        }}
        schema={importUserRowSchema}
        templateColumns={USER_CSV_COLUMNS}
        templateFilename="users"
        entityName="Users"
      />
    </DashboardLayout>
  );
}
