'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
}

interface MenuPosition {
  top: number;
  left: number;
}

export function ActionMenu({ items }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_WIDTH = 192;
  const MENU_HEIGHT = items.length * 36 + 8;

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;

    const left = rect.left - MENU_WIDTH - 8;
    const preferredTop = rect.top + rect.height / 2 - MENU_HEIGHT / 2;
    const clampedTop = Math.max(8, Math.min(preferredTop, viewportH - MENU_HEIGHT - 8));

    setMenuPos({ top: clampedTop, left: Math.max(8, left) });
  }, [MENU_HEIGHT]);

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    calculatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const close = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const onScroll = () => setIsOpen(false);

    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={open}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4 text-slate-500" />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[9999]"
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
