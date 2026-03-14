'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, VolumeX, Loader2, Save, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  timezone: string;
  desiredWeeklyHours: number | null;
  hourlyRate: number | null;
  notificationPreference: string;
}

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
];

const PREF_OPTIONS = [
  {
    value: 'IN_APP',
    label: 'In-app only',
    description: 'Receive notifications inside ShiftSync only.',
    icon: Bell,
  },
  {
    value: 'IN_APP_AND_EMAIL',
    label: 'In-app + Email',
    description: 'Receive notifications inside ShiftSync and via email (simulated).',
    icon: Mail,
  },
  {
    value: 'NONE',
    label: 'Disabled',
    description: 'No notifications of any kind.',
    icon: VolumeX,
  },
] as const;

type Tab = 'profile' | 'notifications';

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data } = await api.get<UserProfile>(`/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [desiredHours, setDesiredHours] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setTimezone(profile.timezone ?? 'America/Los_Angeles');
      setDesiredHours(profile.desiredWeeklyHours != null ? String(profile.desiredWeeklyHours) : '');
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await api.patch(`/users/${userId}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        timezone,
        desiredWeeklyHours: desiredHours !== '' ? Number(desiredHours) : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  // Notification preference state
  const [pref, setPref] = useState('IN_APP');

  useEffect(() => {
    if (profile?.notificationPreference) {
      setTimeout(() => setPref(profile.notificationPreference), 0);
    }
  }, [profile]);

  const savePref = useMutation({
    mutationFn: async (value: string) => {
      await api.patch(`/users/${userId}`, { notificationPreference: value });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast.success('Preference saved');
    },
    onError: () => toast.error('Failed to save preference'),
  });

  const initials = profile
    ? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`
    : '??';

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-white">
        {/* Page header */}
        <div className="border-b border-slate-100 px-8 py-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
            Account
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        </div>

        <div className="max-w-2xl mx-auto px-8 py-6">
          {/* Identity bar */}
          {isLoading ? (
            <div className="h-16 bg-slate-50 rounded-xl animate-pulse mb-6" />
          ) : (
            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="h-11 w-11 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {profile?.firstName} {profile?.lastName}
                </p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
                <p className="text-xs text-slate-400 capitalize">{profile?.role?.toLowerCase()}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            {(['profile', 'notifications'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  readOnly
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed here.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {profile?.role === 'STAFF' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Desired weekly hours
                  </label>
                  <input
                    type="number"
                    value={desiredHours}
                    onChange={(e) => setDesiredHours(e.target.value)}
                    min={0}
                    max={80}
                    placeholder="e.g. 40"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Used by managers to track scheduling fairness.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => saveProfile.mutate()}
                  disabled={saveProfile.isPending || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {saveProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </button>
              </div>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                Choose how you want to receive notifications for shift updates, swaps, and drops.
              </p>
              {PREF_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = pref === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPref(opt.value);
                      savePref.mutate(opt.value);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-slate-900' : 'bg-slate-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                      isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                    }`} />
                  </button>
                );
              })}

              {pref === 'NONE' && (
                <p className="text-xs text-slate-400 pt-1">
                  You will not receive any alerts for shift assignments, schedule changes, or swap requests.
                </p>
              )}
              {pref === 'IN_APP_AND_EMAIL' && (
                <p className="text-xs text-slate-400 pt-1">
                  Email delivery is simulated — events are logged to the server console.
                </p>
              )}
            </div>
          )}

          {/* Role badge — read only info */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-300" />
            <p className="text-xs text-slate-400">
              Role: <span className="font-medium text-slate-600 capitalize">{profile?.role?.toLowerCase()}</span>
              {' · '}
              Role changes must be made by an admin.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
