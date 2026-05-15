import { useMemo, useState } from 'react';
import { useListAuditTrailQuery } from '@/features/dashboard/api/dashboardApi';
import type { OperatorAuditResponse } from '@/shared/types/api';
import PageHeader from '@/shared/components/ui/PageHeader';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';

const ICO_AUDIT = [
  'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
];

const ACTION_OPTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'CREATE', 'UPDATE', 'DELETE', 'RESTORE',
  'ASSIGN', 'UNASSIGN',
  'IMPORT', 'EXPORT',
  'PASSWORD_CHANGE', 'PASSWORD_RESET',
  'RELEASE',
];

function actionBadge(action: string): string {
  if (['LOGIN_FAILED', 'DELETE', 'DISABLE'].includes(action)) return 'badge badge-error badge-sm';
  if (action === 'CREATE') return 'badge badge-success badge-sm';
  if (['UPDATE', 'ASSIGN', 'UNASSIGN', 'PASSWORD_CHANGE', 'RELEASE'].includes(action)) return 'badge badge-warning badge-sm';
  if (['LOGIN', 'LOGOUT', 'RESTORE', 'EXPORT', 'IMPORT', 'PASSWORD_RESET'].includes(action)) return 'badge badge-info badge-sm';
  return 'badge badge-ghost badge-sm';
}

export default function AuditTrailPage() {
  const [filterOpId, setFilterOpId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data, isLoading } = useListAuditTrailQuery({
    page: 0,
    size: 200,
    operatorId: filterOpId || undefined,
    action: filterAction || undefined,
    from: filterFrom ? filterFrom.replace('T', ' ') + ':00' : undefined,
    to: filterTo ? filterTo.replace('T', ' ') + ':00' : undefined,
  });

  const rows = data?.content ?? [];

  const cols = useMemo<ColDef<OperatorAuditResponse>[]>(() => [
    { field: 'id', headerName: '#', width: 70 },
    { field: 'operatorId', headerName: 'Operator', width: 130 },
    {
      field: 'action',
      headerName: 'Action',
      width: 160,
      cellRenderer: ({ value }: { value: string }) => (
        <span className={actionBadge(value)}>{value}</span>
      ),
    },
    {
      field: 'resourceType',
      headerName: 'Resource',
      width: 120,
      valueFormatter: ({ value }: { value: string | undefined }) => value ?? '—',
    },
    {
      field: 'resourceId',
      headerName: 'Res ID',
      width: 80,
      valueFormatter: ({ value }: { value: string | undefined }) => value ?? '—',
    },
    {
      field: 'detail',
      headerName: 'Detail',
      flex: 1,
      valueFormatter: ({ value }: { value: string | undefined }) => value ?? '',
    },
    {
      field: 'ipAddress',
      headerName: 'IP Address',
      width: 120,
      valueFormatter: ({ value }: { value: string | undefined }) => value ?? '—',
    },
    {
      field: 'createdAt',
      headerName: 'Date / Time',
      width: 160,
      valueFormatter: ({ value }: { value: string | undefined }) =>
        value ? new Date(value).toLocaleString() : '',
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader icon={ICO_AUDIT} title="Audit Trail" resource="AUDIT" />

      <div className="card bg-base-100 shadow mb-3">
        <div className="card-body p-3">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--ent-dark)', fontWeight: 600 }}>Operator ID</label>
              <input
                className="input input-bordered input-sm"
                style={{ width: '150px' }}
                placeholder="Filter by operator…"
                value={filterOpId}
                onChange={(e) => setFilterOpId(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--ent-dark)', fontWeight: 600 }}>Action</label>
              <select
                className="select select-bordered select-sm"
                style={{ width: '160px' }}
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--ent-dark)', fontWeight: 600 }}>From</label>
              <input
                type="datetime-local"
                className="input input-bordered input-sm"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--ent-dark)', fontWeight: 600 }}>To</label>
              <input
                type="datetime-local"
                className="input input-bordered input-sm"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
            {(filterOpId || filterAction || filterFrom || filterTo) && (
              <button
                className="btn btn-ghost btn-sm self-end"
                onClick={() => { setFilterOpId(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); }}
              >
                Clear Filters
              </button>
            )}
          </div>
          {!isLoading && data && data.totalElements > 200 && (
            <p className="text-xs mt-2" style={{ color: '#888' }}>
              Showing first 200 of {data.totalElements.toLocaleString()} records. Use filters to narrow results.
            </p>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow" style={{ flex: 1, minHeight: 0 }}>
        <div className="card-body p-0 overflow-hidden" style={{ flex: 1 }}>
          <DataGrid
            columnDefs={cols}
            rowData={rows}
            loading={isLoading}
            getRowId={(r) => String(r.id)}
            exportable
            exportFilename="audit-trail"
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}
