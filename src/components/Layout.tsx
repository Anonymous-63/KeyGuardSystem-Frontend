import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { hasPermission, type ResourceType } from '../features/auth/permissions';
import { ToastProvider } from './shared/Toast';
import { OPERATOR_TYPES } from '../types/api';

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
  audit: ['M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z'],
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  bell:   'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
};

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  ico: string[];
  label: string;
  resource?: ResourceType;
  badge?: 'live';
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
      { to: '/transactions',     ico: P.arrows, label: 'Transactions',     resource: 'TRANSACTION', badge: 'live' },
      { to: '/audit',            ico: P.audit,  label: 'Audit Trail',      resource: 'AUDIT' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/settings', ico: P.cog, label: 'Settings', resource: 'APP_CONFIG' },
    ],
  },
];

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
    <aside style={{ background: 'var(--sb-bg)', borderRight: '1px solid var(--sb-border)', width: '210px', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {/* Brand */}
      <div style={{ padding: '0.875rem 1rem 0.75rem', borderBottom: '1px solid var(--sb-border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: 'var(--ent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
          <Ico d={P.lock} size="0.9rem" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-base-content)', letterSpacing: '-0.01em' }}>
          KeyGuard
        </span>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sb-text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex', marginLeft: 'auto' }}>
            <Ico d="M6 18L18 6M6 6l12 12" size="1rem" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.375rem 0.5rem' }}>
        {visibleGroups.map((group) => (
          <div key={group.title} style={{ marginBottom: '0.25rem' }}>
            <p style={{ padding: '0.5rem 0.75rem 0.2rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08rem', color: 'var(--sb-text-muted)', margin: 0 }}>
              {group.title}
            </p>
            {group.items.map(({ to, ico, label, badge }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `ent-nav-link${isActive ? ' ent-nav-active' : ''}`}>
                <Ico d={ico} size="0.95rem" />
                <span style={{ flex: 1 }}>{label}</span>
                {badge === 'live' && (
                  <span style={{ background: 'var(--color-error)', color: 'var(--color-error-content)', fontSize: '0.5rem', padding: '0.1rem 0.28rem', borderRadius: '0.2rem', fontWeight: 700, letterSpacing: '0.03rem', lineHeight: 1.2 }}>
                    LIVE
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
        <div style={{ marginBottom: '0.25rem' }}>
          <p style={{ padding: '0.5rem 0.75rem 0.2rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08rem', color: 'var(--sb-text-muted)', margin: 0 }}>Account</p>
          <NavLink to="/profile" className={({ isActive }) => `ent-nav-link${isActive ? ' ent-nav-active' : ''}`}>
            <Ico d={P.operator} size="0.95rem" />
            My Profile
          </NavLink>
        </div>
      </nav>

    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const operator = useAppSelector((s) => s.auth.operator);
  const initials  = (operator?.name ?? operator?.id ?? '?').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu  = () => { if (menuTimerRef.current) clearTimeout(menuTimerRef.current); setAvatarMenuOpen(true); };
  const closeMenu = () => { menuTimerRef.current = setTimeout(() => setAvatarMenuOpen(false), 150); };

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); setSearchOpen((v) => !v); setSearchQuery(''); }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openSearch = () => { setSearchOpen(true); setSearchQuery(''); };
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };

  const allNavItems = NAV_GROUPS.flatMap((g) =>
    g.items.filter((item) => {
      if (!item.resource) return true;
      if (!operator) return false;
      return hasPermission(operator.type, item.resource, 'READ');
    })
  );
  const searchResults = searchQuery.trim()
    ? allNavItems.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : allNavItems;

  return (
    <ToastProvider>
      {/*
       * Root: horizontal row — sidebar (full height) | content column
       * Desktop: sidebar always visible, no top header bar
       * Mobile: sidebar hidden, top header + slide-in drawer
       */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Desktop sidebar — full height, left column */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Mobile: overlay backdrop */}
        {mobileOpen && (
          <div
            className="lg:hidden"
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile: slide-in sidebar */}
        <div
          className="lg:hidden"
          style={{
            position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          }}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </div>

        {/* Right column: header + content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Desktop header — search bar + bell + avatar */}
          <header
            className="hidden lg:flex"
            style={{
              background: 'var(--sb-bg)',
              borderBottom: '1px solid var(--sb-border)',
              height: '3.25rem',
              flexShrink: 0,
              alignItems: 'center',
              padding: '0 1.25rem',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={openSearch}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--color-base-200)',
                border: '1px solid var(--color-base-300)',
                borderRadius: '0.4rem',
                padding: '0.3rem 0.75rem',
                fontSize: '0.8125rem',
                color: 'var(--sb-text-muted)',
                cursor: 'pointer',
                width: '280px',
                textAlign: 'left',
              }}
            >
              <Ico d={P.search} size="0.9rem" />
              <span style={{ flex: 1 }}>Search pages...</span>
              <kbd style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '0.2rem', border: '1px solid var(--color-base-300)', opacity: 0.55, fontFamily: 'inherit' }}>Ctrl /</kbd>
            </button>
            <div style={{ flex: 1 }} />
            <button className="ent-icon-btn" title="Notifications">
              <Ico d={P.bell} size="1.15rem" />
            </button>
            <button className="ent-icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
              <Ico d={dark ? P.sun : P.moon} size="1.1rem" />
            </button>
            <div style={{ position: 'relative' }} onMouseEnter={openMenu} onMouseLeave={closeMenu}>
              <button
                title={operator?.name ?? operator?.id ?? 'Profile'}
                style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  background: 'var(--ent-dark)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                {initials}
              </button>
              {avatarMenuOpen && (
                <div
                  onMouseEnter={openMenu}
                  onMouseLeave={closeMenu}
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 0.4rem)', zIndex: 100,
                    background: 'var(--color-base-100)',
                    border: '1px solid var(--color-base-300)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    minWidth: '180px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid var(--color-base-200)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0, color: 'var(--color-base-content)' }}>
                      {operator?.name ?? operator?.id}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', margin: 0, marginTop: '0.1rem' }}>
                      {operator ? (OPERATOR_TYPES[operator.type] ?? 'Operator') : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setAvatarMenuOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-base-content)', textAlign: 'left' }}
                  >
                    <Ico d={P.operator} size="0.9rem" /> My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-error)', textAlign: 'left' }}
                  >
                    <Ico d={P.logout} size="0.9rem" /> Logout
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Mobile header — hamburger + search + bell + avatar */}
          <header
            className="flex lg:hidden"
            style={{
              background: 'var(--sb-bg)',
              borderBottom: '1px solid var(--sb-border)',
              height: '3rem',
              flexShrink: 0,
              alignItems: 'center',
              padding: '0 0.75rem',
              gap: '0.5rem',
            }}
          >
            <button className="ent-icon-btn" onClick={() => setMobileOpen(true)} aria-label="Menu">
              <Ico d={P.bars} size="1.2rem" />
            </button>
            <button
              onClick={openSearch}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--color-base-200)',
                border: '1px solid var(--color-base-300)',
                borderRadius: '0.4rem',
                padding: '0.28rem 0.65rem',
                fontSize: '0.8rem',
                color: 'var(--sb-text-muted)',
                cursor: 'pointer',
                flex: 1,
                textAlign: 'left',
              }}
            >
              <Ico d={P.search} size="0.85rem" />
              <span style={{ flex: 1 }}>Search pages...</span>
            </button>
            <button className="ent-icon-btn" title="Notifications">
              <Ico d={P.bell} size="1.1rem" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              title={operator?.name ?? operator?.id ?? 'Profile'}
              style={{
                width: '1.875rem', height: '1.875rem', borderRadius: '50%',
                background: 'var(--ent-dark)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700,
                border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {initials}
            </button>
          </header>

          {/* Content area */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--ent-azure)',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
      {/* Search palette */}
      {searchOpen && (
        <div
          onClick={closeSearch}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(540px, 92vw)', background: 'var(--color-base-100)', borderRadius: '0.75rem', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid var(--color-base-300)', overflow: 'hidden' }}
          >
            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-base-200)' }}>
              <Ico d={P.search} size="1.1rem" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                placeholder="Search pages..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9375rem', color: 'var(--color-base-content)', fontFamily: 'inherit' }}
              />
              <kbd style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid var(--color-base-300)', color: 'var(--sb-text-muted)', background: 'var(--color-base-200)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Esc</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: '55vh', overflowY: 'auto', padding: '0.375rem' }}>
              {searchResults.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--sb-text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                  No pages match &ldquo;{searchQuery}&rdquo;
                </p>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => { navigate(item.to); closeSearch(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', border: 'none', background: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-base-content)', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-base-200)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: 'var(--color-base-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ico d={item.ico} size="0.875rem" />
                    </span>
                    {item.label}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.45rem 1rem', borderTop: '1px solid var(--color-base-200)', display: 'flex', gap: '1.25rem', fontSize: '0.7rem', color: 'var(--sb-text-muted)' }}>
              <span>↵ open page</span>
              <span>Esc close</span>
              <span>Ctrl+/ toggle</span>
            </div>
          </div>
        </div>
      )}
    </ToastProvider>
  );
}
