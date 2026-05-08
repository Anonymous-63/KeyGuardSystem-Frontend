import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { hasPermission, type ResourceType } from '../features/auth/permissions';
import { ToastProvider } from './shared/Toast';

// ─── Theme ────────────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('kgs-theme') === 'dark');
  useEffect(() => {
    const t = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('kgs-theme', t);
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

// ─── SVG icon helper ──────────────────────────────────────────────────────────

const Ico = ({ d, size = '1.1rem' }: { d: string | string[]; size?: string }) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    style={{ width: size, height: size, flexShrink: 0 }}
  >
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />
    ))}
  </svg>
);

// ─── Icon paths (Heroicons v2 outline) ────────────────────────────────────────

const P = {
  dashboard: [
    'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z',
    'M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z',
    'M13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z',
    'M13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  ],
  location: [
    'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z',
    'M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  ],
  operator: [
    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
    'M4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  ],
  users: [
    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  ],
  cabinet: [
    'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25',
    'M21 15V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25V15m18 0A2.25 2.25 0 0118.75 17.25H5.25A2.25 2.25 0 013 15',
  ],
  asset: [
    'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
  ],
  assetGroup: [
    'M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75z',
    'M14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25z',
    'M3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z',
  ],
  clock: ['M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'],
  arrows: ['M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5'],
  cog: [
    'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  sun: [
    'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
  ],
  moon: ['M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z'],
  bars: ['M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'],
  logout: ['M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75'],
  lock: ['M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'],
};

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  ico: string[];
  label: string;
  resource?: ResourceType;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', ico: P.dashboard, label: 'Dashboard' }],
  },
  {
    title: 'Management',
    items: [
      { to: '/locations',     ico: P.location, label: 'Locations',     resource: 'LOCATION' },
      { to: '/operators',     ico: P.operator, label: 'Web Operators',  resource: 'OPERATOR' },
      { to: '/cabinet-users', ico: P.users,    label: 'Cabinet Users',  resource: 'CABINET_USER' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { to: '/cabinets',     ico: P.cabinet,    label: 'Cabinets',     resource: 'CABINET' },
      { to: '/assets',       ico: P.asset,      label: 'Assets',       resource: 'ASSET' },
      { to: '/asset-groups', ico: P.assetGroup, label: 'Asset Groups', resource: 'ASSET_GROUP' },
    ],
  },
  {
    title: 'Controls',
    items: [
      { to: '/time-constraints', ico: P.clock,  label: 'Time Constraints', resource: 'TIME_CONSTRAINT' },
      { to: '/transactions',     ico: P.arrows, label: 'Transactions',     resource: 'TRANSACTION' },
    ],
  },
];

// ─── Page title ───────────────────────────────────────────────────────────────

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === '/profile') return 'My Profile';
  const all = NAV_GROUPS.flatMap((g) => g.items);
  const match = all.find((i) => pathname === i.to || pathname.startsWith(i.to + '/'));
  return match?.label ?? 'KeyGuard';
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  const operator = useAppSelector((s) => s.auth.operator);

  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (!item.resource) return true;
      if (!operator) return false;
      return hasPermission(operator.type, item.resource, 'READ');
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 h-full bg-base-100 border-r border-base-200 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-base-200 shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-content)' }}
        >
          <Ico d={P.lock} size="1rem" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight text-base-content">KeyGuard</p>
          <p className="text-[0.65rem] text-base-content/40 leading-tight">Management Console</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-square lg:hidden">
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-base-content/30">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, ico, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-content'
                        : 'text-base-content/65 hover:bg-base-200 hover:text-base-content'
                    }`
                  }
                >
                  <Ico d={ico} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Account */}
        <div>
          <p className="px-3 mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-base-content/30">
            Account
          </p>
          <div className="space-y-0.5">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/65 hover:bg-base-200 hover:text-base-content'
                }`
              }
            >
              <Ico d={P.cog} />
              My Profile
            </NavLink>
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-base-200 shrink-0">
        <div className="flex items-center gap-2.5 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-content)' }}
          >
            {operator?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-base-content truncate leading-tight">
              {operator?.name ?? operator?.id ?? 'User'}
            </p>
            <p className="text-xs text-base-content/40 truncate leading-tight">{operator?.id}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = usePageTitle();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-base-200">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div
          className="fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ease-in-out"
          style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top header — visible on all screen sizes */}
          <header className="h-14 flex items-center gap-3 px-4 lg:px-6 bg-base-100 border-b border-base-200 shrink-0">
            {/* Hamburger (mobile only) */}
            <button
              className="btn btn-ghost btn-sm btn-square lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Ico d={P.bars} />
            </button>

            {/* Page title */}
            <h2 className="flex-1 text-base font-semibold text-base-content truncate">
              {pageTitle}
            </h2>

            {/* Theme toggle */}
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={toggle}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {dark ? <Ico d={P.sun} /> : <Ico d={P.moon} />}
            </button>

            {/* Logout */}
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <Ico d={P.logout} />
            </button>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
