import { useState } from 'react';
import {
  useListAssetTransactionsQuery,
  useListAssetsOutQuery,
  useListOverdueAssetsQuery,
  useRecordReturnMutation,
} from '../features/transaction/transactionApi';
import type { AssetTransactionResponse, AssetReturnRequest } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';

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

  return (
    <div className="space-y-4">
      <div className="bg-base-200 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-base-content/60">Asset</span><span className="font-medium">{tx.assetName ?? `#${tx.assetId}`}</span></div>
        <div className="flex justify-between"><span className="text-base-content/60">Issued to</span><span className="font-medium">{tx.issuedTo}</span></div>
        <div className="flex justify-between"><span className="text-base-content/60">Issued at</span><span>{new Date(tx.issuedAt).toLocaleString()}</span></div>
        {tx.expectedBefore && <div className="flex justify-between"><span className="text-base-content/60">Expected before</span><span className={tx.overdueMinutes && tx.overdueMinutes > 0 ? 'text-error font-medium' : ''}>{new Date(tx.expectedBefore).toLocaleString()}</span></div>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Return Time *</span></label>
          <input type="datetime-local" className="input input-bordered" value={returnedAt}
            onChange={(e) => setReturnedAt(e.target.value)} required />
        </div>
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Returned By (User ID)</span></label>
          <input className="input input-bordered" value={returnedBy}
            onChange={(e) => setReturnedBy(e.target.value)} maxLength={30} />
        </div>
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Returned to Cabinet ID</span></label>
          <input type="number" className="input input-bordered" value={returnedTo}
            onChange={(e) => setReturnedTo(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      </div>
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={loading}
          onClick={() => onSave({
            returnedAt: returnedAt ? `${returnedAt}:00` : undefined,
            returnedBy: returnedBy || undefined,
            returnedTo: returnedTo !== '' ? returnedTo : undefined,
          })}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          Record Return
        </button>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [page, setPage] = useState(0);
  const [returning, setReturning] = useState<AssetTransactionResponse | null>(null);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [returnData, setReturnData] = useState<AssetReturnRequest | null>(null);

  const { data: allData, isLoading: loadingAll } = useListAssetTransactionsQuery(
    { page, size: 20 }, { skip: viewMode !== 'all' }
  );
  const { data: outData, isLoading: loadingOut } = useListAssetsOutQuery(
    undefined, { skip: viewMode !== 'out' }
  );
  const { data: overdueData, isLoading: loadingOverdue } = useListOverdueAssetsQuery(
    undefined, { skip: viewMode !== 'overdue' }
  );

  const [recordReturn, { isLoading: recording }] = useRecordReturnMutation();

  const isLoading = loadingAll || loadingOut || loadingOverdue;
  const rows: AssetTransactionResponse[] =
    viewMode === 'all' ? (allData?.content ?? []) :
    viewMode === 'out' ? (outData ?? []) :
    (overdueData ?? []);

  const handleReturnSubmit = (data: AssetReturnRequest) => {
    setReturnData(data);
    setConfirmReturn(true);
  };

  const handleReturnConfirm = async () => {
    if (!returning || !returnData) return;
    await recordReturn({ autoNo: returning.autoNo, body: returnData });
    setReturning(null);
    setConfirmReturn(false);
    setReturnData(null);
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
        {viewMode === 'all' && allData && (
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
