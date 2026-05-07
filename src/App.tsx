import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LocationsPage from './pages/LocationsPage';
import OperatorsPage from './pages/OperatorsPage';
import CabinetsPage from './pages/CabinetsPage';
import AssetsPage from './pages/AssetsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/operators" element={<OperatorsPage />} />
          <Route path="/cabinets" element={<CabinetsPage />} />
          <Route path="/assets" element={<AssetsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
