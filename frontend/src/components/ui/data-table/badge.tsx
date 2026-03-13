'use client';

import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-cyan-50 text-cyan-700',
  purple: 'bg-purple-100 text-purple-700',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
}

export function Badge({ children, variant = 'default', icon: Icon, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${VARIANT_STYLES[variant]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

interface BadgeGroupProps {
  badges: { id: string; label: string; variant?: BadgeVariant; icon?: LucideIcon }[];
  maxVisible?: number;
  emptyText?: string;
}

export function BadgeGroup({ badges, maxVisible = 2, emptyText = 'None' }: BadgeGroupProps) {
  if (badges.length === 0) {
    return <span className="text-sm text-slate-400 italic">{emptyText}</span>;
  }

  const visible = badges.slice(0, maxVisible);
  const remaining = badges.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((badge) => (
        <Badge key={badge.id} variant={badge.variant} icon={badge.icon}>
          {badge.label}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="default">+{remaining}</Badge>
      )}
    </div>
  );
}
