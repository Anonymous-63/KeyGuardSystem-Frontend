import { Link } from 'react-router-dom';
import { useGetDashboardQuery } from '@/features/dashboard/api/dashboardApi';
import { useListAssetsOutQuery, useListOverdueAssetsQuery } from '@/features/transaction/api/transactionApi';
import { useAppSelector } from '@/app/store/hooks';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import type { RecentActivityItem } from '@/shared/types/api';

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
              {value === undefined
                ? <span className="loading loading-dots loading-sm" />
                : value.toLocaleString()}
            </p>
          </div>
          <span className="text-3xl opacity-50">{icon}</span>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function StatusBadge({ status }: { status: RecentActivityItem['status'] }) {
  if (status === 'RETURNED') return <span className="badge badge-success badge-xs">Returned</span>;
  if (status === 'OVERDUE')  return <span className="badge badge-error badge-xs">Overdue</span>;
  return <span className="badge badge-warning badge-xs">Out</span>;
}

export default function DashboardPage() {
  const operator = useAppSelector((s) => s.auth.operator);
  const { data: dash, isLoading } = useGetDashboardQuery();
  const { data: assetsOut } = useListAssetsOutQuery();
  const { data: overdueAssets } = useListOverdueAssetsQuery();

  const { canAccess } = usePermissions();
  const canRead = (resource: string) => canAccess(resource, 'READ');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {operator?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-base-content/50 text-sm mt-0.5">
          {operator?.role?.name ?? 'Operator'} · KeyGuard Management Console
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {canRead('LOCATION') && (
          <StatCard label="Locations"     value={isLoading ? undefined : dash?.totalLocations}    icon="📍" color="border-primary"   to="/locations" />
        )}
        {canRead('OPERATOR') && (
          <StatCard label="Web Operators" value={isLoading ? undefined : dash?.totalOperators}    icon="👤" color="border-secondary" to="/operators" />
        )}
        {canRead('CABINET_USER') && (
          <StatCard label="Cabinet Users" value={isLoading ? undefined : dash?.totalCabinetUsers} icon="🧑" color="border-accent"    to="/cabinet-users" />
        )}
        {canRead('CABINET') && (
          <StatCard label="Cabinets"      value={isLoading ? undefined : dash?.totalCabinets}     icon="🗄️" color="border-neutral"   to="/cabinets" />
        )}
        {canRead('ASSET') && (
          <StatCard label="Assets"        value={isLoading ? undefined : dash?.totalAssets}       icon="🔑" color="border-success"   to="/assets" />
        )}
      </div>

      {/* Key stats row */}
      {canRead('TRANSACTION') && dash && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-warning/10 border border-warning/30 shadow-sm">
            <div className="card-body py-3 px-5 flex-row items-center gap-3">
              <span className="text-2xl">🔓</span>
              <div>
                <p className="text-xs text-base-content/50">Assets Currently Out</p>
                <p className="text-2xl font-bold">{dash.assetsOut.toLocaleString()}</p>
              </div>
              <Link to="/transactions" className="btn btn-ghost btn-xs ml-auto text-primary">View →</Link>
            </div>
          </div>
          <div className="card bg-error/10 border border-error/30 shadow-sm">
            <div className="card-body py-3 px-5 flex-row items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-xs text-base-content/50">Overdue</p>
                <p className="text-2xl font-bold text-error">{dash.overdueCount.toLocaleString()}</p>
              </div>
              <Link to="/transactions" className="btn btn-ghost btn-xs ml-auto text-primary">View →</Link>
            </div>
          </div>
        </div>
      )}

      {/* Overdue detail */}
      {canRead('TRANSACTION') && overdueAssets && overdueAssets.length > 0 && (
        <div className="card bg-base-100 shadow border-l-4 border-error">
          <div className="card-body py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-error flex items-center gap-2">
                ⚠️ {overdueAssets.length} Overdue {overdueAssets.length === 1 ? 'Asset' : 'Assets'} — Action Required
              </h2>
              <Link to="/transactions" className="btn btn-ghost btn-xs text-primary">View all →</Link>
            </div>
            <div className="overflow-x-auto mt-2">
              <table className="table table-xs">
                <thead>
                  <tr><th>Asset</th><th>Issued To</th><th>Expected Return</th><th>Overdue By</th></tr>
                </thead>
                <tbody>
                  {overdueAssets.slice(0, 5).map((tx) => (
                    <tr key={tx.autoNo} className="bg-error/5">
                      <td className="font-medium text-xs">{tx.assetName ?? `Asset #${tx.assetId}`}</td>
                      <td className="text-xs">{tx.issuedToName ?? tx.issuedTo}</td>
                      <td className="text-xs text-error">
                        {tx.expectedBefore ? new Date(tx.expectedBefore).toLocaleString() : '—'}
                      </td>
                      <td className="text-xs text-error font-medium">
                        {tx.overdueMinutes
                          ? `${Math.floor(tx.overdueMinutes / 60)}h ${tx.overdueMinutes % 60}m`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overdueAssets.length > 5 && (
                <p className="text-xs text-base-content/50 mt-1 px-1">+{overdueAssets.length - 5} more…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assets out detail */}
      {canRead('TRANSACTION') && assetsOut && assetsOut.length > 0 && (
        <div className="card bg-base-100 shadow border-l-4 border-warning">
          <div className="card-body py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                🔓 {assetsOut.length} {assetsOut.length === 1 ? 'Asset' : 'Assets'} Currently Out
              </h2>
              <Link to="/transactions" className="btn btn-ghost btn-xs text-primary">View all →</Link>
            </div>
            <div className="overflow-x-auto mt-2">
              <table className="table table-xs">
                <thead>
                  <tr><th>Asset</th><th>Issued To</th><th>Cabinet</th><th>Issued At</th></tr>
                </thead>
                <tbody>
                  {assetsOut.slice(0, 5).map((tx) => (
                    <tr key={tx.autoNo}>
                      <td className="font-medium text-xs">{tx.assetName ?? `Asset #${tx.assetId}`}</td>
                      <td className="text-xs">{tx.issuedToName ?? tx.issuedTo}</td>
                      <td className="text-xs text-base-content/60">{tx.issuedFromName ?? `Cabinet #${tx.issuedFrom}`}</td>
                      <td className="text-xs">{new Date(tx.issuedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assetsOut.length > 5 && (
                <p className="text-xs text-base-content/50 mt-1 px-1">+{assetsOut.length - 5} more…</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity — from dashboard endpoint */}
        {canRead('TRANSACTION') && (
          <div className="card bg-base-100 shadow lg:col-span-2">
            <div className="card-body py-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="card-title text-base">Recent Activity</h2>
                <Link to="/transactions" className="btn btn-ghost btn-xs text-primary">View all →</Link>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-sm text-primary" />
                </div>
              ) : !dash?.recentActivity.length ? (
                <p className="text-sm text-base-content/40 py-4">No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr><th>Asset</th><th>User</th><th>Time</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {dash.recentActivity.map((item) => (
                        <tr key={item.autoNo}>
                          <td className="text-sm font-medium">{item.assetName ?? `#${item.autoNo}`}</td>
                          <td className="text-sm text-base-content/70">{item.issuedToName ?? '—'}</td>
                          <td className="text-xs text-base-content/50">{new Date(item.issuedAt).toLocaleString()}</td>
                          <td><StatusBadge status={item.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="card bg-base-100 shadow">
          <div className="card-body py-4">
            <h2 className="card-title text-base">Quick Actions</h2>
            <div className="flex flex-col gap-2 mt-1">
              {canRead('TRANSACTION') && (
                <Link to="/transactions" className="btn btn-outline btn-sm justify-start gap-2">📋 View Transactions</Link>
              )}
              {canRead('CABINET_USER') && (
                <Link to="/cabinet-users" className="btn btn-outline btn-sm justify-start gap-2">🧑 Manage Users</Link>
              )}
              {canRead('ASSET') && (
                <Link to="/assets" className="btn btn-outline btn-sm justify-start gap-2">🔑 View Assets</Link>
              )}
              {canRead('CABINET') && (
                <Link to="/cabinets" className="btn btn-outline btn-sm justify-start gap-2">🗄️ Cabinets</Link>
              )}
              {canRead('ASSET_GROUP') && (
                <Link to="/asset-groups" className="btn btn-outline btn-sm justify-start gap-2">📦 Asset Groups</Link>
              )}
              {canRead('TIME_CONSTRAINT') && (
                <Link to="/time-constraints" className="btn btn-outline btn-sm justify-start gap-2">⏰ Time Constraints</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
