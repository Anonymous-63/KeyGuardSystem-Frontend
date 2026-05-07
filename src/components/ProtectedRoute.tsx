import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

export default function ProtectedRoute() {
  const token = useAppSelector((s) => s.auth.accessToken);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
