'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { BaseModal } from '@/components/ui/modal';
import { useCreateShift } from '@/hooks/api/use-shifts';
import { useSkills } from '@/hooks/api/use-skills';
import { useLocations } from '@/hooks/api/use-locations';
import toast from 'react-hot-toast';

const schema = z.object({
  locationId: z.string().min(1, 'Location required'),
  skillId: z.string().min(1, 'Skill required'),
  date: z.string().min(1, 'Date required'),
  startTime: z.string().min(1, 'Start time required'),
  endTime: z.string().min(1, 'End time required'),
  headcount: z.number().int().min(1, 'At least 1'),
  isPremium: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationId?: string;
  defaultDate?: string;
}

export function CreateShiftModal({ isOpen, onClose, defaultLocationId, defaultDate }: CreateShiftModalProps) {
  const createShift = useCreateShift();
  const { data: skills } = useSkills();
  const { data: locations } = useLocations();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      locationId: defaultLocationId ?? '',
      date: defaultDate ?? '',
      headcount: 1,
      isPremium: false,
    },
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data: FormData) => {
    try {
      const location = locations?.find((l) => l.id === data.locationId);
      const tz = location?.timezone ?? 'UTC';

      const startTime = new Date(`${data.date}T${data.startTime}:00`);
      let endTime = new Date(`${data.date}T${data.endTime}:00`);
      if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);

      await createShift.mutateAsync({
        locationId: data.locationId,
        skillId: data.skillId,
        date: data.date,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        headcount: data.headcount,
        isPremium: data.isPremium ?? false,
      });

      toast.success('Shift created');
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create shift');
    }
  };

  const inputCls = (err: boolean) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow ${err ? 'border-red-400 bg-red-50' : 'border-slate-200'}`;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Shift"
      description="Add a new shift to the schedule"
      icon={CalendarPlus}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" form="create-shift-form" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Shift
          </button>
        </div>
      }
    >
      <form id="create-shift-form" onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Location <span className="text-red-500">*</span></label>
            <select {...register('locationId')} className={inputCls(!!errors.locationId)}>
              <option value="">Select location...</option>
              {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {errors.locationId && <p className="mt-1 text-xs text-red-600">{errors.locationId.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Required Skill <span className="text-red-500">*</span></label>
            <select {...register('skillId')} className={inputCls(!!errors.skillId)}>
              <option value="">Select skill...</option>
              {skills?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.skillId && <p className="mt-1 text-xs text-red-600">{errors.skillId.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('date')} className={inputCls(!!errors.date)} />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time <span className="text-red-500">*</span></label>
            <input type="time" {...register('startTime')} className={inputCls(!!errors.startTime)} />
            {errors.startTime && <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time <span className="text-red-500">*</span></label>
            <input type="time" {...register('endTime')} className={inputCls(!!errors.endTime)} />
            {errors.endTime && <p className="mt-1 text-xs text-red-600">{errors.endTime.message}</p>}
            <p className="mt-1 text-xs text-slate-400">Overnight shifts (e.g. 11pm–3am) supported</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Headcount <span className="text-red-500">*</span></label>
            <input type="number" min={1} {...register('headcount', { valueAsNumber: true })} className={inputCls(!!errors.headcount)} />
            {errors.headcount && <p className="mt-1 text-xs text-red-600">{errors.headcount.message}</p>}
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="isPremium" {...register('isPremium')} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="isPremium" className="text-sm font-medium text-slate-700">Premium shift (Fri/Sat evening)</label>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
