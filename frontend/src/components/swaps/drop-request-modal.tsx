'use client';

import { AlertTriangle, Loader2, ArrowDown } from 'lucide-react';
import { BaseModal } from '@/components/ui/modal';
import { useCreateDrop } from '@/hooks/api/use-drops';
import toast from 'react-hot-toast';
import type { Shift } from '@/types/shift';

interface Props {
  shift: Shift;
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(utcStr: string, tz: string): string {
  return new Date(utcStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
}

export function DropRequestModal({ shift, isOpen, onClose }: Props) {
  const createDrop = useCreateDrop();

  const expiresAt = new Date(new Date(shift.startTime).getTime() - 24 * 60 * 60 * 1000);
  const shiftDate = new Date(shift.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const tz = shift.location.timezone;

  const handleSubmit = async () => {
    try {
      await createDrop.mutateAsync({ shiftId: shift.id });
      toast.success('Shift dropped — it is now open for eligible staff to claim.');
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create drop request.');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Drop Shift"
      description="Offer your shift to other eligible staff"
      icon={ArrowDown}
      iconVariant="warning"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Keep My Shift
          </button>
          <button
            onClick={handleSubmit}
            disabled={createDrop.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {createDrop.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Drop Shift
          </button>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-sm">
          <div className="font-medium text-slate-900">{shift.requiredSkill.name}</div>
          <div className="text-slate-600">{shiftDate}</div>
          <div className="text-slate-600">
            {formatTime(shift.startTime, tz)} – {formatTime(shift.endTime, tz)}
          </div>
          <div className="text-slate-500 text-xs">{shift.location.name}</div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 space-y-1">
            <p>
              Your assignment stays active until a manager approves a claimer. The drop request
              will <strong>expire {expiresAt.toLocaleString()}</strong> if no one claims it.
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
