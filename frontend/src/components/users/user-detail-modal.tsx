'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useUpdateUser } from '@/hooks/api/use-users';
import { useSkills, useAssignSkill, useRemoveSkill } from '@/hooks/api/use-skills';
import { useLocations } from '@/hooks/api/use-locations';
import {
  useUserCertifications,
  useCertifyLocation,
  useDecertifyLocation,
  useRecertifyLocation,
} from '@/hooks/api/use-certifications';
import { AvailabilityGrid } from '@/components/availability/availability-grid';
import type { UserRole } from '@/types/user';
import toast from 'react-hot-toast';
import { SUPPORTED_TIMEZONES } from '@/lib/timezones';
import {
  X,
  Loader2,
  User,
  Briefcase,
  MapPin,
  Calendar,
  Check,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
  defaultEditMode?: boolean;
}

type TabType = 'profile' | 'skills' | 'locations' | 'availability';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'skills', label: 'Skills', icon: Briefcase },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'availability', label: 'Availability', icon: Calendar },
];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'STAFF', label: 'Staff' },
];

export function UserDetailModal({ userId, onClose, defaultEditMode = false }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [editMode, setEditMode] = useState(defaultEditMode);
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    role: UserRole;
    timezone: string;
    desiredWeeklyHours: number | '';
    hourlyRate: number | '';
  }>({
    firstName: '',
    lastName: '',
    role: 'STAFF',
    timezone: '',
    desiredWeeklyHours: '',
    hourlyRate: '',
  });

  const { data: user, isLoading } = useUser(userId);
  const editInitialized = useRef(false);

  useEffect(() => {
    if (!user || !defaultEditMode || editInitialized.current) return;
    editInitialized.current = true;
    const timer = setTimeout(() => {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        timezone: user.timezone,
        desiredWeeklyHours: user.desiredWeeklyHours ?? '',
        hourlyRate: user.hourlyRate ?? '',
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [user, defaultEditMode]);
  const { data: allSkills } = useSkills();
  const { data: allLocations } = useLocations();
  const { data: certifications } = useUserCertifications(userId, true);

  const updateUser = useUpdateUser();
  const assignSkill = useAssignSkill();
  const removeSkill = useRemoveSkill();
  const certifyLocation = useCertifyLocation();
  const decertifyLocation = useDecertifyLocation();
  const recertifyLocation = useRecertifyLocation();

  const handleEditClick = () => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        timezone: user.timezone,
        desiredWeeklyHours: user.desiredWeeklyHours ?? '',
        hourlyRate: user.hourlyRate ?? '',
      });
      setEditMode(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUser.mutateAsync({
        id: userId,
        data: {
          ...formData,
          desiredWeeklyHours: formData.desiredWeeklyHours === '' ? undefined : formData.desiredWeeklyHours,
          hourlyRate: formData.hourlyRate === '' ? undefined : formData.hourlyRate,
        },
      });
      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleToggleSkill = async (skillId: string, hasSkill: boolean) => {
    try {
      if (hasSkill) {
        await removeSkill.mutateAsync({ userId, skillId });
        toast.success('Skill removed');
      } else {
        await assignSkill.mutateAsync({ userId, skillId });
        toast.success('Skill assigned');
      }
    } catch {
      toast.error('Failed to update skill');
    }
  };

  const handleCertifyLocation = async (locationId: string) => {
    try {
      await certifyLocation.mutateAsync({ userId, locationId });
      toast.success('Location certified');
    } catch {
      toast.error('Failed to certify location');
    }
  };

  const handleDecertifyLocation = async (locationId: string) => {
    try {
      await decertifyLocation.mutateAsync({ userId, locationId });
      toast.success('Location decertified');
    } catch {
      toast.error('Failed to decertify location');
    }
  };

  const handleRecertifyLocation = async (locationId: string) => {
    try {
      await recertifyLocation.mutateAsync({ userId, locationId });
      toast.success('Location recertified');
    } catch {
      toast.error('Failed to recertify location');
    }
  };

  const userSkillIds = user?.skills.map((s) => s.skillId) || [];
  const activeCertLocationIds =
    certifications?.filter((c) => !c.decertifiedAt).map((c) => c.locationId) || [];
  const decertifiedCerts = certifications?.filter((c) => c.decertifiedAt) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">User Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="border-b border-slate-200">
            <div className="flex px-6">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : user ? (
              <>
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    {!editMode ? (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="h-8 w-8 text-slate-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p className="text-slate-500">{user.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Role
                            </div>
                            <div className="font-medium text-slate-900">{user.role}</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Timezone
                            </div>
                            <div className="font-medium text-slate-900">{user.timezone}</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Desired Weekly Hours
                            </div>
                            <div className="font-medium text-slate-900">
                              {user.desiredWeeklyHours ?? 'Not set'}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Hourly Rate
                            </div>
                            <div className="font-medium text-slate-900">
                              {user.hourlyRate ? `$${user.hourlyRate}` : 'Not set'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleEditClick}
                          className="w-full py-2 px-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                          Edit Profile
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={formData.firstName}
                              onChange={(e) =>
                                setFormData({ ...formData, firstName: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={formData.lastName}
                              onChange={(e) =>
                                setFormData({ ...formData, lastName: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Role
                            </label>
                            <select
                              value={formData.role}
                              onChange={(e) =>
                                setFormData({ ...formData, role: e.target.value as UserRole })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                              {ROLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Timezone
                            </label>
                            <select
                              value={formData.timezone}
                              onChange={(e) =>
                                setFormData({ ...formData, timezone: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                              <option value="">Select timezone…</option>
                              {SUPPORTED_TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Desired Weekly Hours
                            </label>
                            <input
                              type="number"
                              value={formData.desiredWeeklyHours}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  desiredWeeklyHours: e.target.value === '' ? '' : parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Hourly Rate ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.hourlyRate}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  hourlyRate: e.target.value === '' ? '' : parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setEditMode(false)}
                            className="flex-1 py-2 px-4 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={updateUser.isPending}
                            className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            {updateUser.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              'Save Changes'
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'skills' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Select skills this user is qualified to perform.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {allSkills?.map((skill) => {
                        const hasSkill = userSkillIds.includes(skill.id);
                        const isPending =
                          assignSkill.isPending || removeSkill.isPending;

                        return (
                          <button
                            key={skill.id}
                            onClick={() => handleToggleSkill(skill.id, hasSkill)}
                            disabled={isPending}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              hasSkill
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Briefcase
                                className={`h-4 w-4 ${
                                  hasSkill ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              />
                              <span
                                className={`font-medium ${
                                  hasSkill ? 'text-emerald-700' : 'text-slate-700'
                                }`}
                              >
                                {skill.name}
                              </span>
                            </div>
                            {hasSkill ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Plus className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'locations' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-3">
                        Active Certifications
                      </h4>
                      <div className="space-y-2">
                        {allLocations?.map((location) => {
                          const isCertified = activeCertLocationIds.includes(location.id);
                          const isPending =
                            certifyLocation.isPending || decertifyLocation.isPending;

                          return (
                            <div
                              key={location.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isCertified
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <MapPin
                                  className={`h-4 w-4 ${
                                    isCertified ? 'text-emerald-600' : 'text-slate-400'
                                  }`}
                                />
                                <div>
                                  <div
                                    className={`font-medium ${
                                      isCertified ? 'text-emerald-700' : 'text-slate-700'
                                    }`}
                                  >
                                    {location.name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {location.timezone}
                                  </div>
                                </div>
                              </div>
                              {isCertified ? (
                                <button
                                  onClick={() => handleDecertifyLocation(location.id)}
                                  disabled={isPending}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Decertify"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCertifyLocation(location.id)}
                                  disabled={isPending}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Certify"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {decertifiedCerts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-3">
                          Decertified (Historical)
                        </h4>
                        <div className="space-y-2">
                          {decertifiedCerts.map((cert) => (
                            <div
                              key={cert.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <div>
                                  <div className="font-medium text-slate-500">
                                    {cert.location.name}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Decertified:{' '}
                                    {new Date(cert.decertifiedAt!).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRecertifyLocation(cert.locationId)}
                                disabled={recertifyLocation.isPending}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Recertify
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'availability' && (
                  <AvailabilityGrid userId={userId} />
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">User not found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
