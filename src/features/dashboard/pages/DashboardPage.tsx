import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  MapPin, Users, User, HardDrive, Key, Package,
  AlertTriangle, Clock, Activity, Shield, TrendingUp,
  FileText, ShieldCheck, Lock, ScrollText,
} from 'lucide-react';
import { useGetDashboardQuery, useListAuditTrailQuery } from '@/features/dashboard/api/dashboardApi';
import { useListAssetsOutQuery, useListOverdueAssetsQuery } from '@/features/transaction/api/transactionApi';
import { useListRolesQuery } from '@/features/roles/api/rolesApi';
import { useListPoliciesQuery } from '@/features/abac/api/abacApi';
import { useAppSelector } from '@/app/store/hooks';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import type { RecentActivityItem } from '@/shared/types/api';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  primary:   '#6366f1',
  secondary: '#a855f7',
  success:   '#22c55e',
  warning:   '#f59e0b',
  error:     '#ef4444',
  neutral:   '#64748b',
  accent:    '#06b6d4',
  info:      '#3b82f6',
};

function utilizationColor(pct: number) {
  if (pct >= 80) return C.error;
  if (pct >= 50) return C.warning;
  return C.success;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function fmtAuditAction(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, Icon, iconColor, borderColor, to,
}: {
  label: string;
  value?: number;
  Icon: React.ComponentType<{ size?: number }>;
  iconColor: string;
  borderColor: string;
  to?: string;
}) {
  const inner = (
    <div className={`card bg-base-100 shadow-sm border-l-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${borderColor}`}>
      <div className="card-body py-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base-content/50 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">
              {value === undefined
                ? <span className="loading loading-dots loading-sm" />
                : value.toLocaleString()}
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: iconColor + '22' }}
          >
            <Icon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RecentActivityItem['status'] }) {
  if (status === 'RETURNED') return <span className="badge badge-success badge-xs">Returned</span>;
  if (status === 'OVERDUE')  return <span className="badge badge-error badge-xs">Overdue</span>;
  return <span className="badge badge-warning badge-xs">Out</span>;
}

