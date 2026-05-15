import { useEffect, type ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { fetchMe } from '@/features/auth/store/authSlice';
import { hasPermissionByClearance, operatorClearance, type ResourceType } from '@/features/auth/utils/permissions';
import ProtectedRoute from '@/app/router/ProtectedRoute';
import Layout from '@/app/layouts/Layout';
import LoginPage from '@/features/auth/pages/LoginPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import LocationsPage from '@/features/location/pages/LocationsPage';
import OperatorsPage from '@/features/operator/pages/OperatorsPage';
import CabinetsPage from '@/features/cabinet/pages/CabinetsPage';
import AssetsPage from '@/features/asset/pages/AssetsPage';
import CabinetUsersPage from '@/features/cabinetUser/pages/CabinetUsersPage';
import TransactionsPage from '@/features/transaction/pages/TransactionsPage';
import AssetGroupsPage from '@/features/assetGroup/pages/AssetGroupsPage';
import TimeConstraintsPage from '@/features/timeConstraint/pages/TimeConstraintsPage';
import ProfilePage from '@/features/auth/pages/ProfilePage';
import CabinetDetailPage from '@/features/cabinet/pages/CabinetDetailPage';
import AssetDetailPage from '@/features/asset/pages/AssetDetailPage';
import AuditLogPage from '@/features/audit/pages/AuditLogPage';
import SettingsPage from '@/features/config/pages/SettingsPage';
import PolicyManagementPage from '@/features/abac/pages/PolicyManagementPage';
import RolesPage from '@/features/roles/pages/RolesPage';

function ResourceRoute({ resource, element }: { resource: ResourceType; element: ReactElement }) {
  const operator   = useAppSelector((s) => s.auth.operator);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  if (!operator && accessToken) return null; // still loading fetchMe
  const allowed = hasPermissionByClearance(operatorClearance(operator), resource, 'READ');
  return allowed ? element : <Navigate to="/dashboard" replace />;
}

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
          <Route path="/profile"          element={<ProfilePage />} />
          <Route path="/locations"        element={<ResourceRoute resource="LOCATION"       element={<LocationsPage />} />} />
          <Route path="/operators"        element={<ResourceRoute resource="OPERATOR"        element={<OperatorsPage />} />} />
          <Route path="/cabinet-users"    element={<ResourceRoute resource="CABINET_USER"   element={<CabinetUsersPage />} />} />
          <Route path="/cabinets"         element={<ResourceRoute resource="CABINET"         element={<CabinetsPage />} />} />
          <Route path="/cabinets/:id"     element={<ResourceRoute resource="CABINET"         element={<CabinetDetailPage />} />} />
          <Route path="/assets"           element={<ResourceRoute resource="ASSET"           element={<AssetsPage />} />} />
          <Route path="/assets/:id"       element={<ResourceRoute resource="ASSET"           element={<AssetDetailPage />} />} />
          <Route path="/asset-groups"     element={<ResourceRoute resource="ASSET_GROUP"     element={<AssetGroupsPage />} />} />
          <Route path="/time-constraints" element={<ResourceRoute resource="TIME_CONSTRAINT" element={<TimeConstraintsPage />} />} />
          <Route path="/transactions"     element={<ResourceRoute resource="TRANSACTION"     element={<TransactionsPage />} />} />
          <Route path="/audit"            element={<ResourceRoute resource="AUDIT"           element={<AuditLogPage />} />} />
          <Route path="/settings"         element={<ResourceRoute resource="APP_CONFIG"      element={<SettingsPage />} />} />
          <Route path="/policies"         element={<ResourceRoute resource="ABAC_POLICY"     element={<PolicyManagementPage />} />} />
          <Route path="/roles"            element={<ResourceRoute resource="ROLE"            element={<RolesPage />} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
