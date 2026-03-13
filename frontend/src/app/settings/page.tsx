'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, BellOff, CheckCircle, User, Settings, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  notificationPreference: string;
}

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
    description: 'Receive notifications inside ShiftSync and via email.',
    icon: Mail,
  },
  {
    value: 'NONE',
    label: 'Disabled',
    description: 'No notifications of any kind. You will not be alerted about shifts, swaps, or drops.',
    icon: VolumeX,
  },
] as const;

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data } = await api.get<UserProfile>(`/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });

  const [pref, setPref] = useState<string>('IN_APP');

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
      toast.success('Notification preference saved');
    },
    onError: () => toast.error('Failed to save preference'),
  });

  const handleSelect = (value: string) => {
    setPref(value);
    savePref.mutate(value);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your account preferences</p>
          </div>
        </div>

        {/* Profile summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-700">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-sm text-slate-500">{profile?.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{profile?.timezone}</p>
            </div>
            <div className="ml-auto">
              <User className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">Notification Preferences</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Choose how you want to receive notifications for shift updates, swaps, drops, and more.
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {PREF_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = pref === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-slate-900' : 'bg-slate-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-slate-900 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {pref === 'IN_APP_AND_EMAIL' && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Mail className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Email delivery is currently simulated — emails are logged to the server console. A real email provider can be connected before deployment.
              </p>
            </div>
          )}

          {pref === 'IN_APP' && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <BellOff className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                You will only receive notifications inside ShiftSync. No emails will be sent.
              </p>
            </div>
          )}

          {pref === 'NONE' && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <VolumeX className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                <span className="font-semibold">All notifications are disabled.</span> You will not receive any alerts for shift assignments, schedule changes, swap requests, or drop requests.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
