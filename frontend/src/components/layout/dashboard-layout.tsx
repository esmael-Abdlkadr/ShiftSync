'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { NotificationBell } from './notification-bell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return 'Dashboard';
  return last
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="ml-64 h-screen flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <p className="text-sm font-semibold text-slate-700">
            {getPageTitle(pathname)}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="Notifications"
            >
              <NotificationBell />
            </Link>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
              {(session?.user as { firstName?: string })?.firstName?.[0]}
              {(session?.user as { lastName?: string })?.lastName?.[0]}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
