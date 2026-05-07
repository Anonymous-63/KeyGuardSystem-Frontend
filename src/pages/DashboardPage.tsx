import { Link } from 'react-router-dom';
import { useListLocationsQuery } from '../features/location/locationApi';
import { useListOperatorsQuery } from '../features/operator/operatorApi';
import { useListCabinetsQuery } from '../features/cabinet/cabinetApi';
import { useListAssetsQuery } from '../features/asset/assetApi';
import { useListCabinetUsersQuery } from '../features/cabinetUser/cabinetUserApi';
import { useListAssetsOutQuery, useListOverdueAssetsQuery } from '../features/transaction/transactionApi';
import { useAppSelector } from '../app/hooks';
import { hasPermission } from '../features/auth/permissions';
import { OPERATOR_TYPES } from '../types/api';

function StatCard({ label, value, icon, color, to }: {
  label: string; value?: number; icon: string; color: string; to?: string;
}) {
  const inner = (
    <div className={`card bg-base-100 shadow border-l-4 ${color} hover:shadow-md transition-shadow`}>
      <div className="card-body py-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base-content/50 text-sm">{label}</p>
            <p className="text-3xl font-bold mt-1">
              {value === undefined ? <span className="loading loading-dots loading-sm" /> : value.toLocaleString()}
            </p>
          </div>
          <span className="text-3xl opacity-50">{icon}</span>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function AlertCard({ title, count, icon, color, to }: {
  title: string; count?: number; icon: string; color: string; to: string;
}) {
  if (!count) return null;
  return (
    <Link to={to} className={`alert ${color} shadow flex items-center gap-3 py-3`}>
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-semibold text-sm">{count} {title}</p>
        <p className="text-xs opacity-70">Click to view →</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const operator = useAppSelector((s) => s.auth.operator);
  const { data: locations } = useListLocationsQuery({});
  const { data: operators } = useListOperatorsQuery({});
  const { data: cabinets } = useListCabinetsQuery({});
  const { data: assets } = useListAssetsQuery({});
  const { data: cabinetUsers } = useListCabinetUsersQuery({});
  const { data: assetsOut } = useListAssetsOutQuery();
  const { data: overdueAssets } = useListOverdueAssetsQuery();

  const canRead = (resource: Parameters<typeof hasPermission>[1]) =>
    operator ? hasPermission(operator.type, resource, 'READ') : false;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">{greeting()}, {operator?.name?.split(' ')[0] ?? 'there'}</h1>
        <p className="text-base-content/50 text-sm mt-0.5">
          {OPERATOR_TYPES[operator?.type ?? 5]} · KeyGuard Management Console
        </p>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <AlertCard
          title="assets currently out"
          count={assetsOut?.length}
          icon="🔓"
          color="alert-warning"
          to="/transactions"
        />
        <AlertCard
          title="overdue assets — action required"
          count={overdueAssets?.length}
          icon="⚠️"
          color="alert-error"
          to="/transactions"
        />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {canRead('LOCATION') && (
          <StatCard label="Locations"      value={locations?.totalElements}    icon="📍" color="border-primary"   to="/locations" />
        )}
        {canRead('OPERATOR') && (
          <StatCard label="Web Operators"  value={operators?.totalElements}    icon="👤" color="border-secondary" to="/operators" />
        )}
        {canRead('CABINET_USER') && (
          <StatCard label="Cabinet Users"  value={cabinetUsers?.totalElements} icon="🧑" color="border-accent"    to="/cabinet-users" />
        )}
        {canRead('CABINET') && (
          <StatCard label="Cabinets"       value={cabinets?.totalElements}     icon="🗄️" color="border-neutral"   to="/cabinets" />
        )}
        {canRead('ASSET') && (
          <StatCard label="Assets"         value={assets?.totalElements}       icon="🔑" color="border-success"   to="/assets" />
        )}
      </div>

      {/* Quick navigation */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-base">Quick Actions</h2>
          <div className="flex flex-wrap gap-2 mt-1">
            {canRead('TRANSACTION') && (
              <Link to="/transactions" className="btn btn-outline btn-sm gap-1">📋 View Transactions</Link>
            )}
            {canRead('CABINET_USER') && (
              <Link to="/cabinet-users" className="btn btn-outline btn-sm gap-1">🧑 Manage Users</Link>
            )}
            {canRead('ASSET_GROUP') && (
              <Link to="/asset-groups" className="btn btn-outline btn-sm gap-1">📦 Asset Groups</Link>
            )}
            {canRead('TIME_CONSTRAINT') && (
              <Link to="/time-constraints" className="btn btn-outline btn-sm gap-1">⏰ Time Constraints</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
