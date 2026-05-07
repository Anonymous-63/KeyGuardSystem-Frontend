import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard"        element={<DashboardPage />} />
          <Route path="/locations"        element={<LocationsPage />} />
          <Route path="/operators"        element={<OperatorsPage />} />
          <Route path="/cabinets"         element={<CabinetsPage />} />
          <Route path="/assets"           element={<AssetsPage />} />
          <Route path="/cabinet-users"    element={<CabinetUsersPage />} />
          <Route path="/transactions"     element={<TransactionsPage />} />
          <Route path="/asset-groups"     element={<AssetGroupsPage />} />
          <Route path="/time-constraints" element={<TimeConstraintsPage />} />
          <Route path="/profile"          element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
