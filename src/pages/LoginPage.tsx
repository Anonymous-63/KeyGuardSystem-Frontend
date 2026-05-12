import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { login } from '../features/auth/authSlice';
import { Lock, Sun, Moon } from 'lucide-react';

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
        {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
      </button>

      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body gap-0">
          {/* Brand */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-content)' }}
            >
              <Lock size={32} strokeWidth={1.5} />
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
