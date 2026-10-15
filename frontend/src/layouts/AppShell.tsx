import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '@/stores/uiStore';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <div
      className="cg-page min-h-screen"
      style={{ '--sidebar-width': collapsed ? '82px' : '252px' } as React.CSSProperties}
    >
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="cg-shell-content min-w-0 transition-[margin] duration-300">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
