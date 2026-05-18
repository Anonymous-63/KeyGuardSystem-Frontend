import { useMemo, useState } from 'react';
import {
  useListAssetTransactionsQuery,
  useListAssetsOutQuery,
  useListOverdueAssetsQuery,
  useRecordReturnMutation,
  useRecordIssuanceMutation,
  useListTransactionsByDateRangeQuery,
} from '@/features/transaction/api/transactionApi';
import type { AssetTransactionResponse, AssetReturnRequest, AssetTransactionWriteRequest } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import PermissionGate from '@/shared/components/ui/PermissionGate';
import { useToast } from '@/shared/components/ui/Toast';
import { FormField, FormGrid, FormActions } from '@/shared/components/form/Form';
import PageHeader from '@/shared/components/ui/PageHeader';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';

const ICO_ARROWS = ['M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5'];

type ViewMode = 'all' | 'out' | 'overdue';

function ReturnForm({
  tx, onSave, onCancel, loading,
}: {
  tx: AssetTransactionResponse;
  onSave: (data: AssetReturnRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [returnedBy, setReturnedBy] = useState('');
  const [returnedTo, setReturnedTo] = useState<number | ''>(tx.issuedFrom);
  const [returnedAt, setReturnedAt] = useState(new Date().toISOString().slice(0, 16));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      returnedAt: returnedAt ? `${returnedAt}:00` : undefined,
      returnedBy: returnedBy || undefined,
      returnedTo: returnedTo !== '' ? returnedTo : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-base-200 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-base-content/60">Asset</span><span className="font-medium">{tx.assetName ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-base-content/60">Issued to</span><span className="font-medium">{tx.issuedTo}</span></div>
        <div className="flex justify-between"><span className="text-base-content/60">Issued at</span><span>{new Date(tx.issuedAt).toLocaleString()}</span></div>
        {tx.expectedBefore && <div className="flex justify-between"><span className="text-base-content/60">Expected before</span><span className={tx.overdueMinutes && tx.overdueMinutes > 0 ? 'text-error font-medium' : ''}>{new Date(tx.expectedBefore).toLocaleString()}</span></div>}
      </div>
      <FormField type="datetime-local" label="Return Time" value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} required />
      <FormField label="Returned By (User ID)" value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} maxLength={30} />
      <FormField type="number" label="Returned to Cabinet ID" value={returnedTo} onChange={(e) => setReturnedTo(e.target.value === '' ? '' : Number(e.target.value))} />
      <FormActions onCancel={onCancel} loading={loading} submitLabel="Record Return" />
    </form>
  );
}

