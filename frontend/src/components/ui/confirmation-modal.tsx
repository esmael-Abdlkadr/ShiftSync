'use client';

import { useState } from 'react';
import { Trash2, UserX, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BaseModal } from './modal/base-modal';
import type { BaseModalProps } from './modal/base-modal';

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: LucideIcon;
  requireConfirmation?: string;
  isLoading?: boolean;
}

const VARIANT_CONFIG: Record<
  ConfirmationVariant,
  {
    buttonBg: string;
    buttonHover: string;
    defaultIcon: LucideIcon;
    iconVariant: BaseModalProps['iconVariant'];
  }
> = {
  danger:  { buttonBg: 'bg-red-600',   buttonHover: 'hover:bg-red-700',   defaultIcon: Trash2,        iconVariant: 'danger' },
  warning: { buttonBg: 'bg-amber-600', buttonHover: 'hover:bg-amber-700', defaultIcon: AlertTriangle, iconVariant: 'warning' },
  info:    { buttonBg: 'bg-blue-600',  buttonHover: 'hover:bg-blue-700',  defaultIcon: AlertCircle,   iconVariant: 'info' },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  requireConfirmation,
  isLoading = false,
}: ConfirmationModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);

  const config = VARIANT_CONFIG[variant];
  const Icon = icon || config.defaultIcon;
  const isConfirmDisabled = requireConfirmation ? confirmInput !== requireConfirmation : false;
  const isProcessing = isLoading || loading;

  const handleConfirm = async () => {
    if (isConfirmDisabled || isProcessing) return;
    setLoading(true);
    try {
      await onConfirm();
      setConfirmInput('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setConfirmInput('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      icon={Icon}
      iconVariant={config.iconVariant}
      title={title}
      description={description}
      closeOnBackdrop={!isProcessing}
      scrollable={false}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isProcessing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonBg} ${config.buttonHover}`}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      }
    >
      {requireConfirmation && (
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Type <span className="font-mono text-red-600">{requireConfirmation}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={requireConfirmation}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      )}
      {!requireConfirmation && <div />}
    </BaseModal>
  );
}

interface UseConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: LucideIcon;
  requireConfirmation?: string;
}

interface ConfirmationState extends UseConfirmationOptions {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState | null>(null);

  const confirm = (options: UseConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, isOpen: true, onConfirm: () => resolve(true) });
    });
  };

  const ConfirmationDialog = state ? (
    <ConfirmationModal
      isOpen={state.isOpen}
      onClose={() => setState(null)}
      onConfirm={state.onConfirm}
      title={state.title}
      description={state.description}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      icon={state.icon}
      requireConfirmation={state.requireConfirmation}
    />
  ) : null;

  return { confirm, ConfirmationDialog };
}

export function ConfirmDelete({
  isOpen, onClose, onConfirm, itemName, itemType = 'item', isLoading,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void | Promise<void>;
  itemName?: string; itemType?: string; isLoading?: boolean;
}) {
  return (
    <ConfirmationModal
      isOpen={isOpen} onClose={onClose} onConfirm={onConfirm}
      title={`Delete ${itemType}?`}
      description={itemName ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.` : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`}
      confirmText="Delete" variant="danger" icon={Trash2} isLoading={isLoading}
    />
  );
}

export function ConfirmDeactivate({
  isOpen, onClose, onConfirm, itemName, itemType = 'user', isLoading,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void | Promise<void>;
  itemName?: string; itemType?: string; isLoading?: boolean;
}) {
  return (
    <ConfirmationModal
      isOpen={isOpen} onClose={onClose} onConfirm={onConfirm}
      title={`Deactivate ${itemType}?`}
      description={itemName ? `Are you sure you want to deactivate "${itemName}"? They will no longer be able to access the system.` : `Are you sure you want to deactivate this ${itemType}? They will no longer be able to access the system.`}
      confirmText="Deactivate" variant="warning" icon={UserX} isLoading={isLoading}
    />
  );
}

export function ConfirmBulkAction({
  isOpen, onClose, onConfirm, count, action, itemType = 'items', variant = 'danger', isLoading,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void | Promise<void>;
  count: number; action: string; itemType?: string; variant?: ConfirmationVariant; isLoading?: boolean;
}) {
  return (
    <ConfirmationModal
      isOpen={isOpen} onClose={onClose} onConfirm={onConfirm}
      title={`${action} ${count} ${itemType}?`}
      description={`Are you sure you want to ${action.toLowerCase()} ${count} ${itemType}? This action will affect all selected items.`}
      confirmText={`${action} ${count} ${itemType}`}
      variant={variant} isLoading={isLoading}
    />
  );
}
