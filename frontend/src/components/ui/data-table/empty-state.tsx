'use client';

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="text-lg font-medium text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-slate-900 font-medium hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
