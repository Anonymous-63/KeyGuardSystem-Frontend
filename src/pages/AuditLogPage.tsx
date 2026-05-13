import { useMemo, useState } from 'react';
import { useListActivityQuery, useListAccessQuery, useGetStatsQuery } from '../features/audit/auditApi';
import type { AuditActivityRecord, AccessAuditRecord, AuditActivityParams, AccessAuditParams } from '../types/api';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';
import { useAppSelector } from '../app/hooks';
import { hasPermission } from '../features/auth/permissions';
import {
  ShieldAlert, Search, X, Download, ClipboardList,
  ShieldCheck, ShieldX, AlertTriangle, Info, Flame,
  Users, Activity, Lock, RefreshCw,
} from 'lucide-react';

const PAGE_SIZE = 20;
type Tab = 'activity' | 'access';

// ─── Severity dot ─────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  INFO:     '#6b7280',
  WARNING:  '#d97706',
  ERROR:    '#dc2626',
  CRITICAL: '#7c3aed',
};
const SEVERITY_ICON = {
  INFO:     <Info     size={13} strokeWidth={2} />,
  WARNING:  <AlertTriangle size={13} strokeWidth={2} />,
  ERROR:    <ShieldAlert   size={13} strokeWidth={2} />,
  CRITICAL: <Flame         size={13} strokeWidth={2} />,
};

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLOR[severity] ?? '#6b7280';
  const icon  = SEVERITY_ICON[severity as keyof typeof SEVERITY_ICON] ?? null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
      color, cursor: 'default',
    }}>
      {icon} {severity}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cls =
    outcome === 'SUCCESS' ? 'badge-soft badge-success' :
    outcome === 'FAILURE' ? 'badge-soft badge-warning' :
                            'badge-soft badge-error';
  return <span className={`badge ${cls} badge-sm`} style={{ cursor: 'default' }}>{outcome}</span>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const cls = decision === 'PERMIT' ? 'badge-outline badge-success' :
              decision === 'DENY'   ? 'badge-soft badge-error'    :
                                      'badge-outline badge-neutral';
  const icon = decision === 'PERMIT' ? <ShieldCheck size={10} strokeWidth={2.5} /> :
               decision === 'DENY'   ? <ShieldX     size={10} strokeWidth={2.5} /> : null;
  return (
    <span className={`badge ${cls} badge-sm gap-1`} style={{ cursor: 'default' }}>
      {icon}{decision}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cls =
    category === 'AUTH'     ? 'badge-outline badge-primary' :
    category === 'SECURITY' ? 'badge-outline badge-error'   :
    category === 'CONFIG'   ? 'badge-outline badge-warning' :
    category === 'SYSTEM'   ? 'badge-outline badge-neutral' :
                              'badge-ghost';
  return <span className={`badge ${cls} badge-xs`} style={{ cursor: 'default' }}>{category}</span>;
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function ActivityDrawer({ record, onClose }: { record: AuditActivityRecord; onClose: () => void }) {
  const color = SEVERITY_COLOR[record.severity] ?? '#6b7280';
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '440px', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          borderLeft: `4px solid ${color}`,
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>{record.action}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: '0.15rem' }}>
              {new Date(record.createdAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            ['Actor',        record.operatorId],
            ['Action',       record.action],
            ['Category',     record.category],
            ['Severity',     record.severity],
            ['Outcome',      record.outcome],
            ['Resource Type',record.resourceType ?? '—'],
            ['Resource ID',  record.resourceId  ?? '—'],
            ['IP Address',   record.ipAddress   ?? '—'],
            ['Timestamp',    new Date(record.createdAt).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span style={{ opacity: 0.5, minWidth: '7.5rem', flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{value}</span>
            </div>
          ))}

          {record.detail && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.35rem' }}>
                Detail
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.55,
                padding: '0.5rem 0.75rem', background: 'var(--color-base-200)',
                borderRadius: '0.375rem', borderLeft: `3px solid ${color}`,
                wordBreak: 'break-all',
              }}>
                {record.detail}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AccessDrawer({ record, onClose }: { record: AccessAuditRecord; onClose: () => void }) {
  const color = record.decision === 'PERMIT' ? '#16a34a' : '#dc2626';
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '440px', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          borderLeft: `4px solid ${color}`,
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {record.decision} — {record.action}
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: '0.15rem' }}>
              {new Date(record.createdAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            ['Actor',        record.operatorId ?? '—'],
            ['Action',       record.action],
            ['Decision',     record.decision],
            ['Resource Type',record.resourceType  ?? '—'],
            ['Resource ID',  record.resourceId    ?? '—'],
            ['Policy',       record.policyName    ?? 'No match'],
            ['Policy ID',    record.policyId      ?? '—'],
            ['Risk Score',   record.riskScore != null ? String(record.riskScore) : '—'],
            ['Location ID',  record.locationId != null ? String(record.locationId) : '—'],
            ['Client IP',    record.clientIp  ?? '—'],
            ['Timestamp',    new Date(record.createdAt).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span style={{ opacity: 0.5, minWidth: '7.5rem', flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{value}</span>
            </div>
          ))}

          {record.denyReason && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.35rem' }}>
                Deny Reason
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.55,
                padding: '0.5rem 0.75rem', background: '#fef2f2',
                borderRadius: '0.375rem', borderLeft: '3px solid #dc2626',
                wordBreak: 'break-all', color: '#991b1b',
              }}>
                {record.denyReason}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Stats cards ──────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-base-100 shadow-sm" style={{
      borderRadius: '0.5rem', padding: '0.875rem 1rem',
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      borderLeft: `3px solid ${color ?? 'var(--color-primary)'}`,
      flex: 1, minWidth: '140px',
    }}>
      <div style={{
        width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', flexShrink: 0,
        background: color ? `color-mix(in oklch, ${color} 12%, transparent)` : 'color-mix(in oklch, var(--color-primary) 12%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color ?? 'var(--color-primary)',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.55, marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', opacity: 0.4, marginTop: '0.05rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Pagination helper ────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const RESOURCE_TYPES = ['OPERATOR','LOCATION','CABINET','ASSET','CABINET_USER','TRANSACTION','ASSET_GROUP'];

export default function AuditLogPage() {
  const operatorType = useAppSelector(s => s.auth.operator?.type ?? 5);
  const canRead = hasPermission(operatorType, 'AUDIT', 'READ');

  const [activeTab, setActiveTab] = useState<Tab>('activity');

  // Activity filters
  const [aOperator,  setAOperator]  = useState('');
  const [aAction,    setAAction]    = useState('');
  const [aResource,  setAResource]  = useState('');
  const [aOutcome,   setAOutcome]   = useState('');
  const [aSeverity,  setASeverity]  = useState('');
  const [aCategory,  setACategory]  = useState('');
  const [aFrom,      setAFrom]      = useState('');
  const [aTo,        setATo]        = useState('');
  const [aPage,      setAPage]      = useState(0);

  // Access filters
  const [xOperator,  setXOperator]  = useState('');
  const [xDecision,  setXDecision]  = useState('');
  const [xResource,  setXResource]  = useState('');
  const [xAction,    setXAction]    = useState('');
  const [xFrom,      setXFrom]      = useState('');
  const [xTo,        setXTo]        = useState('');
  const [xPage,      setXPage]      = useState(0);

  // Detail drawer
  const [activityDetail, setActivityDetail] = useState<AuditActivityRecord | null>(null);
  const [accessDetail,   setAccessDetail]   = useState<AccessAuditRecord   | null>(null);

  const activityParams: AuditActivityParams = {
    operatorId: aOperator   || undefined,
    action:     aAction     || undefined,
    resourceType: aResource || undefined,
    outcome:    aOutcome     || undefined,
    severity:   aSeverity   || undefined,
    category:   aCategory   || undefined,
    from:       aFrom        || undefined,
    to:         aTo          || undefined,
    page: aPage, size: PAGE_SIZE,
  };

  const accessParams: AccessAuditParams = {
    operatorId: xOperator  || undefined,
    decision:   xDecision  || undefined,
    resourceType: xResource || undefined,
    action:     xAction    || undefined,
    from:       xFrom       || undefined,
    to:         xTo         || undefined,
    page: xPage, size: PAGE_SIZE,
  };

  const { data: stats, refetch: refetchStats } = useGetStatsQuery();
  const { data: activityData, isLoading: aLoading } = useListActivityQuery(activityParams, { skip: !canRead });
  const { data: accessData,   isLoading: xLoading } = useListAccessQuery(accessParams,    { skip: !canRead || activeTab !== 'access' });

  const aRows     = activityData?.content       ?? [];
  const aTotal    = activityData?.totalElements ?? 0;
  const aPages    = activityData?.totalPages    ?? 1;
  const xRows     = accessData?.content         ?? [];
  const xTotal    = accessData?.totalElements   ?? 0;
  const xPages    = accessData?.totalPages      ?? 1;

  const hasActivityFilters = !!(aOperator || aAction || aResource || aOutcome || aSeverity || aCategory || aFrom || aTo);
  const hasAccessFilters   = !!(xOperator || xDecision || xResource || xAction || xFrom || xTo);

  const clearActivityFilters = () => { setAOperator(''); setAAction(''); setAResource(''); setAOutcome(''); setASeverity(''); setACategory(''); setAFrom(''); setATo(''); setAPage(0); };
  const clearAccessFilters   = () => { setXOperator(''); setXDecision(''); setXResource(''); setXAction(''); setXFrom(''); setXTo(''); setXPage(0); };

  const exportCsv = () => {
    const base = '/api/v1/audit/activity/export';
    const p = new URLSearchParams();
    if (aOperator) p.set('operatorId',   aOperator);
    if (aAction)   p.set('action',       aAction);
    if (aResource) p.set('resourceType', aResource);
    if (aOutcome)  p.set('outcome',      aOutcome);
    if (aSeverity) p.set('severity',     aSeverity);
    if (aCategory) p.set('category',     aCategory);
    if (aFrom)     p.set('from',         aFrom + ':00');
    if (aTo)       p.set('to',           aTo   + ':00');
    window.open(`${base}?${p.toString()}`, '_blank');
  };

  // ── Activity columns ──────────────────────────────────────────────────────
  const activityCols = useMemo<ColDef<AuditActivityRecord>[]>(() => [
    {
      headerName: 'Severity', width: 110, sortable: false,
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d ? <SeverityBadge severity={d.severity} /> : null,
    },
    {
      headerName: 'Timestamp', width: 155, field: 'createdAt', sortable: true,
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d ? <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', opacity: 0.75 }}>
          {new Date(d.createdAt).toLocaleString()}
        </span> : null,
    },
    {
      headerName: 'Actor', width: 130, field: 'operatorId',
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d ? <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{d.operatorId}</span> : null,
    },
    {
      headerName: 'Category', width: 95,
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d ? <CategoryBadge category={d.category} /> : null,
    },
    {
      headerName: 'Action', flex: 1, minWidth: 160, field: 'action',
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d ? <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 500 }}>{d.action}</span> : null,
    },
    {
      headerName: 'Resource', width: 130,
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) => d ? (
        <div style={{ lineHeight: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <span style={{ fontSize: '0.73rem', fontWeight: 700, color: d.resourceType ? 'var(--color-primary)' : 'var(--sb-text-muted)', fontStyle: d.resourceType ? 'normal' : 'italic' }}>
            {d.resourceType ?? 'Global'}
          </span>
          {d.resourceId && (
            <span style={{ fontSize: '0.67rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              #{d.resourceId}
            </span>
          )}
        </div>
      ) : null,
    },
    {
      headerName: 'Outcome', width: 100, field: 'outcome',
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d ? <OutcomeBadge outcome={d.outcome} /> : null,
    },
    {
      headerName: 'Detail', flex: 1, minWidth: 120,
      cellRenderer: ({ data: d }: { data: AuditActivityRecord }) =>
        d?.detail ? (
          <span style={{ fontSize: '0.72rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {d.detail}
          </span>
        ) : null,
    },
  ], []);

  // ── Access columns ────────────────────────────────────────────────────────
  const accessCols = useMemo<ColDef<AccessAuditRecord>[]>(() => [
    {
      headerName: 'Decision', width: 110,
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) =>
        d ? <DecisionBadge decision={d.decision} /> : null,
    },
    {
      headerName: 'Timestamp', width: 155, field: 'createdAt',
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) =>
        d ? <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', opacity: 0.75 }}>
          {new Date(d.createdAt).toLocaleString()}
        </span> : null,
    },
    {
      headerName: 'Actor', width: 130, field: 'operatorId',
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) =>
        d ? <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{d.operatorId ?? '—'}</span> : null,
    },
    {
      headerName: 'Action', width: 130, field: 'action',
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) =>
        d ? <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 500 }}>{d.action}</span> : null,
    },
    {
      headerName: 'Resource', width: 130,
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) => d ? (
        <div style={{ lineHeight: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {d.resourceType ?? '—'}
          </span>
          {d.resourceId && (
            <span style={{ fontSize: '0.67rem', opacity: 0.5 }}>#{d.resourceId}</span>
          )}
        </div>
      ) : null,
    },
    {
      headerName: 'Risk', width: 75,
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) => d?.riskScore != null ? (
        <span className={`badge badge-sm badge-outline ${d.riskScore > 75 ? 'badge-error' : d.riskScore > 40 ? 'badge-warning' : 'badge-neutral'}`}
          style={{ cursor: 'default', fontVariantNumeric: 'tabular-nums' }}>
          {d.riskScore}
        </span>
      ) : null,
    },
    {
      headerName: 'Policy', flex: 1, minWidth: 140,
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) =>
        d?.policyName ? (
          <span style={{ fontSize: '0.75rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {d.policyName}
          </span>
        ) : (
          <span style={{ fontSize: '0.72rem', opacity: 0.3, fontStyle: 'italic' }}>No match</span>
        ),
    },
    {
      headerName: 'Deny Reason', flex: 1, minWidth: 140,
      cellRenderer: ({ data: d }: { data: AccessAuditRecord }) =>
        d?.denyReason ? (
          <span style={{ fontSize: '0.72rem', color: '#dc2626', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {d.denyReason}
          </span>
        ) : null,
    },
  ], []);

  if (!canRead) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', opacity: 0.5 }}>
        <Lock size={36} strokeWidth={1} />
        <div>You do not have permission to view audit logs.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Audit Log
        </h1>
        <button className="btn btn-sm btn-ghost gap-1" onClick={() => refetchStats()}>
          <RefreshCw size={14} strokeWidth={1.5} /> Refresh
        </button>
        {activeTab === 'activity' && (
          <button className="btn btn-sm btn-outline gap-1" onClick={exportCsv}>
            <Download size={14} strokeWidth={1.5} /> Export CSV
          </button>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <StatCard icon={<Activity size={18} />}    label="Total Activity"  value={stats.totalActivity.toLocaleString()} sub={`${stats.todayActivity} today`} />
          <StatCard icon={<ClipboardList size={18} />} label="Access Events" value={stats.totalAccess.toLocaleString()}   sub={`${stats.todayAccess} today`} color="#2563eb" />
          <StatCard icon={<Users size={18} />}        label="Unique Actors"  value={stats.uniqueActors}  color="#059669" />
          <StatCard icon={<ShieldX size={18} />}      label="Access Denied"  value={stats.deniedCount}  color="#dc2626" />
          <StatCard icon={<AlertTriangle size={18} />} label="Failures"      value={stats.failureCount + stats.errorCount} color="#d97706" />
          <StatCard icon={<Flame size={18} />}        label="Critical"       value={stats.criticalCount} color="#7c3aed" />
        </div>
      )}

      {/* Main card */}
      <div className="bg-base-100 shadow-sm"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '0.5rem', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flex: 1, paddingLeft: '0.25rem' }}>
            {([
              { key: 'activity', label: 'Activity Log',      count: aTotal },
              { key: 'access',   label: 'Access Decisions',  count: xTotal },
            ] as { key: Tab; label: string; count: number }[]).map(t => {
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '0.5rem 0.875rem', fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--color-primary)' : 'var(--sb-text-muted)',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                    marginBottom: '-1px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}>
                  {t.label}
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600, padding: '0.05rem 0.35rem',
                    borderRadius: '0.75rem',
                    background: isActive ? 'var(--color-primary)' : 'var(--color-base-300)',
                    color: isActive ? 'var(--color-primary-content)' : 'var(--sb-text-muted)',
                    minWidth: '1.25rem', textAlign: 'center',
                  }}>
                    {isActive ? (activeTab === 'activity' ? aTotal : xTotal) : t.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--sb-border)', padding: '0 0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {activeTab === 'activity' ? `${aTotal} events` : `${xTotal} decisions`}
            </span>
          </div>
        </div>

        {/* Activity filters */}
        {activeTab === 'activity' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
            padding: '0.5rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
            background: 'var(--color-base-200)', flexShrink: 0,
          }}>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.6rem', pointerEvents: 'none', color: 'var(--sb-text-muted)', display: 'flex' }}>
                <Search size={13} strokeWidth={1.5} />
              </span>
              <input className="input input-bordered input-sm" style={{ paddingLeft: '1.85rem', width: '160px' }}
                placeholder="Actor ID…" value={aOperator}
                onChange={e => { setAOperator(e.target.value); setAPage(0); }} />
            </label>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.6rem', pointerEvents: 'none', color: 'var(--sb-text-muted)', display: 'flex' }}>
                <Search size={13} strokeWidth={1.5} />
              </span>
              <input className="input input-bordered input-sm" style={{ paddingLeft: '1.85rem', width: '150px' }}
                placeholder="Action…" value={aAction}
                onChange={e => { setAAction(e.target.value); setAPage(0); }} />
            </label>
            <select className="select select-bordered select-sm" value={aResource} onChange={e => { setAResource(e.target.value); setAPage(0); }}>
              <option value="">All Resources</option>
              {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="select select-bordered select-sm" value={aCategory} onChange={e => { setACategory(e.target.value); setAPage(0); }}>
              <option value="">All Categories</option>
              {['AUTH','DATA','SECURITY','CONFIG','SYSTEM'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="select select-bordered select-sm" value={aSeverity} onChange={e => { setASeverity(e.target.value); setAPage(0); }}>
              <option value="">All Severities</option>
              {['INFO','WARNING','ERROR','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="select select-bordered select-sm" value={aOutcome} onChange={e => { setAOutcome(e.target.value); setAPage(0); }}>
              <option value="">All Outcomes</option>
              {['SUCCESS','FAILURE','ERROR'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input type="datetime-local" className="input input-bordered input-sm" style={{ fontSize: '0.78rem', width: '170px' }}
                value={aFrom} onChange={e => { setAFrom(e.target.value); setAPage(0); }} />
              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>→</span>
              <input type="datetime-local" className="input input-bordered input-sm" style={{ fontSize: '0.78rem', width: '170px' }}
                value={aTo} onChange={e => { setATo(e.target.value); setAPage(0); }} />
            </div>
            {hasActivityFilters && (
              <button className="btn btn-xs btn-ghost gap-1" onClick={clearActivityFilters} style={{ marginLeft: 'auto', color: 'var(--color-error)' }}>
                <X size={11} /> Clear
              </button>
            )}
          </div>
        )}

        {/* Access filters */}
        {activeTab === 'access' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
            padding: '0.5rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
            background: 'var(--color-base-200)', flexShrink: 0,
          }}>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.6rem', pointerEvents: 'none', color: 'var(--sb-text-muted)', display: 'flex' }}>
                <Search size={13} strokeWidth={1.5} />
              </span>
              <input className="input input-bordered input-sm" style={{ paddingLeft: '1.85rem', width: '160px' }}
                placeholder="Actor ID…" value={xOperator}
                onChange={e => { setXOperator(e.target.value); setXPage(0); }} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {(['', 'PERMIT', 'DENY'] as const).map(d => {
                const active = xDecision === d;
                return (
                  <button key={d}
                    onClick={() => { setXDecision(d); setXPage(0); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.65rem', borderRadius: '9999px',
                      fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
                      border: active
                        ? `1px solid ${d === 'PERMIT' ? '#86efac' : d === 'DENY' ? '#fca5a5' : 'var(--color-primary)'}`
                        : '1px solid var(--color-base-300)',
                      background: active
                        ? (d === 'PERMIT' ? '#dcfce7' : d === 'DENY' ? '#fee2e2' : 'var(--color-primary)')
                        : 'var(--color-base-100)',
                      color: active
                        ? (d === 'PERMIT' ? '#166534' : d === 'DENY' ? '#991b1b' : 'var(--color-primary-content)')
                        : 'var(--sb-text-muted)',
                    }}>
                    {d === 'PERMIT' && <ShieldCheck size={11} strokeWidth={2.5} />}
                    {d === 'DENY'   && <ShieldX     size={11} strokeWidth={2.5} />}
                    {d === '' ? 'All' : d}
                  </button>
                );
              })}
            </div>
            <select className="select select-bordered select-sm" value={xResource} onChange={e => { setXResource(e.target.value); setXPage(0); }}>
              <option value="">All Resources</option>
              {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.6rem', pointerEvents: 'none', color: 'var(--sb-text-muted)', display: 'flex' }}>
                <Search size={13} strokeWidth={1.5} />
              </span>
              <input className="input input-bordered input-sm" style={{ paddingLeft: '1.85rem', width: '130px' }}
                placeholder="Action…" value={xAction}
                onChange={e => { setXAction(e.target.value); setXPage(0); }} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input type="datetime-local" className="input input-bordered input-sm" style={{ fontSize: '0.78rem', width: '170px' }}
                value={xFrom} onChange={e => { setXFrom(e.target.value); setXPage(0); }} />
              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>→</span>
              <input type="datetime-local" className="input input-bordered input-sm" style={{ fontSize: '0.78rem', width: '170px' }}
                value={xTo} onChange={e => { setXTo(e.target.value); setXPage(0); }} />
            </div>
            {hasAccessFilters && (
              <button className="btn btn-xs btn-ghost gap-1" onClick={clearAccessFilters} style={{ marginLeft: 'auto', color: 'var(--color-error)' }}>
                <X size={11} /> Clear
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {activeTab === 'activity' ? (
          <DataGrid
            columnDefs={activityCols}
            rowData={aRows}
            loading={aLoading}
            getRowId={r => String(r.id)}
            onRowDoubleClicked={r => setActivityDetail(r)}
            height="100%"
            hideToolbar
          />
        ) : (
          <DataGrid
            columnDefs={accessCols}
            rowData={xRows}
            loading={xLoading}
            getRowId={r => r.id}
            onRowDoubleClicked={r => setAccessDetail(r)}
            height="100%"
            hideToolbar
          />
        )}

        {/* Pagination */}
        {(activeTab === 'activity' ? aTotal : xTotal) > 0 && (() => {
          const total   = activeTab === 'activity' ? aTotal   : xTotal;
          const pages   = activeTab === 'activity' ? aPages   : xPages;
          const current = activeTab === 'activity' ? aPage    : xPage;
          const setPage = activeTab === 'activity' ? setAPage : setXPage;
          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: pages > 1 ? 'space-between' : 'flex-end',
              padding: '0.45rem 0.875rem', borderTop: '1px solid var(--color-base-300)',
              background: 'var(--color-base-100)', flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500 }}>
                {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, total)} of {total}
              </span>
              {pages > 1 && (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={current === 0} onClick={() => setPage(0)}>«</button>
                  <button className="join-item btn btn-sm" disabled={current === 0} onClick={() => setPage(p => p - 1)}>‹</button>
                  {getPageNumbers(current, pages).map((p, i) =>
                    p === '...'
                      ? <button key={`e${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                      : <button key={p} onClick={() => setPage(p as number)}
                          className={`join-item btn btn-sm${p === current ? ' btn-active' : ''}`}>
                          {(p as number) + 1}
                        </button>
                  )}
                  <button className="join-item btn btn-sm" disabled={current >= pages - 1} onClick={() => setPage(p => p + 1)}>›</button>
                  <button className="join-item btn btn-sm" disabled={current >= pages - 1} onClick={() => setPage(pages - 1)}>»</button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Drawers */}
      {activityDetail && <ActivityDrawer record={activityDetail} onClose={() => setActivityDetail(null)} />}
      {accessDetail   && <AccessDrawer  record={accessDetail}   onClose={() => setAccessDetail(null)}   />}
    </div>
  );
}
