import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/store/hooks';

export default function ProtectedRoute() {
  const { accessToken, validating } = useAppSelector((s) => s.auth);

  if (validating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
