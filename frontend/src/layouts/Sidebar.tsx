import { NavLink } from 'react-router-dom';
import {
  History,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/common/Brand';
import { cn } from '@/lib/cn';
import { useUIStore } from '@/stores/uiStore';

type NavItem = readonly [string, LucideIcon, 'home' | 'evaluate' | 'history' | 'settings'];

const navigation: NavItem[] = [
  ['/app', Home, 'home'],
  ['/app/evaluate', ShieldCheck, 'evaluate'],
  ['/app/history', History, 'history'],
  ['/app/settings', Settings, 'settings'],
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggle = useUIStore((state) => state.toggleSidebar);
  const language = useUIStore((state) => state.language);
  const rtl = language === 'ar';

  const CollapseIcon = rtl
    ? collapsed
      ? PanelRightOpen
      : PanelRightClose
    : collapsed
      ? PanelLeftOpen
      : PanelLeftClose;

  return (
    <>
      <button
        aria-label="Close navigation overlay"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
      />

      <aside
        className={cn(
          'cg-sidebar fixed z-50 flex flex-col bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] px-3 py-4 shadow-xl backdrop-blur-xl transition-[width,transform] duration-300 lg:z-30 lg:shadow-none',
          collapsed ? 'w-[82px]' : 'w-[252px]',
          mobileOpen ? 'translate-x-0' : 'cg-sidebar-mobile-hidden',
        )}
      >
        <div className={cn('flex h-12 items-center', collapsed ? 'justify-center' : 'justify-between px-2')}>
          <Brand compact={collapsed} />
          <button
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-7 flex-1 space-y-1.5" aria-label="Primary navigation">
          {navigation.map(([to, Icon, key]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              onClick={onClose}
              title={collapsed ? t(`nav.${key}`) : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/15'
                    : 'text-[var(--muted)] hover:bg-blue-50/70 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <Icon className="h-[19px] w-[19px] shrink-0" />
              {!collapsed && <span>{t(`nav.${key}`)}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] pt-4">
          <button
            onClick={toggle}
            className={cn(
              'hidden h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-slate-100 lg:flex dark:hover:bg-slate-800',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon className="h-[18px] w-[18px]" />
            {!collapsed && <span>{rtl ? 'طي الشريط' : 'Collapse'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
