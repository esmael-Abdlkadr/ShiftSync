'use client';

import type { SwapRequestStatus, DropRequestStatus } from '@/types/swap';

const SWAP_LABELS: Record<SwapRequestStatus, string> = {
  PENDING_PARTNER: 'Awaiting Partner',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const SWAP_CLASSES: Record<SwapRequestStatus, string> = {
  PENDING_PARTNER: 'bg-amber-100 text-amber-700',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-500',
};

const DROP_LABELS: Record<DropRequestStatus, string> = {
  OPEN: 'Open',
  CLAIMED_PENDING: 'Claimed — Pending Approval',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const DROP_CLASSES: Record<DropRequestStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  CLAIMED_PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-500',
};

interface Props {
  status: SwapRequestStatus | DropRequestStatus;
  type: 'swap' | 'drop';
}

export function RequestStatusBadge({ status, type }: Props) {
  const label =
    type === 'swap'
      ? SWAP_LABELS[status as SwapRequestStatus]
      : DROP_LABELS[status as DropRequestStatus];
  const cls =
    type === 'swap'
      ? SWAP_CLASSES[status as SwapRequestStatus]
      : DROP_CLASSES[status as DropRequestStatus];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
