'use client';

import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  className = '',
}: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked || indeterminate
          ? 'bg-slate-900 border-slate-900 text-white'
          : 'bg-white border-slate-300 hover:border-slate-400'
      } ${className}`}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3" />
      ) : checked ? (
        <Check className="h-3 w-3" />
      ) : null}
    </button>
  );
}
