import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { login } from '../features/auth/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, accessToken } = useAppSelector((s) => s.auth);

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
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-2">
            <span className="text-4xl">🔐</span>
            <h1 className="text-2xl font-bold mt-2">KeyGuard</h1>
            <p className="text-base-content/50 text-sm">Management Console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Operator ID</span>
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
              <label className="label">
                <span className="label-text">Password</span>
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
              <div className="alert alert-error text-sm py-2">
                <span>⚠ {error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
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
