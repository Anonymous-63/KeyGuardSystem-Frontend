import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { logout } from '@/features/auth/store/authSlice';
import type { ResourceType } from '@/features/auth/utils/permissions';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import { ToastProvider } from '@/shared/components/ui/Toast';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, MapPin, User, Users, Monitor, KeyRound,
  Layers, Clock, ArrowLeftRight, Settings, Sun, Moon, Menu,
  LogOut, Lock, ClipboardList, Search, Bell, X, ShieldCheck, ChevronDown, UserCog,
} from 'lucide-react';
import { useGetPublicOrgQuery } from '@/features/config/api/configApi';
import { useGetMeQuery } from '@/features/operator/api/operatorApi';
import LocationSwitcher from '@/shared/components/ui/LocationSwitcher';
import { clearSelectedLocation, selectSelectedLocation, setSelectedLocation } from '@/features/location/store/locationSlice';

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

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  resource?: ResourceType;
  badge?: 'live';
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    title: 'Management',
    items: [
      { to: '/locations',     icon: MapPin,  label: 'Locations',    resource: 'LOCATION' },
      { to: '/operators',     icon: User,    label: 'Web Operators', resource: 'OPERATOR' },
      { to: '/cabinet-users', icon: Users,   label: 'Cabinet Users', resource: 'CABINET_USER' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { to: '/cabinets',     icon: Monitor,  label: 'Cabinets',     resource: 'CABINET' },
      { to: '/assets',       icon: KeyRound, label: 'Assets',       resource: 'ASSET' },
      { to: '/asset-groups', icon: Layers,   label: 'Asset Groups', resource: 'ASSET_GROUP' },
    ],
  },
  {
    title: 'Controls',
    items: [
      { to: '/time-constraints', icon: Clock,           label: 'Time Constraints', resource: 'TIME_CONSTRAINT' },
      { to: '/transactions',     icon: ArrowLeftRight,  label: 'Transactions',     resource: 'TRANSACTION', badge: 'live' },
      { to: '/audit',            icon: ClipboardList,   label: 'Audit Trail',      resource: 'AUDIT_TRAIL' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/roles',    icon: UserCog,    label: 'Roles',            resource: 'ROLE' },
      { to: '/policies', icon: ShieldCheck, label: 'Access Policies', resource: 'ABAC_POLICY' },
      { to: '/settings', icon: Settings,    label: 'Settings',        resource: 'APP_CONFIG' },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onClose, showSwitcher = true }: { onClose?: () => void; showSwitcher?: boolean }) {
  const operator = useAppSelector((s) => s.auth.operator);
  const { data: publicOrg, fulfilledTimeStamp: orgTs } = useGetPublicOrgQuery();
  const orgName = publicOrg?.orgName?.trim() ?? '';
  const hasLogo = publicOrg?.orgLogoUrl != null;
  const { canAccess, isSuperAdmin } = usePermissions();

  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (!item.resource) return true;
      return canAccess(item.resource, 'READ');
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <aside style={{ background: 'var(--sb-bg)', borderRight: '1px solid var(--sb-border)', width: '240px', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

      {/* Brand */}
      <div style={{ padding: '1rem 1.125rem', borderBottom: '1px solid var(--sb-border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Logo — org logo if set, else product icon */}
        <div style={{
          width: '2.625rem', height: '2.625rem', borderRadius: '0.5rem', flexShrink: 0,
          background: hasLogo ? 'white' : 'linear-gradient(145deg, #0f2744 0%, #1e4d8c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>
          {hasLogo
            ? <img src={`/api/v1/config/logo?v=${orgTs ?? ''}`} alt="logo"
                   style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Lock size={15} color="white" strokeWidth={2} />
          }
        </div>

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '1.0625rem', fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1.1,
            color: 'var(--color-base-content)',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          }}>
            KeyGuard
          </div>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 400, lineHeight: 1.3,
            marginTop: '0.2rem',
            color: 'var(--sb-text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {orgName || 'Key Management System'}
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sb-text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', flexShrink: 0, opacity: 0.55 }}>
            <X size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Location switcher — sidebar slot (mobile only; desktop uses header) */}
      {showSwitcher && operator && !isSuperAdmin && (operator.assignedLocations?.length ?? 0) > 0 && (
        <div style={{ padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
          <LocationSwitcher variant="sidebar" />
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.375rem 0.5rem' }}>
        {visibleGroups.map((group) => (
          <div key={group.title} style={{ marginBottom: '0.25rem' }}>
            <p style={{ padding: '0.5rem 0.75rem 0.2rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08rem', color: 'var(--sb-text-muted)', margin: 0 }}>
              {group.title}
            </p>
            {group.items.map(({ to, icon: NavIcon, label, badge }) => (
              <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `ent-nav-link${isActive ? ' ent-nav-active' : ''}`}>
                <NavIcon size={15} strokeWidth={1.5} />
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
          <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `ent-nav-link${isActive ? ' ent-nav-active' : ''}`}>
            <User size={15} strokeWidth={1.5} />
            My Profile
          </NavLink>
        </div>
      </nav>

    </aside>
  );
}

function hexRgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const ROLE_COLOR_SA   = '#ef4444';
const ROLE_COLOR_STD  = '#6366f1';

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const operator        = useAppSelector((s) => s.auth.operator);
  const selectedLocation = useAppSelector(selectSelectedLocation);
  const { isSuperAdmin, canAccess } = usePermissions();

  // Auto-select first assigned location on login if nothing persisted
  useEffect(() => {
    if (
      operator &&
      !isSuperAdmin &&
      selectedLocation === null &&
      operator.assignedLocations?.length > 0
    ) {
      const first = operator.assignedLocations[0];
      dispatch(setSelectedLocation({ id: first.id, name: first.name }));
    }
  }, [operator, isSuperAdmin, selectedLocation, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearSelectedLocation());
    navigate('/login', { replace: true });
  };

  const { data: meData } = useGetMeQuery(undefined, { skip: !operator });
  const avatarPhotoPath = meData?.photoPath ?? operator?.photoPath;
  const avatarPhotoSrc  = (avatarPhotoPath && operator?.id)
    ? `/api/v1/operators/${operator.id}/photo?v=${encodeURIComponent(avatarPhotoPath)}`
    : null;

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu  = () => { if (menuTimerRef.current) clearTimeout(menuTimerRef.current); setAvatarMenuOpen(true); };
  const closeMenu = () => { menuTimerRef.current = setTimeout(() => setAvatarMenuOpen(false), 150); };

  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);

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
      return canAccess(item.resource, 'READ');
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

        {/* Desktop sidebar — full height, left column; switcher is in header */}
        <div className="hidden lg:flex">
          <Sidebar showSwitcher={false} />
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
              <Search size={14} strokeWidth={1.5} />
              <span style={{ flex: 1 }}>Search pages...</span>
              <kbd style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '0.2rem', border: '1px solid var(--color-base-300)', opacity: 0.55, fontFamily: 'inherit' }}>Ctrl /</kbd>
            </button>
            <div style={{ flex: 1 }} />
            <LocationSwitcher />
            <button className="ent-icon-btn" title="Notifications">
              <Bell size={18} strokeWidth={1.5} />
            </button>
            <button className="ent-icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <Sun size={17} strokeWidth={1.5} /> : <Moon size={17} strokeWidth={1.5} />}
            </button>
            <div style={{ position: 'relative' }} onMouseEnter={openMenu} onMouseLeave={closeMenu}>
              {(() => {
                const roleColor = isSuperAdmin ? ROLE_COLOR_SA : ROLE_COLOR_STD;
                return (
                  <button
                    title={operator?.name ?? 'Profile'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      background: hexRgba(roleColor, 0.07),
                      border: `1px solid ${hexRgba(roleColor, 0.22)}`,
                      borderLeft: `3px solid ${roleColor}`,
                      borderRadius: '2rem',
                      padding: '0.2rem 0.5rem 0.2rem 0.28rem',
                      cursor: 'pointer', flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    }}
                  >
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: avatarPhotoSrc ? 'transparent' : roleColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {avatarPhotoSrc
                        ? <img src={avatarPhotoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <User size={14} strokeWidth={1.5} style={{ color: 'white', opacity: 0.9 }} />
                      }
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--color-base-content)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {operator?.name ?? 'Me'}
                      </span>
                      <span style={{ fontSize: '0.64rem', color: roleColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {operator ? (operator.role?.name ?? 'Operator') : ''}
                      </span>
                    </div>
                    <ChevronDown size={12} strokeWidth={2.5} style={{ color: hexRgba(roleColor, 0.6), marginLeft: '0.05rem', flexShrink: 0 }} />
                  </button>
                );
              })()}

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
                      {operator?.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', margin: 0, marginTop: '0.1rem' }}>
                      {operator ? (operator.role?.name ?? 'Operator') : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setAvatarMenuOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-base-content)', textAlign: 'left' }}
                  >
                    <User size={14} strokeWidth={1.5} /> My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-error)', textAlign: 'left' }}
                  >
                    <LogOut size={14} strokeWidth={1.5} /> Logout
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
              <Menu size={19} strokeWidth={1.5} />
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
              <Search size={14} strokeWidth={1.5} />
              <span style={{ flex: 1 }}>Search pages...</span>
            </button>
            <button className="ent-icon-btn" title="Notifications">
              <Bell size={17} strokeWidth={1.5} />
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMobileUserMenuOpen((v) => !v)}
                title={operator?.name ?? 'Profile'}
                style={{
                  width: '1.875rem', height: '1.875rem', borderRadius: '50%',
                  background: avatarPhotoSrc ? 'transparent' : 'var(--ent-dark)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  overflow: 'hidden', padding: 0,
                }}
              >
                {avatarPhotoSrc
                  ? <img src={avatarPhotoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <User size={13} strokeWidth={1.5} style={{ color: 'white', opacity: 0.85 }} />
                }
              </button>
              {mobileUserMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setMobileUserMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 0.4rem)', zIndex: 100,
                    background: 'var(--color-base-100)',
                    border: '1px solid var(--color-base-300)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    minWidth: '180px',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid var(--color-base-200)' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0, color: 'var(--color-base-content)' }}>
                        {operator?.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', margin: 0, marginTop: '0.1rem' }}>
                        {operator ? (operator.role?.name ?? 'Operator') : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => { navigate('/profile'); setMobileUserMenuOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-base-content)', textAlign: 'left' }}
                    >
                      <User size={14} strokeWidth={1.5} /> My Profile
                    </button>
                    <button
                      onClick={() => { toggle(); setMobileUserMenuOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-base-content)', textAlign: 'left' }}
                    >
                      {dark ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
                      {dark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                      onClick={() => { handleLogout(); setMobileUserMenuOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-error)', textAlign: 'left' }}
                    >
                      <LogOut size={14} strokeWidth={1.5} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
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
              <Search size={17} strokeWidth={1.5} />
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
                      <item.icon size={14} strokeWidth={1.5} />
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
