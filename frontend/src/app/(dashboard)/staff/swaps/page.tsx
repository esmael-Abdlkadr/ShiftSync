'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeftRight, ArrowDown, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RequestStatusBadge } from '@/components/swaps/request-status-badge';
import { SwapRequestModal } from '@/components/swaps/swap-request-modal';
import { DropRequestModal } from '@/components/swaps/drop-request-modal';
import { useShifts } from '@/hooks/api/use-shifts';
import { useSwaps, useCancelSwap, useRespondToSwap } from '@/hooks/api/use-swaps';
import { useDrops, useOpenDrops, useCancelDrop, useClaimDrop } from '@/hooks/api/use-drops';
import { useSocketEvent } from '@/hooks/use-socket';
import { useQueryClient } from '@tanstack/react-query';
import { swapKeys } from '@/hooks/api/use-swaps';
import { dropKeys } from '@/hooks/api/use-drops';
import toast from 'react-hot-toast';
import type { Shift } from '@/types/shift';

type Tab = 'my-shifts' | 'my-requests' | 'available';

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function formatTime(utcStr: string, tz: string): string {
  return new Date(utcStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
  });
}

export default function StaffSwapsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? '';
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('my-shifts');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [swapShift, setSwapShift] = useState<Shift | null>(null);
  const [dropShift, setDropShift] = useState<Shift | null>(null);

  const { data: shifts } = useShifts({ weekStart: weekStart.toISOString() });
  const { data: mySwaps } = useSwaps();
  const { data: myDrops } = useDrops();
  const { data: openDrops } = useOpenDrops();

  const cancelSwap  = useCancelSwap();
  const respondSwap = useRespondToSwap();
  const cancelDrop  = useCancelDrop();
  const claimDrop   = useClaimDrop();

  useSocketEvent('swap:new', () => {
    queryClient.invalidateQueries({ queryKey: swapKeys.all });
    toast('You have a new swap request', { icon: '🔄' });
  });
  useSocketEvent<{ status: string }>('swap:resolved', (data) => {
    queryClient.invalidateQueries({ queryKey: swapKeys.all });
    if (data.status === 'APPROVED') toast.success('Swap request approved!');
    else if (data.status === 'CANCELLED') toast('Swap request was declined or cancelled', { icon: '❌' });
  });
  useSocketEvent<{ status: string }>('drop:resolved', (data) => {
    queryClient.invalidateQueries({ queryKey: dropKeys.all });
    if (data.status === 'APPROVED') toast.success('Drop request approved!');
  });

  const myShifts = (shifts ?? []).filter((s) =>
    s.assignments.some((a) => a.user.id === userId),
  );

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const handleCancelSwap = async (id: string) => {
    try {
      await cancelSwap.mutateAsync(id);
      toast.success('Swap request cancelled.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel swap.');
    }
  };

  const handleCancelDrop = async (id: string) => {
    try {
      await cancelDrop.mutateAsync(id);
      toast.success('Drop request cancelled.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel drop.');
    }
  };

  const handleClaimDrop = async (id: string) => {
    try {
      await claimDrop.mutateAsync(id);
      toast.success('Shift claimed — waiting for manager approval.');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to claim shift.';
      toast.error(typeof msg === 'string' ? msg : 'Scheduling conflict — cannot claim this shift.');
    }
  };

  const tabs = [
    { id: 'my-shifts' as Tab, label: 'My Shifts', icon: ArrowLeftRight, count: myShifts.length },
    { id: 'my-requests' as Tab, label: 'My Requests', icon: ArrowDown, count: (mySwaps?.length ?? 0) + (myDrops?.length ?? 0) },
    { id: 'available' as Tab, label: 'Available Shifts', icon: Gift, count: openDrops?.length ?? 0 },
  ];

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <ArrowLeftRight className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Swap & Coverage</h1>
            <p className="text-xs text-slate-500">Manage shift swaps and drop requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-slate-200 bg-white px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* MY SHIFTS TAB */}
          {tab === 'my-shifts' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={prevWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <span className="text-sm font-medium text-slate-900 min-w-56 text-center">
                  {formatWeekRange(weekStart)}
                </span>
                <button onClick={nextWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setWeekStart(getMonday(new Date()))}
                  className="ml-1 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Today
                </button>
              </div>

              {myShifts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No shifts assigned this week.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myShifts.map((shift) => {
                    const tz = shift.location.timezone;
                    const dateLabel = new Date(shift.startTime).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'short', day: 'numeric', timeZone: tz,
                    });
                    const hasActiveSwap = (mySwaps ?? []).some(
                      (s) => s.shiftId === shift.id &&
                        ['PENDING_PARTNER', 'PENDING_APPROVAL'].includes(s.status),
                    );
                    const hasActiveDrop = (myDrops ?? []).some(
                      (d) => d.shiftId === shift.id &&
                        ['OPEN', 'CLAIMED_PENDING'].includes(d.status),
                    );

                    return (
                      <div key={shift.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900">{dateLabel}</div>
                            <div className="text-sm text-slate-600">
                              {formatTime(shift.startTime, tz)} – {formatTime(shift.endTime, tz)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{shift.location.name}</span>
                              <span>·</span>
                              <span>{shift.requiredSkill.name}</span>
                              {shift.isPremium && (
                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">★ Premium</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {hasActiveSwap && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Swap Pending</span>
                            )}
                            {hasActiveDrop && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Drop Pending</span>
                            )}
                            {!hasActiveSwap && !hasActiveDrop && (
                              <>
                                <button
                                  onClick={() => setSwapShift(shift)}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  Request Swap
                                </button>
                                <button
                                  onClick={() => setDropShift(shift)}
                                  className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  Drop Shift
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MY REQUESTS TAB */}
          {tab === 'my-requests' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Swap Requests</h3>
                {(mySwaps ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No swap requests.</p>
                ) : (
                  <div className="space-y-2">
                    {(mySwaps ?? []).map((swap) => {
                      const tz = swap.shift.location.timezone;
                      const dateLabel = new Date(swap.shift.startTime).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      });
                      const canCancel = ['PENDING_PARTNER', 'PENDING_APPROVAL'].includes(swap.status);
                      const isInitiator = swap.initiatorId === userId;
                      const isTarget = swap.targetId === userId;

                      return (
                        <div key={swap.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                          <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-sm font-medium text-slate-900">
                                  {isInitiator
                                    ? `You → ${swap.target.firstName} ${swap.target.lastName}`
                                    : `${swap.initiator.firstName} ${swap.initiator.lastName} → You`}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {dateLabel} · {formatTime(swap.shift.startTime, tz)} – {formatTime(swap.shift.endTime, tz)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {swap.shift.location.name} · {swap.shift.requiredSkill.name}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <RequestStatusBadge status={swap.status} type="swap" />
                              {isTarget && swap.status === 'PENDING_PARTNER' && (
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => respondSwap.mutateAsync({ id: swap.id, accept: true })
                                      .then(() => toast.success('Swap accepted'))
                                      .catch(() => toast.error('Failed to accept swap'))}
                                    disabled={respondSwap.isPending}
                                    className="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => respondSwap.mutateAsync({ id: swap.id, accept: false })
                                      .then(() => toast.success('Swap declined'))
                                      .catch(() => toast.error('Failed to decline swap'))}
                                    disabled={respondSwap.isPending}
                                    className="px-3 py-1 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                              {isInitiator && canCancel && (
                                <button
                                  onClick={() => handleCancelSwap(swap.id)}
                                  className="text-xs text-red-500 hover:text-red-700 underline"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                          {swap.managerNotes && (
                            <div className="mt-2 text-xs text-slate-500 italic border-t border-slate-100 pt-2">
                              Manager: {swap.managerNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Drop Requests</h3>
                {(myDrops ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No drop requests.</p>
                ) : (
                  <div className="space-y-2">
                    {(myDrops ?? []).map((drop) => {
                      const tz = drop.shift.location.timezone;
                      const dateLabel = new Date(drop.shift.startTime).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      });
                      const canCancel = drop.status === 'OPEN';
                      const expiresAt = new Date(drop.expiresAt).toLocaleString();

                      return (
                        <div key={drop.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                          <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900">
                                {dateLabel} · {formatTime(drop.shift.startTime, tz)} – {formatTime(drop.shift.endTime, tz)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {drop.shift.location.name} · {drop.shift.requiredSkill.name}
                              </div>
                              <div className="text-xs text-slate-400">Expires: {expiresAt}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <RequestStatusBadge status={drop.status} type="drop" />
                              {canCancel && (
                                <button
                                  onClick={() => handleCancelDrop(drop.id)}
                                  className="text-xs text-red-500 hover:text-red-700 underline"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                          {drop.claimer && (
                            <div className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2">
                              Claimed by: <span className="font-medium">{drop.claimer.firstName} {drop.claimer.lastName}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AVAILABLE SHIFTS TAB */}
          {tab === 'available' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Shifts dropped by other staff that you are eligible to claim (matching skill &amp; location).
              </p>
              {(openDrops ?? []).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Gift className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No available shifts to claim right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(openDrops ?? []).map((drop) => {
                    const tz = drop.shift.location.timezone;
                    const dateLabel = new Date(drop.shift.startTime).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'short', day: 'numeric',
                    });
                    const expiresIn = Math.max(
                      0,
                      Math.round((new Date(drop.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)),
                    );

                    return (
                      <div key={drop.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900">{dateLabel}</div>
                            <div className="text-sm text-slate-600">
                              {formatTime(drop.shift.startTime, tz)} – {formatTime(drop.shift.endTime, tz)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{drop.shift.location.name}</span>
                              <span>·</span>
                              <span>{drop.shift.requiredSkill.name}</span>
                              {drop.shift.isPremium && (
                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">★ Premium</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              Dropped by {drop.requestor.firstName} {drop.requestor.lastName}
                              {' · '}Expires in {expiresIn}h
                            </div>
                          </div>
                          <button
                            onClick={() => handleClaimDrop(drop.id)}
                            disabled={claimDrop.isPending}
                            className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            Claim Shift
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {swapShift && (
        <SwapRequestModal
          shift={swapShift}
          isOpen={!!swapShift}
          onClose={() => setSwapShift(null)}
          currentUserId={userId}
        />
      )}
      {dropShift && (
        <DropRequestModal
          shift={dropShift}
          isOpen={!!dropShift}
          onClose={() => setDropShift(null)}
        />
      )}
    </DashboardLayout>
  );
}
