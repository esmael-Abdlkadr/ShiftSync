'use client';

import { useState } from 'react';
import { BaseModal } from '@/components/ui/modal';
import { useEligibleStaff, useAssignStaff } from '@/hooks/api/use-assignments';
import {
  UserPlus, AlertTriangle, AlertCircle, CheckCircle, Loader2, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Shift, OverrideReason, Violation } from '@/types/shift';

const OVERRIDE_REASONS: { value: OverrideReason; label: string }[] = [
  { value: 'EMERGENCY_COVERAGE', label: 'Emergency Coverage' },
  { value: 'EMPLOYEE_REQUEST', label: 'Employee Request' },
  { value: 'BUSINESS_NEED', label: 'Business Need' },
  { value: 'OTHER', label: 'Other' },
];

interface AssignStaffModalProps {
  shift: Shift;
  isOpen: boolean;
  onClose: () => void;
}

function HoursBar({ hours, projected }: { hours: number; projected: number }) {
  const pct = Math.min((projected / 40) * 100, 100);
  const color = projected >= 40 ? 'bg-red-500' : projected >= 35 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium min-w-12 text-right ${projected >= 40 ? 'text-red-600' : projected >= 35 ? 'text-amber-600' : 'text-slate-500'}`}>
        {hours}h → {projected}h
      </span>
    </div>
  );
}

function ViolationList({ violations }: { violations: Violation[] }) {
  const blocks = violations.filter((v) => v.severity === 'block');
  const overrides = violations.filter((v) => v.severity === 'override_required');
  const warnings = violations.filter((v) => v.severity === 'warning');

  return (
    <div className="space-y-2 mt-3">
      {blocks.map((v, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {v.message}
        </div>
      ))}
      {overrides.map((v, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {v.message}
        </div>
      ))}
      {warnings.map((v, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {v.message}
        </div>
      ))}
    </div>
  );
}

export function AssignStaffModal({ shift, isOpen, onClose }: AssignStaffModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<OverrideReason | ''>('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: eligible, isLoading } = useEligibleStaff(isOpen ? shift.id : '');
  const assignStaff = useAssignStaff();

  const handleClose = () => {
    setSelectedUserId(null);
    setOverrideReason('');
    setOverrideNotes('');
    setLastResult(null);
    onClose();
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;

    try {
      const result = await assignStaff.mutateAsync({
        shiftId: shift.id,
        dto: {
          userId: selectedUserId,
          ...(overrideReason && { overrideReason: overrideReason as OverrideReason, overrideNotes }),
        },
      });

      setLastResult(result);

      if (result.assigned) {
        const user = eligible?.find((e) => e.id === selectedUserId);
        toast.success(`${user?.firstName} ${user?.lastName} assigned successfully`);
        handleClose();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Failed to assign staff member';
      toast.error(message);
    }
  };

  const selected = eligible?.find((e) => e.id === selectedUserId);
  const requiresOverride = lastResult?.constraintResult?.requiresOverride;
  const hasBlocks = lastResult?.constraintResult?.violations?.some((v: Violation) => v.severity === 'block');
  const canConfirm = selectedUserId && (!requiresOverride || overrideReason);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Staff"
      description={`${shift.requiredSkill.name} · ${shift.assignments.length}/${shift.headcount} filled`}
      icon={UserPlus}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!canConfirm || assignStaff.isPending || hasBlocks}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignStaff.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Assignment
          </button>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !eligible?.length ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No eligible staff found for this shift.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Select Staff Member</p>
            {eligible.map((member) => (
              <button
                key={member.id}
                onClick={() => { setSelectedUserId(member.id); setLastResult(null); }}
                disabled={member.hasConflict}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedUserId === member.id
                    ? 'border-slate-900 bg-slate-50'
                    : member.hasConflict
                    ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Conflict</span>
                    )}
                    {member.overtimeRisk === 'high' && !member.hasConflict && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">OT Risk</span>
                    )}
                    {member.overtimeRisk === 'medium' && !member.hasConflict && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Near OT</span>
                    )}
                    {selectedUserId === member.id && (
                      <CheckCircle className="h-4 w-4 text-slate-900" />
                    )}
                  </div>
                </div>
                {selectedUserId === member.id && (
                  <HoursBar hours={member.currentWeeklyHours} projected={member.projectedWeeklyHours} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Constraint violations */}
        {lastResult && !lastResult.assigned && (
          <div>
            <ViolationList violations={lastResult.constraintResult.violations} />

            {lastResult.constraintResult.suggestions?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-700 mb-2">Suggested Alternatives</p>
                <div className="space-y-1.5">
                  {lastResult.constraintResult.suggestions.map((s: any) => (
                    <button
                      key={s.userId}
                      onClick={() => { setSelectedUserId(s.userId); setLastResult(null); }}
                      className="w-full text-left p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-900 transition-colors text-sm"
                    >
                      <span className="font-medium text-slate-900">{s.name}</span>
                      <span className="text-slate-500 ml-2">{s.weeklyHours}h this week</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Override section */}
        {requiresOverride && !hasBlocks && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-orange-800">Manager Override Required</p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Override Reason <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value as OverrideReason)}
                  className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white appearance-none"
                >
                  <option value="">Select reason...</option>
                  {OVERRIDE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Explain the circumstances..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
