'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconVariant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  hideCloseButton?: boolean;
  scrollable?: boolean;
}

const ICON_VARIANT_CLASSES: Record<
  NonNullable<BaseModalProps['iconVariant']>,
  { bg: string; color: string }
> = {
  default: { bg: 'bg-slate-900', color: 'text-white' },
  danger:  { bg: 'bg-red-100',   color: 'text-red-600' },
  warning: { bg: 'bg-amber-100', color: 'text-amber-600' },
  info:    { bg: 'bg-blue-100',  color: 'text-blue-600' },
  success: { bg: 'bg-emerald-100', color: 'text-emerald-600' },
};

export function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconVariant = 'default',
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
  hideCloseButton = false,
  scrollable = true,
}: BaseModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconClasses = ICON_VARIANT_CLASSES[iconVariant];
  const hasHeader = title || Icon;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        ref={panelRef}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${SIZE_CLASSES[size]} flex flex-col max-h-[90vh] transition-all duration-200`}
      >
        {hasHeader && (
          <div className="flex items-start gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
            {Icon && (
              <div
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconClasses.bg}`}
              >
                <Icon className={`h-4 w-4 ${iconClasses.color}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id="modal-title" className="text-base font-semibold text-slate-900 leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {!hasHeader && !hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className={scrollable ? 'flex-1 overflow-y-auto' : 'flex-1'}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
