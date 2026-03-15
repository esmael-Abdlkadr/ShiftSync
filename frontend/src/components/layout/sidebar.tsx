'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  Clock,
  Bell,
  Settings,
  LogOut,
  CalendarDays,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { NotificationBell } from './notification-bell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Schedule', href: '/admin/schedule', icon: Calendar },
  { label: 'Locations', href: '/admin/locations', icon: MapPin },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Audit Log', href: '/admin/audit', icon: ClipboardList },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const MANAGER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/manager', icon: LayoutDashboard },
  { label: 'Staff', href: '/manager/staff', icon: Users },
  { label: 'Schedule', href: '/manager/schedule', icon: Calendar },
  { label: 'Requests', href: '/manager/requests', icon: Clock },
  { label: 'Reports', href: '/manager/reports', icon: BarChart3 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/staff', icon: LayoutDashboard },
  { label: 'My Schedule', href: '/staff/schedule', icon: Calendar },
  { label: 'Availability', href: '/staff/availability', icon: Clock },
  { label: 'Swap Requests', href: '/staff/swaps', icon: Bell },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const navItems =
    role === 'ADMIN' ? ADMIN_NAV : role === 'MANAGER' ? MANAGER_NAV : STAFF_NAV;

  return (
    <aside className="w-64 h-full bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">ShiftSync</h1>
            <p className="text-xs text-slate-400 capitalize">{role?.toLowerCase()} Portal</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isNotifications = item.label === 'Notifications';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="h-5 w-5 flex items-center justify-center">
                {isNotifications ? (
                  <NotificationBell />
                ) : (
                  <item.icon className="h-5 w-5" />
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium">
            {session?.user?.firstName?.[0]}
            {session?.user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session?.user?.firstName} {session?.user?.lastName}
            </p>
            <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
