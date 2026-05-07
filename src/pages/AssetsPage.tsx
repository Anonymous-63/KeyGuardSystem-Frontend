import { useState } from 'react';
import {
  useListAssetsQuery,
  useListAssetsByLocationQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDisableAssetMutation,
  useRestoreAssetMutation,
} from '../features/asset/assetApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import { useListTransactionsByAssetQuery } from '../features/transaction/transactionApi';
import type { AssetResponse, AssetRequest, AssetTransactionResponse } from '../types/api';
import { ASSET_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';

function AssetForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: AssetResponse;
  onSave: (data: AssetRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { data: locations } = useListLocationsQuery({ size: 200 });
  const [tagUid, setTagUid] = useState<number>(initial?.tagUid ?? 0);
  const [number, setNumber] = useState<number>(initial?.number ?? 0);
  const [name, setName] = useState(initial?.name ?? '');
  const [shortKeyName, setShortKeyName] = useState(initial?.shortKeyName ?? '');
  const [details, setDetails] = useState(initial?.details ?? '');
  const [type, setType] = useState<number>(initial?.type ?? 1);
  const [locationId, setLocationId] = useState<number>(initial?.locationId ?? 0);
  const [withdrawPolicy, setWithdrawPolicy] = useState<number>(initial?.withdrawPolicy ?? 0);
  const [fixedSlot, setFixedSlot] = useState<number | ''>(initial?.fixedSlot ?? '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        tagUid, number, name,
        shortKeyName: shortKeyName || undefined,
        details: details || undefined,
        type, locationId,
        withdrawPolicy: withdrawPolicy || undefined,
        fixedSlot: fixedSlot !== '' ? fixedSlot : undefined,
      });
    }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text">Tag UID *</span></label>
          <input type="number" className="input input-bordered" value={tagUid || ''}
            onChange={(e) => setTagUid(Number(e.target.value))} required min={1} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Number *</span></label>
          <input type="number" className="input input-bordered" value={number || ''}
            onChange={(e) => setNumber(Number(e.target.value))} required min={1} />
        </div>
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Name *</span></label>
          <input className="input input-bordered" value={name}
            onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Short Name</span></label>
          <input className="input input-bordered" value={shortKeyName}
            onChange={(e) => setShortKeyName(e.target.value)} maxLength={20} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Type *</span></label>
          <select className="select select-bordered" value={type}
            onChange={(e) => setType(Number(e.target.value))}>
            {Object.entries(ASSET_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Location *</span></label>
          <select className="select select-bordered" value={locationId}
            onChange={(e) => setLocationId(Number(e.target.value))} required>
            <option value={0} disabled>Select location…</option>
            {locations?.content.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Withdraw Policy</span></label>
          <input type="number" className="input input-bordered" value={withdrawPolicy || ''}
            onChange={(e) => setWithdrawPolicy(Number(e.target.value))} min={0} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Fixed Slot</span></label>
          <input type="number" className="input input-bordered" value={fixedSlot}
            onChange={(e) => setFixedSlot(e.target.value === '' ? '' : Number(e.target.value))} min={1} />
        </div>
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Details</span></label>
          <textarea className="textarea textarea-bordered" value={details}
            onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={500} />
        </div>
      </div>
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function AssetHistoryPanel({ asset }: { asset: AssetResponse }) {
  const { data: txs, isLoading } = useListTransactionsByAssetQuery(asset.id);

  const statusBadge = (tx: AssetTransactionResponse) => {
    if (tx.returnedAt) return <span className="badge badge-success badge-xs">Returned</span>;
    if (tx.overdueMinutes && tx.overdueMinutes > 0) return <span className="badge badge-error badge-xs">Overdue</span>;
    return <span className="badge badge-warning badge-xs">Out</span>;
  };

  return (
    <div>
      <p className="text-sm text-base-content/60 mb-3">
        Transaction history for <span className="font-semibold text-base-content">{asset.name}</span>
        <span className="ml-1 font-mono text-xs">#{asset.number}</span>
      </p>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : !txs?.length ? (
        <p className="text-sm text-base-content/40 text-center py-6 italic">No transaction history.</p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="table table-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>Issued To</th>
                <th>Issued At</th>
                <th>Returned At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.autoNo} className={tx.overdueMinutes && tx.overdueMinutes > 0 && !tx.returnedAt ? 'bg-error/5' : ''}>
                  <td className="font-mono text-xs text-base-content/50">{tx.autoNo}</td>
                  <td className="text-xs">
                    <p>{tx.issuedTo}</p>
                    {tx.issuedToName && <p className="text-base-content/50">{tx.issuedToName}</p>}
                  </td>
                  <td className="text-xs">{new Date(tx.issuedAt).toLocaleString()}</td>
                  <td className="text-xs">
                    {tx.returnedAt ? new Date(tx.returnedAt).toLocaleString() : '—'}
                  </td>
                  <td>{statusBadge(tx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [locationFilter, setLocationFilter] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetResponse | null>(null);
  const [historyAsset, setHistoryAsset] = useState<AssetResponse | null>(null);
  const [confirm, setConfirm] = useState<{ asset: AssetResponse; action: 'disable' | 'restore' } | null>(null);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data: pagedData, isLoading: loadingPaged } = useListAssetsQuery(
    { page, size: 20, includeDisabled },
    { skip: !!locationFilter }
  );
  const { data: filteredData, isLoading: loadingFiltered } = useListAssetsByLocationQuery(
    locationFilter,
    { skip: !locationFilter }
  );

  const isLoading = loadingPaged || loadingFiltered;
  const rows = locationFilter
    ? (filteredData?.filter((a) => includeDisabled || !a.disabled) ?? [])
    : (pagedData?.content ?? []);

  const [create, { isLoading: creating }] = useCreateAssetMutation();
  const [update, { isLoading: updating }] = useUpdateAssetMutation();
  const [disable, { isLoading: disabling }] = useDisableAssetMutation();
  const [restore, { isLoading: restoring }] = useRestoreAssetMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (asset: AssetResponse) => { setEditing(asset); setModalOpen(true); };

  const handleSave = async (body: AssetRequest) => {
    if (editing) await update({ id: editing.id, body });
    else await create(body);
    setModalOpen(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.action === 'disable') await disable(confirm.asset.id);
    else await restore(confirm.asset.id);
    setConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Assets</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <PermissionGate resource="ASSET" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Asset</button>
          </PermissionGate>
        </div>
      </div>

      {/* Location filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          className="select select-bordered select-sm w-56"
          value={locationFilter}
          onChange={(e) => { setLocationFilter(Number(e.target.value)); setPage(0); }}
        >
          <option value={0}>All Locations</option>
          {locations?.content.filter((l) => !l.disabled).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        {locationFilter > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setLocationFilter(0)}>
            Clear filter
          </button>
        )}
      </div>

      <div className="card bg-base-100 shadow">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Tag UID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={7} />}
              {!isLoading && rows.length === 0 && (
                <EmptyState colSpan={7} icon="🔑" title="No assets found"
                  message={locationFilter ? 'No assets in this location.' : undefined} />
              )}
              {rows.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-mono text-sm">{asset.id}</td>
                  <td className="font-medium">{asset.number}</td>
                  <td>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      {asset.shortKeyName && <p className="text-xs text-base-content/50">{asset.shortKeyName}</p>}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-outline badge-sm">
                      {ASSET_TYPES[asset.type] ?? `Type ${asset.type}`}
                    </span>
                  </td>
                  <td className="font-mono text-sm text-base-content/70">{asset.tagUid}</td>
                  <td><StatusBadge disabled={asset.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs text-primary"
                        onClick={() => setHistoryAsset(asset)}>
                        History
                      </button>
                      <PermissionGate resource="ASSET" action="UPDATE">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(asset)}>Edit</button>
                      </PermissionGate>
                      <PermissionGate resource="ASSET" action="DELETE">
                        {asset.disabled ? (
                          <button className="btn btn-ghost btn-xs text-success"
                            onClick={() => setConfirm({ asset, action: 'restore' })}>Restore</button>
                        ) : (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm({ asset, action: 'disable' })}>Disable</button>
                        )}
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!locationFilter && pagedData && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pagedData.totalPages}
              totalElements={pagedData.totalElements} size={20} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal open={modalOpen} title={editing ? 'Edit Asset' : 'New Asset'}
        onClose={() => setModalOpen(false)} size="lg">
        <AssetForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <Modal open={!!historyAsset} title="Asset Transaction History"
        onClose={() => setHistoryAsset(null)} size="lg">
        {historyAsset && <AssetHistoryPanel asset={historyAsset} />}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable Asset' : 'Restore Asset'}
        message={
          confirm?.action === 'disable'
            ? `Disable asset "${confirm?.asset.name}"? It will not be assignable.`
            : `Restore asset "${confirm?.asset.name}"?`
        }
        confirmLabel={confirm?.action === 'disable' ? 'Disable' : 'Restore'}
        danger={confirm?.action === 'disable'}
        loading={disabling || restoring}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
