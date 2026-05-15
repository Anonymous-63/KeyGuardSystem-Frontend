import { useParams, useNavigate } from 'react-router-dom';
import { useGetAssetQuery } from '@/features/asset/api/assetApi';
import { useListLocationsQuery } from '@/features/location/api/locationApi';
import { useListTransactionsByAssetQuery } from '@/features/transaction/api/transactionApi';
import type { AssetTransactionResponse } from '@/shared/types/api';
import { ASSET_TYPES } from '@/shared/types/api';
import StatusBadge from '@/shared/components/ui/StatusBadge';

function TxStatusBadge({ tx }: { tx: AssetTransactionResponse }) {
  if (tx.returnedAt) return <span className="badge badge-success badge-xs">Returned</span>;
  if (tx.overdueMinutes && tx.overdueMinutes > 0) return <span className="badge badge-error badge-xs">Overdue</span>;
  return <span className="badge badge-warning badge-xs">Out</span>;
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const assetId = Number(id);
  const navigate = useNavigate();

  const { data: asset, isLoading } = useGetAssetQuery(assetId, { skip: !assetId });
  const { data: txs, isLoading: loadingTx } = useListTransactionsByAssetQuery(assetId, { skip: !assetId });
  const { data: locations } = useListLocationsQuery({ size: 200 });

  const locationName = (locId?: number) =>
    locId ? (locations?.content.find((l) => l.id === locId)?.name ?? `#${locId}`) : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-24">
        <p className="text-base-content/40">Asset not found.</p>
        <button className="btn btn-ghost mt-4" onClick={() => navigate('/assets')}>← Back</button>
      </div>
    );
  }

  const activeTx = txs?.find((t) => !t.returnedAt);
  const totalTx = txs?.length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li><button className="link link-hover" onClick={() => navigate('/assets')}>Assets</button></li>
          <li>{asset.name}</li>
        </ul>
      </div>

      {/* Header card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{asset.name}</h1>
                <span className="badge badge-outline">
                  {ASSET_TYPES[asset.type] ?? `Type ${asset.type}`}
                </span>
                <StatusBadge disabled={asset.disabled} />
                {activeTx ? (
                  <span className="badge badge-warning">Checked Out</span>
                ) : (
                  <span className="badge badge-success">In Cabinet</span>
                )}
              </div>
              {asset.shortKeyName && (
                <p className="text-base-content/50 text-sm mt-0.5">{asset.shortKeyName}</p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/assets')}>
              ← Back
            </button>
          </div>

          <div className="divider my-2" />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Asset Number</p>
              <p className="font-mono font-medium">#{asset.number}</p>
            </div>
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Tag UID</p>
              <p className="font-mono">{asset.tagUid}</p>
            </div>
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Location</p>
              <p>{locationName(asset.locationId)}</p>
            </div>
            {asset.fixedSlot !== undefined && asset.fixedSlot !== null && (
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Fixed Slot</p>
                <p className="font-mono">Slot {asset.fixedSlot}</p>
              </div>
            )}
            {asset.withdrawPolicy !== undefined && asset.withdrawPolicy !== null && asset.withdrawPolicy > 0 && (
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Withdraw Policy</p>
                <p className="font-mono">{asset.withdrawPolicy}</p>
              </div>
            )}
            <div>
              <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Total Transactions</p>
              <p className="font-medium">{totalTx}</p>
            </div>
          </div>

          {asset.details && (
            <div className="mt-3 p-3 bg-base-200 rounded-lg text-sm text-base-content/70">
              {asset.details}
            </div>
          )}
        </div>
      </div>

      {/* Active checkout */}
      {activeTx && (
        <div className="card bg-warning/10 border border-warning/30 shadow">
          <div className="card-body py-4">
            <h2 className="card-title text-base text-warning">Currently Checked Out</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mt-1">
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Issued To</p>
                <p className="font-medium">{activeTx.issuedToName ?? activeTx.issuedTo}</p>
                <p className="text-xs font-mono text-base-content/50">{activeTx.issuedTo}</p>
              </div>
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Issued At</p>
                <p>{new Date(activeTx.issuedAt).toLocaleString()}</p>
              </div>
              {activeTx.expectedBefore && (
                <div>
                  <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Expected Return</p>
                  <p className={activeTx.overdueMinutes && activeTx.overdueMinutes > 0 ? 'text-error font-medium' : ''}>
                    {new Date(activeTx.expectedBefore).toLocaleString()}
                  </p>
                  {activeTx.overdueMinutes && activeTx.overdueMinutes > 0 && (
                    <p className="text-xs text-error">
                      {Math.floor(activeTx.overdueMinutes / 60)}h {activeTx.overdueMinutes % 60}m overdue
                    </p>
                  )}
                </div>
              )}
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">From Cabinet</p>
                <p>{activeTx.issuedFromName ?? `Cabinet #${activeTx.issuedFrom}`}</p>
              </div>
              <div>
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-0.5">Transaction #</p>
                <p className="font-mono text-base-content/60">{activeTx.autoNo}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-base">Transaction History</h2>
          {loadingTx ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : !txs?.length ? (
            <p className="text-sm text-base-content/40 py-4">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Issued To</th>
                    <th>Cabinet</th>
                    <th>Issued At</th>
                    <th>Returned At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx) => (
                    <tr key={tx.autoNo} className={tx.overdueMinutes && tx.overdueMinutes > 0 && !tx.returnedAt ? 'bg-error/5' : ''}>
                      <td className="font-mono text-xs text-base-content/50">{tx.autoNo}</td>
                      <td className="text-sm">
                        <p className="font-medium">{tx.issuedToName ?? tx.issuedTo}</p>
                        {tx.issuedToName && <p className="text-xs font-mono text-base-content/50">{tx.issuedTo}</p>}
                      </td>
                      <td className="text-sm text-base-content/60">
                        {tx.issuedFromName ?? `Cabinet #${tx.issuedFrom}`}
                      </td>
                      <td className="text-sm">{new Date(tx.issuedAt).toLocaleString()}</td>
                      <td className="text-sm">
                        {tx.returnedAt ? new Date(tx.returnedAt).toLocaleString() : '—'}
                      </td>
                      <td><TxStatusBadge tx={tx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
