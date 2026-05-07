import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';

const NAV = [
  { to: '/dashboard',  icon: '🏠', label: 'Dashboard' },
  { to: '/locations',  icon: '📍', label: 'Locations' },
  { to: '/operators',  icon: '👤', label: 'Operators' },
  { to: '/cabinets',   icon: '🗄️',  label: 'Cabinets' },
  { to: '/assets',     icon: '🔑', label: 'Assets' },
];

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const operator = useAppSelector((s) => s.auth.operator);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="drawer lg:drawer-open h-screen">
      <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />

      {/* Page content */}
      <div className="drawer-content flex flex-col">
        {/* Top navbar (mobile) */}
        <div className="navbar bg-base-100 border-b border-base-200 lg:hidden">
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

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6 bg-base-200">
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
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map(({ to, icon, label }) => (
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
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          <div className="p-3 border-t border-base-200">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">{operator?.name?.charAt(0) ?? '?'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{operator?.name ?? operator?.id ?? 'User'}</p>
                <p className="text-xs text-base-content/50 truncate">{operator?.id}</p>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={handleLogout}
                title="Logout"
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
