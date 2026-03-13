'use client';

import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  actions: BulkAction[];
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  actions,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
      <div className="flex items-center gap-4">
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {selectedCount} of {totalCount} selected
        </span>
        {selectedCount < totalCount && (
          <button
            onClick={onSelectAll}
            className="text-sm text-white/70 hover:text-white underline"
          >
            Select all {totalCount}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                action.variant === 'danger'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
