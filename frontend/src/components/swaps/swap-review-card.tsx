'use client';

import { useState } from 'react';
import { ArrowLeftRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { RequestStatusBadge } from './request-status-badge';
import { useReviewSwap } from '@/hooks/api/use-swaps';
import toast from 'react-hot-toast';
import type { SwapRequest } from '@/types/swap';

interface Props {
  swap: SwapRequest;
}

function formatShiftTime(utcStr: string, tz: string): string {
  return new Date(utcStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
}

export function SwapReviewCard({ swap }: Props) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const review = useReviewSwap();
  const tz = swap.shift.location.timezone;

  const handleReview = async (approve: boolean) => {
    try {
      await review.mutateAsync({ id: swap.id, approve, notes: notes || undefined });
      toast.success(approve ? 'Swap approved — assignments updated.' : 'Swap request rejected.');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Action failed.');
    }
  };

  const shiftDate = new Date(swap.shift.startTime).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <ArrowLeftRight className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">Shift Swap Request</div>
            <div className="text-xs text-slate-500">
              {shiftDate} · {formatShiftTime(swap.shift.startTime, tz)} – {formatShiftTime(swap.shift.endTime, tz)}
            </div>
          </div>
        </div>
        <RequestStatusBadge status={swap.status} type="swap" />
      </div>

      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg text-sm">
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-500 mb-1">From</div>
          <div className="font-medium text-slate-900">{swap.initiator.firstName} {swap.initiator.lastName}</div>
          <div className="text-xs text-slate-500">{swap.initiator.email}</div>
        </div>
        <ArrowLeftRight className="h-4 w-4 text-slate-400 shrink-0" />
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-500 mb-1">With</div>
          <div className="font-medium text-slate-900">{swap.target.firstName} {swap.target.lastName}</div>
          <div className="text-xs text-slate-500">{swap.target.email}</div>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        <span className="font-medium">{swap.shift.location.name}</span> · {swap.shift.requiredSkill.name}
      </div>

      {swap.status === 'PENDING_APPROVAL' && (
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
              Reject
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

      {swap.managerNotes && (
        <div className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">
          Manager note: {swap.managerNotes}
        </div>
      )}
    </div>
  );
}
