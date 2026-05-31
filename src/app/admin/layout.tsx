import type { ReactNode } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/members', label: 'Members & Roles' },
  { href: '/admin/wiki', label: 'Wiki Imports' },
  { href: '/admin/assets', label: 'Assets & Storage' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/audit', label: 'Audit Logs' },
  { href: '/admin/exports', label: 'Exports' },
  { href: '/admin/flags', label: 'Continuity Flags' },
  { href: '/admin/planning', label: 'Planning' },
  { href: '/admin/boards', label: 'Boards' },
  { href: '/admin/search', label: 'Search Index' },
  { href: '/admin/revisions', label: 'Revisions' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row min-h-full">
        {/* Admin sidebar */}
        <aside className="w-full lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-jollof-border bg-[#0f0d08]/50 p-4">
          <div className="text-[10px] text-jollof-label uppercase tracking-widest mb-3 font-medium">Admin Panel</div>
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-none">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-xs text-jollof-subtext hover:text-jollof-text hover:bg-jollof-panel rounded-md whitespace-nowrap transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