function IssuanceForm({
  onSave, onCancel, loading,
}: {
  onSave: (data: AssetTransactionWriteRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [assetId, setAssetId] = useState<number | ''>('');
  const [assetNumber, setAssetNumber] = useState<number | ''>('');
  const [issuedFrom, setIssuedFrom] = useState<number | ''>('');
  const [issuedTo, setIssuedTo] = useState('');
  const [expectedBefore, setExpectedBefore] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assetId === '' || assetNumber === '' || issuedFrom === '' || !issuedTo) return;
    onSave({
      assetId: assetId as number,
      assetNumber: assetNumber as number,
      issuedFrom: issuedFrom as number,
      issuedTo,
      expectedBefore: expectedBefore ? `${expectedBefore}:00` : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGrid>
        <FormField type="number" label="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value === '' ? '' : Number(e.target.value))} required min={1} />
        <FormField type="number" label="Asset Number" value={assetNumber} onChange={(e) => setAssetNumber(e.target.value === '' ? '' : Number(e.target.value))} required min={1} />
        <FormField type="number" label="Cabinet ID (From)" value={issuedFrom} onChange={(e) => setIssuedFrom(e.target.value === '' ? '' : Number(e.target.value))} required min={1} />
        <FormField label="Issued To (User ID)" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} required maxLength={30} />
        <FormField type="datetime-local" label="Expected Return" value={expectedBefore} onChange={(e) => setExpectedBefore(e.target.value)} wrapperClassName="col-span-full" />
      </FormGrid>
      <FormActions onCancel={onCancel} loading={loading} submitLabel="Record Issuance" />
    </form>
  );
}

export default function TransactionsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [page, setPage] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [returning, setReturning] = useState<AssetTransactionResponse | null>(null);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [returnData, setReturnData] = useState<AssetReturnRequest | null>(null);
  const [issuanceOpen, setIssuanceOpen] = useState(false);

  const hasDateFilter = !!(fromDate && toDate);

  const { data: allData, isLoading: loadingAll } = useListAssetTransactionsQuery(
    { page, size: 20 }, { skip: viewMode !== 'all' || hasDateFilter }
  );
  const { data: dateData, isLoading: loadingDate } = useListTransactionsByDateRangeQuery(
    { from: fromDate, to: toDate },
    { skip: viewMode !== 'all' || !hasDateFilter }
  );
  const { data: outData, isLoading: loadingOut } = useListAssetsOutQuery(
    undefined, { skip: viewMode !== 'out' }
  );
  const { data: overdueData, isLoading: loadingOverdue } = useListOverdueAssetsQuery(
    undefined, { skip: viewMode !== 'overdue' }
  );

  const { addToast } = useToast();
  const [recordReturn, { isLoading: recording }] = useRecordReturnMutation();
  const [recordIssuance, { isLoading: issuing }] = useRecordIssuanceMutation();

  const isLoading = loadingAll || loadingDate || loadingOut || loadingOverdue;
  const rows: AssetTransactionResponse[] =
    viewMode === 'all'
      ? hasDateFilter ? (dateData ?? []) : (allData?.content ?? [])
      : viewMode === 'out' ? (outData ?? [])
      : (overdueData ?? []);

  const handleReturnSubmit = (data: AssetReturnRequest) => {
    setReturnData(data);
    setConfirmReturn(true);
  };

  const handleReturnConfirm = async () => {
    if (!returning || !returnData) return;
    try {
      await recordReturn({ autoNo: returning.autoNo, body: returnData }).unwrap();
      addToast({ type: 'success', message: 'Return recorded' });
    } catch {
      addToast({ type: 'error', message: 'Failed to record return' });
    }
    setReturning(null);
    setConfirmReturn(false);
    setReturnData(null);
  };

  const handleIssuance = async (data: AssetTransactionWriteRequest) => {
    try {
      await recordIssuance(data).unwrap();
      addToast({ type: 'success', message: 'Issuance recorded' });
      setIssuanceOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to record issuance' });
    }
  };

  const tabs: { mode: ViewMode; label: string; icon: string }[] = [
    { mode: 'all',     label: 'All',     icon: '📋' },
    { mode: 'out',     label: 'Out Now', icon: '🔓' },
    { mode: 'overdue', label: 'Overdue', icon: '⚠️' },
  ];

  const cols = useMemo<ColDef<AssetTransactionResponse>[]>(() => [
    {
      headerName: 'Asset',
      flex: 1,
      valueGetter: ({ data: d }) => d ? (d.assetName ?? `Asset #${d.assetId}`) : '',
    },
    {
      headerName: 'User',
      flex: 1,
      valueGetter: ({ data: d }) => d ? (d.issuedToName ? `${d.issuedTo} · ${d.issuedToName}` : d.issuedTo) : '',
    },
    {
      headerName: 'Cabinet',
      width: 120,
      valueGetter: ({ data: d }) => d ? (d.issuedFromName ?? `Cabinet ${d.issuedFrom}`) : '',
    },
    {
      headerName: 'Issued',
      width: 140,
      valueGetter: ({ data: d }) => d ? new Date(d.issuedAt).toLocaleString() : '',
    },
    {
      headerName: 'Expected',
      width: 140,
      valueGetter: ({ data: d }) => d ? (d.expectedBefore ? new Date(d.expectedBefore).toLocaleString() : '—') : '',
    },
    {
      headerName: 'Returned',
      width: 140,
      valueGetter: ({ data: d }) => d ? (d.returnedAt ? new Date(d.returnedAt).toLocaleString() : '—') : '',
    },
    {
      headerName: 'Status',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: AssetTransactionResponse }) => {
        if (d.returnedAt) return <span className="badge badge-success badge-sm">Returned</span>;
        if (d.overdueMinutes && d.overdueMinutes > 0) return <span className="badge badge-error badge-sm">Overdue</span>;
        return <span className="badge badge-warning badge-sm">Out</span>;
      },
    },
    {
      headerName: 'Actions',
      width: 80,
      sortable: false,
      resizable: false,
      cellRenderer: ({ data: d }: { data: AssetTransactionResponse }) => (
        <PermissionGate resource="TRANSACTION" action="UPDATE">
          {!d.returnedAt ? (
            <button className="btn btn-ghost btn-xs text-primary"
              onClick={(e) => { e.stopPropagation(); setReturning(d); }}>
              Return
            </button>
          ) : <span />}
        </PermissionGate>
      ),
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_ARROWS}
        title="Transactions"
        resource="TRANSACTION"
        onAdd={() => setIssuanceOpen(true)}
      />

      {/* Tab bar */}
      <div className="tabs tabs-boxed bg-base-100 mb-4 w-fit shadow">
        {tabs.map(({ mode, label, icon }) => (
          <button
            key={mode}
            className={`tab gap-1 ${viewMode === mode ? 'tab-active' : ''}`}
            onClick={() => { setViewMode(mode); setPage(0); }}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Date filter — "All" tab only */}
      {viewMode === 'all' && (
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <div className="form-control">
            <label className="label py-0.5"><span className="label-text text-xs">From</span></label>
            <input type="datetime-local" className="input input-bordered input-sm"
              value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} />
          </div>
          <div className="form-control">
            <label className="label py-0.5"><span className="label-text text-xs">To</span></label>
            <input type="datetime-local" className="input input-bordered input-sm"
              value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} />
          </div>
          {hasDateFilter && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFromDate(''); setToDate(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      <div className="card bg-base-100 shadow" style={{ flex: 1, minHeight: 0 }}><div className="card-body p-0 overflow-hidden" style={{ flex: 1 }}>
        <DataGrid
          columnDefs={cols}
          rowData={rows}
          loading={isLoading}
          getRowId={(r) => String(r.autoNo)}
          exportable
          exportFilename="transactions"
          height="100%"
        />
      </div></div>

      {/* Return modal */}
      <Modal open={!!returning && !confirmReturn} title="Record Asset Return"
        onClose={() => setReturning(null)} size="md">
        {returning && (
          <ReturnForm tx={returning} onSave={handleReturnSubmit}
            onCancel={() => setReturning(null)} loading={false} />
        )}
      </Modal>

      {/* Issuance modal */}
      <Modal open={issuanceOpen} title="Record Issuance" onClose={() => setIssuanceOpen(false)} size="md">
        <IssuanceForm onSave={handleIssuance} onCancel={() => setIssuanceOpen(false)} loading={issuing} />
      </Modal>

      <ConfirmDialog
        open={confirmReturn}
        title="Confirm Return"
        message={`Record return of "${returning?.assetName ?? `Asset #${returning?.assetId}`}"?`}
        confirmLabel="Record Return"
        loading={recording}
        onConfirm={handleReturnConfirm}
        onCancel={() => { setConfirmReturn(false); }}
      />
    </div>
  );
}
