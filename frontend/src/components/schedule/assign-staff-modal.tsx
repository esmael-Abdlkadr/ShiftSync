'use client';

import { useState } from 'react';
import { BaseModal } from '@/components/ui/modal';
import { useEligibleStaff, useAssignStaff } from '@/hooks/api/use-assignments';
import {
  UserPlus, AlertTriangle, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Shift, OverrideReason } from '@/types/shift';

const OVERRIDE_REASONS: { value: OverrideReason; label: string }[] = [
  { value: 'EMERGENCY_COVERAGE', label: 'Emergency Coverage' },
  { value: 'EMPLOYEE_REQUEST',   label: 'Employee Request' },
  { value: 'BUSINESS_NEED',      label: 'Business Need' },
  { value: 'OTHER',              label: 'Other' },
];

interface AssignStaffModalProps {
  shift: Shift;
  isOpen: boolean;
  onClose: () => void;
}

function HoursBar({ hours, projected }: { hours: number; projected: number }) {
  const pct   = Math.min((projected / 40) * 100, 100);
  const color = projected >= 40 ? 'bg-red-500' : projected >= 35 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium min-w-16 text-right ${projected >= 40 ? 'text-red-600' : projected >= 35 ? 'text-amber-600' : 'text-slate-500'}`}>
        {hours}h → {projected}h
      </span>
    </div>
  );
}

export function AssignStaffModal({ shift, isOpen, onClose }: AssignStaffModalProps) {
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [overrideReason, setOverrideReason] = useState<OverrideReason | ''>('');
  const [overrideNotes, setOverrideNotes]   = useState('');
  const [isAssigning, setIsAssigning]       = useState(false);

  const { data: eligible, isLoading } = useEligibleStaff(isOpen ? shift.id : '');
  const assignStaff = useAssignStaff();

  const remaining = shift.headcount - shift.assignments.length;

  const handleClose = () => {
    setSelectedIds(new Set());
    setOverrideReason('');
    setOverrideNotes('');
    onClose();
  };

  const toggleSelect = (id: string, disabled: boolean) => {
    if (disabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size < remaining) next.add(id);
        else toast.error(`Only ${remaining} spot(s) remaining`);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selectedIds.size) return;
    setIsAssigning(true);

    let successCount = 0;
    for (const userId of selectedIds) {
      try {
        await assignStaff.mutateAsync({
          shiftId: shift.id,
          dto: {
            userId,
            ...(overrideReason && { overrideReason: overrideReason as OverrideReason, overrideNotes }),
          },
        });
        successCount++;
      } catch (err: unknown) {
        const member = eligible?.find((e) => e.id === userId);
        const name   = member ? `${member.firstName} ${member.lastName}` : 'Staff member';
        const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(`${name}: ${msg ?? 'Assignment failed'}`);
      }
    }

    setIsAssigning(false);
    if (successCount > 0) {
      toast.success(`${successCount} staff member${successCount > 1 ? 's' : ''} assigned`);
      handleClose();
    }
  };

  const selectedMembers = eligible?.filter((e) => selectedIds.has(e.id)) ?? [];
  const anyNeedOverride = selectedMembers.some((m) => m.overtimeRisk === 'high');
  const canConfirm      = selectedIds.size > 0 && (!anyNeedOverride || overrideReason);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Staff"
      description={`${shift.requiredSkill.name} · ${shift.assignments.length}/${shift.headcount} filled · ${remaining} spot${remaining !== 1 ? 's' : ''} remaining`}
      icon={UserPlus}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select staff below'}
          </span>
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!canConfirm || isAssigning}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Assignment{selectedIds.size > 1 ? `s (${selectedIds.size})` : ''}
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !eligible?.length ? (
          <div className="text-center py-8 text-slate-500 text-sm">No eligible staff found for this shift.</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Select Staff Member{remaining > 1 ? 's' : ''}</p>
            {eligible.map((member) => {
              const isSelected = selectedIds.has(member.id);
              const isDisabled = member.hasConflict;
              const atLimit    = !isSelected && selectedIds.size >= remaining;

              return (
                <button
                  key={member.id}
                  onClick={() => toggleSelect(member.id, isDisabled)}
                  disabled={isDisabled || atLimit}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : isDisabled || atLimit
                      ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{member.firstName} {member.lastName}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.hasConflict && (
                        <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          <AlertCircle className="h-3 w-3" /> Conflict
                        </span>
                      )}
                      {member.overtimeRisk === 'high' && !member.hasConflict && (
                        <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          <AlertTriangle className="h-3 w-3" /> OT Risk
                        </span>
                      )}
                      {member.overtimeRisk === 'medium' && !member.hasConflict && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          <AlertTriangle className="h-3 w-3" /> Near OT
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-1 ml-16">
                      <HoursBar hours={member.currentWeeklyHours} projected={member.projectedWeeklyHours} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {anyNeedOverride && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-orange-800">Manager Override Required</p>
            <select
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value as OverrideReason)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">Select reason...</option>
              {OVERRIDE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <textarea
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              placeholder="Explain the circumstances..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
}
