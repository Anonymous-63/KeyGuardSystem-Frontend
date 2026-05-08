import { useState } from 'react';
import {
  useListAssetTransactionsQuery,
  useListAssetsOutQuery,
  useListOverdueAssetsQuery,
  useRecordReturnMutation,
  useRecordIssuanceMutation,
  useListTransactionsByDateRangeQuery,
} from '../features/transaction/transactionApi';
import type { AssetTransactionResponse, AssetReturnRequest, AssetTransactionWriteRequest } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';
import { FormField, FormGrid, FormActions } from '../components/shared/Form';

type ViewMode = 'all' | 'out' | 'overdue';

function TransactionStatusBadge({ tx }: { tx: AssetTransactionResponse }) {
  if (tx.returnedAt) {
    return <span className="badge badge-success badge-sm">Returned</span>;
  }
  if (tx.overdueMinutes && tx.overdueMinutes > 0) {
    return <span className="badge badge-error badge-sm">Overdue</span>;
  }
  return <span className="badge badge-warning badge-sm">Out</span>;
}

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
        <div className="flex justify-between"><span className="text-base-content/60">Asset</span><span className="font-medium">{tx.assetName ?? `#${tx.assetId}`}</span></div>
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <PermissionGate resource="TRANSACTION" action="CREATE">
          <button className="btn btn-primary btn-sm" onClick={() => setIssuanceOpen(true)}>
            + Record Issuance
          </button>
        </PermissionGate>
      </div>

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

      <div className="card bg-base-100 shadow">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>#</th>
                <th>Asset</th>
                <th>Issued To</th>
                <th>From Cabinet</th>
                <th>Issued At</th>
                <th>Expected Return</th>
                <th>Status</th>
                <PermissionGate resource="TRANSACTION" action="UPDATE">
                  <th>Actions</th>
                </PermissionGate>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={8} />}
              {!isLoading && rows.length === 0 && (
                <EmptyState colSpan={8} icon="📋" title="No transactions found" />
              )}
              {rows.map((tx) => (
                <tr key={tx.autoNo} className={tx.overdueMinutes && tx.overdueMinutes > 0 && !tx.returnedAt ? 'bg-error/5' : ''}>
                  <td className="font-mono text-sm text-base-content/60">{tx.autoNo}</td>
                  <td>
                    <div>
                      <p className="font-medium">{tx.assetName ?? `Asset #${tx.assetId}`}</p>
                      {tx.assetNumber && <p className="text-xs text-base-content/50">#{tx.assetNumber}</p>}
                    </div>
                  </td>
                  <td className="text-sm">
                    <div>
                      <p className="font-medium">{tx.issuedTo}</p>
                      {tx.issuedToName && <p className="text-xs text-base-content/50">{tx.issuedToName}</p>}
                    </div>
                  </td>
                  <td className="text-sm text-base-content/70">
                    {tx.issuedFromName ?? `Cabinet ${tx.issuedFrom}`}
                  </td>
                  <td className="text-sm">{new Date(tx.issuedAt).toLocaleString()}</td>
                  <td className="text-sm">
                    {tx.expectedBefore ? (
                      <span className={tx.overdueMinutes && tx.overdueMinutes > 0 && !tx.returnedAt ? 'text-error font-medium' : ''}>
                        {new Date(tx.expectedBefore).toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td><TransactionStatusBadge tx={tx} /></td>
                  <PermissionGate resource="TRANSACTION" action="UPDATE">
                    <td>
                      {!tx.returnedAt && (
                        <button className="btn btn-ghost btn-xs text-primary"
                          onClick={() => setReturning(tx)}>
                          Return
                        </button>
                      )}
                    </td>
                  </PermissionGate>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {viewMode === 'all' && !hasDateFilter && allData && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={allData.totalPages}
              totalElements={allData.totalElements} size={20} onPageChange={setPage} />
          </div>
        )}
      </div>

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
