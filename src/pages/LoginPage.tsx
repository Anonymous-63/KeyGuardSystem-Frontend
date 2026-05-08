import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { login } from '../features/auth/authSlice';

const IcoLock = () => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '2rem', height: '2rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const IcoSun = () => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const IcoMoon = () => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('kgs-theme') === 'dark');
  useEffect(() => {
    const t = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('kgs-theme', t);
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, accessToken } = useAppSelector((s) => s.auth);
  const { dark, toggle } = useTheme();

  const [operatorId, setOperatorId] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (accessToken) navigate('/dashboard', { replace: true });
  }, [accessToken, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ operatorId, password }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      {/* Theme toggle (top-right) */}
      <button
        className="btn btn-ghost btn-sm btn-square fixed top-4 right-4"
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        {dark ? <IcoSun /> : <IcoMoon />}
      </button>

      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body gap-0">
          {/* Brand */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-content)' }}
            >
              <IcoLock />
            </div>
            <h1 className="text-2xl font-bold text-base-content">KeyGuard</h1>
            <p className="text-sm text-base-content/50 mt-1">Management Console</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Operator ID</span>
              </label>
              <input
                className="input input-bordered w-full"
                placeholder="superadmin"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error text-sm py-2 px-3">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading && <span className="loading loading-spinner loading-sm" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
