import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { fetchMe } from './features/auth/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LocationsPage from './pages/LocationsPage';
import OperatorsPage from './pages/OperatorsPage';
import CabinetsPage from './pages/CabinetsPage';
import AssetsPage from './pages/AssetsPage';
import CabinetUsersPage from './pages/CabinetUsersPage';
import TransactionsPage from './pages/TransactionsPage';
import AssetGroupsPage from './pages/AssetGroupsPage';
import TimeConstraintsPage from './pages/TimeConstraintsPage';
import ProfilePage from './pages/ProfilePage';
import CabinetDetailPage from './pages/CabinetDetailPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import PolicyManagementPage from './pages/PolicyManagementPage';

export default function App() {
  const dispatch = useAppDispatch();
  const { accessToken, operator } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (accessToken && !operator) {
      dispatch(fetchMe());
    }
  }, [accessToken, operator, dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard"        element={<DashboardPage />} />
          <Route path="/locations"        element={<LocationsPage />} />
          <Route path="/operators"        element={<OperatorsPage />} />
          <Route path="/cabinets"         element={<CabinetsPage />} />
          <Route path="/cabinets/:id"     element={<CabinetDetailPage />} />
          <Route path="/assets"           element={<AssetsPage />} />
          <Route path="/assets/:id"       element={<AssetDetailPage />} />
          <Route path="/cabinet-users"    element={<CabinetUsersPage />} />
          <Route path="/transactions"     element={<TransactionsPage />} />
          <Route path="/asset-groups"     element={<AssetGroupsPage />} />
          <Route path="/time-constraints" element={<TimeConstraintsPage />} />
          <Route path="/profile"          element={<ProfilePage />} />
          <Route path="/audit"            element={<AuditLogPage />} />
          <Route path="/settings"         element={<SettingsPage />} />
          <Route path="/policies"         element={<PolicyManagementPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