// ─── Pie Tooltip ─────────────────────────────────────────────────────────────
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-base-content/60">{payload[0].value.toLocaleString()} assets</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const operator = useAppSelector((s) => s.auth.operator);
  const { canAccess } = usePermissions();
  const canRead = (r: string) => canAccess(r, 'READ');

  const { data: dash, isLoading } = useGetDashboardQuery();
  const { data: assetsOut }       = useListAssetsOutQuery();
  const { data: overdueAssets }   = useListOverdueAssetsQuery();

  const canReadRoles   = canRead('ROLE');
  const canReadPolicies = canRead('ABAC_POLICY');
  const canReadAudit   = canRead('AUDIT_TRAIL');
  const hasTransPerm   = canRead('TRANSACTION');
  const hasAssetPerm   = canRead('ASSET');

  const { data: roles }    = useListRolesQuery(undefined, { skip: !canReadRoles });
  const { data: policies } = useListPoliciesQuery({ page: 0, size: 1 }, { skip: !canReadPolicies });
  const { data: auditPage } = useListAuditTrailQuery({ page: 0, size: 6 }, { skip: !canReadAudit });

  // ── Chart data ───────────────────────────────────────────────────────────
  const available      = dash ? Math.max(0, dash.totalAssets - dash.assetsOut) : 0;
  const outOnTime      = dash ? Math.max(0, dash.assetsOut - dash.overdueCount) : 0;
  const utilizationPct = dash && dash.totalAssets > 0
    ? Math.round((dash.assetsOut / dash.totalAssets) * 100) : 0;

  const assetStatusData = [
    { name: 'Available', value: available },
    { name: 'Out',       value: outOnTime },
    { name: 'Overdue',   value: dash?.overdueCount ?? 0 },
  ].filter((d) => d.value > 0);

  const activityCounts = (dash?.recentActivity ?? []).reduce<Record<string, number>>(
    (acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; },
    {},
  );
  const activityBarData = [
    { name: 'Out',      value: activityCounts['OUT']      ?? 0, fill: C.warning },
    { name: 'Returned', value: activityCounts['RETURNED'] ?? 0, fill: C.success },
    { name: 'Overdue',  value: activityCounts['OVERDUE']  ?? 0, fill: C.error },
  ];

  const radialData = [{ name: 'Utilization', value: utilizationPct, fill: utilizationColor(utilizationPct) }];
  const showCharts = !isLoading && dash && hasTransPerm && hasAssetPerm && dash.totalAssets > 0;

  return (
    <div className="space-y-6 pb-6">

      {/* ── Welcome Header ────────────────────────────────────────────────────── */}
      {(() => {
        const initials = operator?.name
          ? operator.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
          : '?';
        const photoSrc = (operator?.photoPath && operator?.id)
          ? `/api/v1/operators/${operator.id}/photo?v=${encodeURIComponent(operator.photoPath)}`
          : null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Avatar — photo if available, initials otherwise */}
              <div
                className="w-16 h-16 rounded-2xl flex-shrink-0 shadow-sm overflow-hidden"
                style={photoSrc ? undefined : { background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}
              >
                {photoSrc ? (
                  <img src={photoSrc} alt={operator?.name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xl text-white select-none">
                    {initials}
                  </div>
                )}
              </div>

              {/* Text block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield size={12} className="text-primary flex-shrink-0" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest truncate">
                    KeyGuard Management Console
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                  {greeting()}, {operator?.name?.split(' ')[0] ?? 'there'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="badge badge-primary badge-sm font-medium">
                    {operator?.role?.name ?? 'Operator'}
                  </span>
                  <span className="text-base-content/40 text-xs hidden sm:inline">{fmtDate()}</span>
                </div>
              </div>

              {/* Mini stats */}
              {dash && hasTransPerm && (
                <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-warning/15 border border-warning/25 rounded-xl px-3 py-2.5 min-w-[80px]">
                    <Clock size={14} className="text-warning flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-base-content/50 leading-none font-medium uppercase tracking-wide">Out</p>
                      <p className="font-bold text-base tabular-nums leading-snug">{dash.assetsOut}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 min-w-[80px] border ${
                    dash.overdueCount > 0
                      ? 'bg-error/15 border-error/25'
                      : 'bg-success/10 border-success/20'
                  }`}>
                    <AlertTriangle size={14} className={dash.overdueCount > 0 ? 'text-error flex-shrink-0' : 'text-success flex-shrink-0'} />
                    <div>
                      <p className="text-[10px] text-base-content/50 leading-none font-medium uppercase tracking-wide">Overdue</p>
                      <p className={`font-bold text-base tabular-nums leading-snug ${dash.overdueCount > 0 ? 'text-error' : ''}`}>
                        {dash.overdueCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Stat Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {canRead('LOCATION') && (
          <StatCard label="Locations"      value={isLoading ? undefined : dash?.totalLocations}    Icon={MapPin}      iconColor={C.primary}   borderColor="border-primary"   to="/locations" />
        )}
        {canRead('OPERATOR') && (
          <StatCard label="Web Operators"  value={isLoading ? undefined : dash?.totalOperators}    Icon={Users}       iconColor={C.secondary} borderColor="border-secondary" to="/operators" />
        )}
        {canRead('CABINET_USER') && (
          <StatCard label="Cabinet Users"  value={isLoading ? undefined : dash?.totalCabinetUsers} Icon={User}        iconColor={C.accent}    borderColor="border-accent"    to="/cabinet-users" />
        )}
        {canRead('CABINET') && (
          <StatCard label="Cabinets"       value={isLoading ? undefined : dash?.totalCabinets}     Icon={HardDrive}   iconColor={C.neutral}   borderColor="border-neutral"   to="/cabinets" />
        )}
        {hasAssetPerm && (
          <StatCard label="Total Assets"   value={isLoading ? undefined : dash?.totalAssets}       Icon={Key}         iconColor={C.success}   borderColor="border-success"   to="/assets" />
        )}
        {canRead('ASSET_GROUP') && (
          <StatCard label="Asset Groups"   value={isLoading ? undefined : dash?.totalAssetGroups}  Icon={Package}     iconColor={C.warning}   borderColor="border-warning"   to="/asset-groups" />
        )}
        {canReadRoles && (
          <StatCard label="Roles"          value={roles?.filter(r => r.permissionLevel > (operator?.role?.permissionLevel ?? 0)).length} Icon={ShieldCheck} iconColor={C.info}      borderColor="border-info"      to="/roles" />
        )}
        {canReadPolicies && (
          <StatCard label="Access Policies" value={policies?.totalElements}                        Icon={Lock}        iconColor={C.error}     borderColor="border-error"     to="/policies" />
        )}
      </div>

      {/* ── Key Status Row ────────────────────────────────────────────────────── */}
      {hasTransPerm && dash && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-warning/10 border border-warning/30 shadow-sm hover:shadow-md transition-all">
            <div className="card-body py-4 px-5 flex-row items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">Assets Out</p>
                <p className="text-2xl font-bold tabular-nums">{dash.assetsOut.toLocaleString()}</p>
              </div>
              <Link to="/transactions" className="btn btn-ghost btn-xs ml-auto text-primary shrink-0">View →</Link>
            </div>
          </div>
          <div className="card bg-error/10 border border-error/30 shadow-sm hover:shadow-md transition-all">
            <div className="card-body py-4 px-5 flex-row items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-error/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-error" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-base-content/50 font-medium uppercase tracking-wide">Overdue</p>
                <p className="text-2xl font-bold text-error tabular-nums">{dash.overdueCount.toLocaleString()}</p>
              </div>
              <Link to="/transactions" className="btn btn-ghost btn-xs ml-auto text-primary shrink-0">View →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts Row ────────────────────────────────────────────────────────── */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Asset Status Donut */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-4 px-5">
              <div className="flex items-center gap-2 mb-1">
                <Key size={14} className="text-primary" />
                <h2 className="font-semibold text-sm">Asset Status</h2>
              </div>
              <p className="text-xs text-base-content/40 mb-2">Breakdown of {dash!.totalAssets} assets</p>
              {assetStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={assetStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {assetStatusData.map((_, i) => (
                        <Cell key={i} fill={[C.success, C.warning, C.error][i]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-base-content/70">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-base-content/30 text-sm">No asset data</div>
              )}
            </div>
          </div>

          {/* Activity Status Bar */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-4 px-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-primary" />
                <h2 className="font-semibold text-sm">Recent Activity</h2>
              </div>
              <p className="text-xs text-base-content/40 mb-2">Status of last 10 transactions</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityBarData} barSize={36} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(100,116,139,0.08)' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {activityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Utilization Gauge */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-4 px-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-primary" />
                <h2 className="font-semibold text-sm">Asset Utilization</h2>
              </div>
              <p className="text-xs text-base-content/40 mb-2">{dash!.assetsOut} of {dash!.totalAssets} assets out</p>
              <div className="relative" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="58%" innerRadius="65%" outerRadius="90%" startAngle={180} endAngle={0} data={radialData} barSize={14}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(100,116,139,0.1)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 16 }}>
                  <span className="text-3xl font-bold tabular-nums" style={{ color: utilizationColor(utilizationPct) }}>
                    {utilizationPct}%
                  </span>
                  <span className="text-xs text-base-content/50 mt-0.5">utilized</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Trail ───────────────────────────────────────────────────────── */}
      {canReadAudit && auditPage && auditPage.content.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ScrollText size={14} className="text-primary" />
                <h2 className="font-semibold text-sm">Recent Audit Activity</h2>
              </div>
              <Link to="/audit" className="btn btn-ghost btn-xs text-primary">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>IP Address</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPage.content.map((entry) => (
                    <tr key={entry.id} className="hover:bg-base-200/50 transition-colors">
                      <td className="text-xs font-medium">{entry.operatorId}</td>
                      <td className="text-xs">
                        <span className="badge badge-ghost badge-xs">{fmtAuditAction(entry.action)}</span>
                      </td>
                      <td className="text-xs text-base-content/60">
                        {entry.resourceType ? `${entry.resourceType}${entry.resourceId ? ` #${entry.resourceId}` : ''}` : '—'}
                      </td>
                      <td className="text-xs text-base-content/50">{entry.ipAddress ?? '—'}</td>
                      <td className="text-xs text-base-content/50">{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Overdue Alert ─────────────────────────────────────────────────────── */}
      {hasTransPerm && overdueAssets && overdueAssets.length > 0 && (
        <div className="card bg-base-100 shadow-sm border-l-4 border-error">
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-error flex items-center gap-2">
                <AlertTriangle size={14} />
                {overdueAssets.length} Overdue {overdueAssets.length === 1 ? 'Asset' : 'Assets'} — Action Required
              </h2>
              <Link to="/transactions" className="btn btn-ghost btn-xs text-primary">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead><tr><th>Asset</th><th>Issued To</th><th>Expected Return</th><th>Overdue By</th></tr></thead>
                <tbody>
                  {overdueAssets.slice(0, 5).map((tx) => (
                    <tr key={tx.autoNo} className="bg-error/5">
                      <td className="font-medium text-xs">{tx.assetName ?? `Asset #${tx.assetId}`}</td>
                      <td className="text-xs">{tx.issuedToName ?? tx.issuedTo}</td>
                      <td className="text-xs text-error">{tx.expectedBefore ? new Date(tx.expectedBefore).toLocaleString() : '—'}</td>
                      <td className="text-xs text-error font-medium">
                        {tx.overdueMinutes ? `${Math.floor(tx.overdueMinutes / 60)}h ${tx.overdueMinutes % 60}m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overdueAssets.length > 5 && <p className="text-xs text-base-content/50 mt-1 px-1">+{overdueAssets.length - 5} more…</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Assets Out ────────────────────────────────────────────────────────── */}
      {hasTransPerm && assetsOut && assetsOut.length > 0 && (
        <div className="card bg-base-100 shadow-sm border-l-4 border-warning">
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Clock size={14} className="text-warning" />
                {assetsOut.length} {assetsOut.length === 1 ? 'Asset' : 'Assets'} Currently Out
              </h2>
              <Link to="/transactions" className="btn btn-ghost btn-xs text-primary">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead><tr><th>Asset</th><th>Issued To</th><th>Cabinet</th><th>Issued At</th></tr></thead>
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
              {assetsOut.length > 5 && <p className="text-xs text-base-content/50 mt-1 px-1">+{assetsOut.length - 5} more…</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Transactions ───────────────────────────────────────────────── */}
      {hasTransPerm && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                <h2 className="font-semibold text-sm">Recent Transactions</h2>
              </div>
              <Link to="/transactions" className="btn btn-ghost btn-xs text-primary">View all →</Link>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-6"><span className="loading loading-spinner loading-sm text-primary" /></div>
            ) : !dash?.recentActivity.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-base-content/30">
                <FileText size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Asset</th><th>User</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>
                    {dash.recentActivity.map((item) => (
                      <tr key={item.autoNo} className="hover:bg-base-200/50 transition-colors">
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



    </div>
  );
}
