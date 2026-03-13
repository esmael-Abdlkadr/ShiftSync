'use client';

import { useState } from 'react';
import { toZonedTime } from 'date-fns-tz';
import {
  X, Clock, MapPin, Briefcase, Users, Star, Globe, Trash2, Pencil,
  CheckCircle, AlertCircle, Loader2, UserMinus, History,
} from 'lucide-react';
import { usePublishShift, useUnpublishShift, useDeleteShift, useShift } from '@/hooks/api/use-shifts';
import { useRemoveAssignment } from '@/hooks/api/use-assignments';
import { useShiftAuditHistory } from '@/hooks/api/use-audit';
import { AssignStaffModal } from './assign-staff-modal';
import { EditShiftModal } from './edit-shift-modal';
import { ConfirmDelete } from '@/components/ui/confirmation-modal';
import toast from 'react-hot-toast';
import type { Shift } from '@/types/shift';
import type { AuditLogEntry } from '@/types/audit';

interface ShiftDetailPanelProps {
  shift: Shift;
  onClose: () => void;
}

function formatDateTime(utcStr: string, tz: string): string {
  return toZonedTime(new Date(utcStr), tz).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

type PanelTab = 'details' | 'history';

function ActionBadge({ action }: { action: string }) {
  let colour = 'bg-slate-100 text-slate-600';
  if (['CREATE', 'PUBLISH', 'APPROVE_SWAP', 'APPROVE_DROP'].includes(action))
    colour = 'bg-emerald-100 text-emerald-700';
  else if (['UPDATE', 'UNPUBLISH', 'ASSIGN_STAFF'].includes(action))
    colour = 'bg-blue-100 text-blue-700';
  else if (['DELETE', 'UNASSIGN_STAFF', 'REJECT_SWAP', 'REJECT_DROP'].includes(action))
    colour = 'bg-red-100 text-red-700';
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colour}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function HistoryTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No history recorded yet</p>
      </div>
    );
  }

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-4 py-2">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-4">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
          <div className="flex items-start gap-2 flex-wrap">
            <ActionBadge action={entry.action} />
            <span className="text-xs text-slate-500 mt-0.5">
              by{' '}
              <span className="font-medium text-slate-700">
                {entry.user.firstName} {entry.user.lastName}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(entry.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ShiftDetailPanel({ shift: initialShift, onClose }: ShiftDetailPanelProps) {
  const [tab, setTab] = useState<PanelTab>('details');
  const [showAssign, setShowAssign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string | null>(null);

  // Always use fresh shift data so headcount/assignments stay in sync after mutations
  const { data: freshShift } = useShift(initialShift.id);
  const shift = (freshShift as Shift | undefined) ?? initialShift;

  const { data: historyEntries = [], isLoading: historyLoading } =
    useShiftAuditHistory(shift.id);

  const publish = usePublishShift();
  const unpublish = useUnpublishShift();
  const deleteShift = useDeleteShift();
  const removeAssignment = useRemoveAssignment();

  const tz = shift.location.timezone;
  const isPublished = shift.status === 'PUBLISHED';
  const filled = shift.assignments.length;
  const isFull = filled >= shift.headcount;

  const handlePublishToggle = async () => {
    try {
      if (isPublished) {
        await unpublish.mutateAsync(shift.id);
        toast.success('Schedule unpublished');
      } else {
        await publish.mutateAsync(shift.id);
        toast.success('Schedule published — staff will be notified');
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Action failed');
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    try {
      await removeAssignment.mutateAsync({ shiftId: shift.id, userId });
      toast.success('Assignment removed');
      setAssignmentToRemove(null);
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  const isPending = publish.isPending || unpublish.isPending || deleteShift.isPending;

  return (
    <>
      <div className="flex flex-col h-full bg-white border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {isPublished ? 'Published' : 'Draft'}
            </span>
            {shift.isPremium && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-500" /> Premium
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 px-5">
          {(['details', 'history'] as PanelTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-1 mr-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Details */}
        {tab === 'details' && (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{formatDateTime(shift.startTime, tz)} – {formatDateTime(shift.endTime, tz)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{shift.location.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Briefcase className="h-4 w-4 text-slate-400" />
              <span>{shift.requiredSkill.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">{tz}</span>
            </div>
          </div>

          {/* Headcount */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700 font-medium">{filled}/{shift.headcount} staff assigned</span>
            {isFull ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 ml-auto" />
            )}
          </div>

          {/* Assigned staff */}
          {shift.assignments.length > 0 && (
            <div className="space-y-2">
              {shift.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                      {a.user.firstName[0]}{a.user.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{a.user.firstName} {a.user.lastName}</div>
                      {a.overrideReason && (
                        <div className="text-xs text-orange-600">Override: {a.overrideReason}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setAssignmentToRemove(a.user.id)}
                    className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove assignment"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Assign button */}
          {!isFull && (
            <button
              onClick={() => setShowAssign(true)}
              className="w-full py-2 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              + Assign Staff
            </button>
          )}
        </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <HistoryTimeline entries={historyEntries} />
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-200 space-y-2">
          <button
            onClick={handlePublishToggle}
            disabled={isPending}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              isPublished
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isPublished ? 'Unpublish' : 'Publish Schedule'}
          </button>

          {!isPublished && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 py-2 px-4 flex items-center justify-center gap-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => { void deleteShift.mutateAsync(shift.id).then(() => { toast.success('Shift deleted'); onClose(); }).catch((e: unknown) => { const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message; toast.error(msg ?? 'Failed'); }); }}
                disabled={deleteShift.isPending}
                className="flex-1 py-2 px-4 flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {showAssign && (
        <AssignStaffModal
          shift={shift}
          isOpen={showAssign}
          onClose={() => setShowAssign(false)}
        />
      )}

      {showEdit && (
        <EditShiftModal
          shift={shift}
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      <ConfirmDelete
        isOpen={!!assignmentToRemove}
        onClose={() => setAssignmentToRemove(null)}
        onConfirm={() => handleRemoveAssignment(assignmentToRemove!)}
        itemType="assignment"
        isLoading={removeAssignment.isPending}
      />
    </>
  );
}
