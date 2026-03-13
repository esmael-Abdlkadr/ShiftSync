'use client';

import { useState } from 'react';
import { ArrowDown, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { RequestStatusBadge } from './request-status-badge';
import { useReviewDrop } from '@/hooks/api/use-drops';
import toast from 'react-hot-toast';
import type { DropRequest } from '@/types/swap';

interface Props {
  drop: DropRequest;
}

function formatShiftTime(utcStr: string, tz: string): string {
  return new Date(utcStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
}

export function DropReviewCard({ drop }: Props) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const review = useReviewDrop();
  const tz = drop.shift.location.timezone;

  const handleReview = async (approve: boolean) => {
    try {
      await review.mutateAsync({ id: drop.id, approve, notes: notes || undefined });
      toast.success(approve ? 'Drop approved — assignment transferred.' : 'Claim rejected — shift back to open.');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Action failed.');
    }
  };

  const shiftDate = new Date(drop.shift.startTime).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const expiresAt = new Date(drop.expiresAt).toLocaleString();

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <ArrowDown className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">Drop Request</div>
            <div className="text-xs text-slate-500">
              {shiftDate} · {formatShiftTime(drop.shift.startTime, tz)} – {formatShiftTime(drop.shift.endTime, tz)}
            </div>
          </div>
        </div>
        <RequestStatusBadge status={drop.status} type="drop" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2.5 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Dropping</div>
          <div className="font-medium text-slate-900">{drop.requestor.firstName} {drop.requestor.lastName}</div>
          <div className="text-xs text-slate-500">{drop.requestor.email}</div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Claiming</div>
          {drop.claimer ? (
            <>
              <div className="font-medium text-slate-900">{drop.claimer.firstName} {drop.claimer.lastName}</div>
              <div className="text-xs text-slate-500">{drop.claimer.email}</div>
            </>
          ) : (
            <div className="text-slate-400 text-xs">No claimer yet</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="font-medium">{drop.shift.location.name}</span> · {drop.shift.requiredSkill.name}
        <span className="ml-auto flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {expiresAt}</span>
      </div>

      {drop.status === 'CLAIMED_PENDING' && drop.claimer && (
        <div className="space-y-2 pt-1 border-t border-slate-100">
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {showNotes ? 'Hide notes' : 'Add notes'}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => handleReview(false)}
              disabled={review.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {review.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Reject Claim
            </button>
            <button
              onClick={() => handleReview(true)}
              disabled={review.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {review.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Approve
            </button>
          </div>
        </div>
      )}

      {drop.managerNotes && (
        <div className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">
          Manager note: {drop.managerNotes}
        </div>
      )}
    </div>
  );
}
