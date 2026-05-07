import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { hasPermission, type ResourceType } from '../features/auth/permissions';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  resource?: ResourceType;
}

const ALL_NAV: NavItem[] = [
  { to: '/dashboard',          icon: '🏠', label: 'Dashboard' },
  { to: '/locations',          icon: '📍', label: 'Locations',        resource: 'LOCATION' },
  { to: '/operators',          icon: '👤', label: 'Web Operators',     resource: 'OPERATOR' },
  { to: '/cabinet-users',      icon: '🧑', label: 'Cabinet Users',     resource: 'CABINET_USER' },
  { to: '/cabinets',           icon: '🗄️',  label: 'Cabinets',         resource: 'CABINET' },
  { to: '/assets',             icon: '🔑', label: 'Assets',            resource: 'ASSET' },
  { to: '/asset-groups',       icon: '📦', label: 'Asset Groups',      resource: 'ASSET_GROUP' },
  { to: '/time-constraints',   icon: '⏰', label: 'Time Constraints',  resource: 'TIME_CONSTRAINT' },
  { to: '/transactions',       icon: '📋', label: 'Transactions',      resource: 'TRANSACTION' },
];

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const operator = useAppSelector((s) => s.auth.operator);

  const visibleNav = ALL_NAV.filter((item) => {
    if (!item.resource) return true;
    if (!operator) return false;
    return hasPermission(operator.type, item.resource, 'READ');
  });

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="drawer lg:drawer-open h-screen">
      <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        {/* Mobile top navbar */}
        <div className="navbar bg-base-100 border-b border-base-200 lg:hidden sticky top-0 z-10">
          <div className="flex-none">
            <label htmlFor="drawer-toggle" className="btn btn-ghost btn-square">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                className="inline-block h-5 w-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
          <div className="flex-1 px-2 font-bold text-primary">KeyGuard</div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-base-200">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-20">
        <label htmlFor="drawer-toggle" className="drawer-overlay" />
        <aside className="w-64 min-h-full bg-base-100 border-r border-base-200 flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-base-200">
            <span className="text-xl font-bold text-primary">🔐 KeyGuard</span>
            <p className="text-xs text-base-content/50 mt-0.5">Management Console</p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {visibleNav.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-content'
                      : 'hover:bg-base-200 text-base-content'
                  }`
                }
              >
                <span className="text-base leading-none">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Divider */}
          <div className="px-4 py-2 border-t border-base-200">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-200 text-base-content'
                }`
              }
            >
              <span>⚙️</span>
              <span>My Profile</span>
            </NavLink>
          </div>

          {/* User footer */}
          <div className="p-3 border-t border-base-200">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-8">
                  <span className="text-xs font-bold">{operator?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{operator?.name ?? operator?.id ?? 'User'}</p>
                <p className="text-xs text-base-content/50 truncate">{operator?.id}</p>
              </div>
              <button
                className="btn btn-ghost btn-xs tooltip tooltip-left"
                data-tip="Logout"
                onClick={handleLogout}
              >
                ↩
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
