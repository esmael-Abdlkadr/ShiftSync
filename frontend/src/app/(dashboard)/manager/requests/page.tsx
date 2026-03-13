'use client';

import { useState } from 'react';
import { ArrowLeftRight, ArrowDown, CheckCircle, Inbox } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SwapReviewCard } from '@/components/swaps/swap-review-card';
import { DropReviewCard } from '@/components/swaps/drop-review-card';
import { useSwaps } from '@/hooks/api/use-swaps';
import { useDrops } from '@/hooks/api/use-drops';

type Tab = 'swaps' | 'drops';

export default function ManagerRequestsPage() {
  const [tab, setTab] = useState<Tab>('swaps');

  const { data: swaps, isLoading: swapsLoading } = useSwaps({ status: 'PENDING_APPROVAL' });
  const { data: drops, isLoading: dropsLoading } = useDrops({ status: 'CLAIMED_PENDING' });

  const pendingSwaps = swaps ?? [];
  const pendingDrops = drops ?? [];

  const tabs = [
    { id: 'swaps' as Tab, label: 'Pending Swaps', icon: ArrowLeftRight, count: pendingSwaps.length },
    { id: 'drops' as Tab, label: 'Drop Claims', icon: ArrowDown, count: pendingDrops.length },
  ];

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Swap &amp; Coverage Requests</h1>
            <p className="text-xs text-slate-500">Review and approve pending swap and drop requests</p>
          </div>
          {(pendingSwaps.length + pendingDrops.length) > 0 && (
            <span className="ml-auto text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              {pendingSwaps.length + pendingDrops.length} pending
            </span>
          )}
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
                  tab === t.id ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'swaps' && (
            <div className="max-w-2xl space-y-3">
              {swapsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : pendingSwaps.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No pending swap requests</p>
                  <p className="text-xs mt-1">All swap requests have been reviewed.</p>
                </div>
              ) : (
                pendingSwaps.map((swap) => <SwapReviewCard key={swap.id} swap={swap} />)
              )}
            </div>
          )}

          {tab === 'drops' && (
            <div className="max-w-2xl space-y-3">
              {dropsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : pendingDrops.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No pending drop claims</p>
                  <p className="text-xs mt-1">No staff have claimed dropped shifts that need your approval.</p>
                </div>
              ) : (
                pendingDrops.map((drop) => <DropReviewCard key={drop.id} drop={drop} />)
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
