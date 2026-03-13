'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { createUserSchema, type CreateUserFormData } from '@/lib/validations/auth';
import { useCreateUser } from '@/hooks/api/use-users';
import { BaseModal } from '@/components/ui/modal';
import { SUPPORTED_TIMEZONES } from '@/lib/timezones';

const ROLES = [
  { value: 'STAFF',   label: 'Staff' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN',   label: 'Admin' },
] as const;

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'STAFF', timezone: 'America/New_York' },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await createUser.mutateAsync(data);
      toast.success(`${data.firstName} ${data.lastName} added successfully`);
      handleClose();
    } catch (err: unknown) {
      const axiosMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(axiosMessage ?? 'Failed to create user');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New User"
      description="Fill in the details to create a new account"
      icon={UserPlus}
      iconVariant="default"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            form="add-user-form"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create User
          </button>
        </div>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.firstName?.message}>
            <input {...register('firstName')} placeholder="Alice" className={inputCls(!!errors.firstName)} />
          </Field>
          <Field label="Last Name" required error={errors.lastName?.message}>
            <input {...register('lastName')} placeholder="Smith" className={inputCls(!!errors.lastName)} />
          </Field>
        </div>

        <Field label="Email Address" required error={errors.email?.message}>
          <input {...register('email')} type="email" placeholder="alice@coastaleats.com" className={inputCls(!!errors.email)} />
        </Field>

        <Field label="Password" required error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              className={`${inputCls(!!errors.password)} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Role" required error={errors.role?.message}>
            <select {...register('role')} className={selectCls(!!errors.role)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Timezone" required error={errors.timezone?.message}>
            <select {...register('timezone')} className={selectCls(!!errors.timezone)}>
              <option value="">Select timezone…</option>
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Desired Weekly Hours" error={errors.desiredWeeklyHours?.message}>
            <input {...register('desiredWeeklyHours', { valueAsNumber: true })} type="number" min={0} max={168} placeholder="40" className={inputCls(!!errors.desiredWeeklyHours)} />
          </Field>
          <Field label="Hourly Rate ($)" error={errors.hourlyRate?.message}>
            <input {...register('hourlyRate', { valueAsNumber: true })} type="number" min={0} step="0.01" placeholder="18.00" className={inputCls(!!errors.hourlyRate)} />
          </Field>
        </div>
      </form>
    </BaseModal>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'}`;
}

function selectCls(hasError: boolean) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-shadow ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'}`;
}
