'use client';

import { useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { BaseModal } from '@/components/ui/modal';
import { useCreateSwap } from '@/hooks/api/use-swaps';
import toast from 'react-hot-toast';
import type { Shift, ShiftAssignment } from '@/types/shift';

interface Props {
  shift: Shift;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function SwapRequestModal({ shift, isOpen, onClose, currentUserId }: Props) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const createSwap = useCreateSwap();

  const otherAssignees: ShiftAssignment[] = (shift.assignments ?? []).filter(
    (a) => a.user.id !== currentUserId,
  );

  const handleSubmit = async () => {
    if (!selectedTargetId) return;
    try {
      await createSwap.mutateAsync({ shiftId: shift.id, targetUserId: selectedTargetId });
      toast.success('Swap request sent — waiting for partner to accept.');
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to send swap request.');
    }
  };

  const handleClose = () => {
    setSelectedTargetId('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Request Shift Swap"
      description={`${shift.requiredSkill.name} · ${new Date(shift.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
      icon={ArrowLeftRight}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedTargetId || createSwap.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createSwap.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Swap Request
          </button>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm text-slate-500">
          Select a co-worker to swap this shift with. They will receive a notification and must
          accept before a manager approves the change.
        </p>

        {otherAssignees.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            No other staff members are assigned to this shift.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Co-workers on this shift
            </p>
            {otherAssignees.map((a) => (
              <button
                key={a.user.id}
                onClick={() => setSelectedTargetId(a.user.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTargetId === a.user.id
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    {a.user.firstName[0]}{a.user.lastName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {a.user.firstName} {a.user.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{a.user.email}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Note:</strong> Your original assignment stays in place until the manager approves.
          You can cancel this request any time before approval.
        </div>
      </div>
    </BaseModal>
  );
}
