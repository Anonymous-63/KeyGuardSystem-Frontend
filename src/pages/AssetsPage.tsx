import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useListAssetsQuery,
  useListAssetsByLocationQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDisableAssetMutation,
  useRestoreAssetMutation,
} from '../features/asset/assetApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import { useAppSelector } from '../app/hooks';
import { selectSelectedLocation } from '../features/location/locationSlice';
import { useListTransactionsByAssetQuery } from '../features/transaction/transactionApi';
import type { AssetResponse, AssetRequest, AssetTransactionResponse } from '../types/api';
import { ASSET_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../components/shared/Toast';
import { FormField, FormSelect, FormTextarea, FormGrid, FormActions } from '../components/shared/Form';
import PageHeader from '../components/shared/PageHeader';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';

const ICO_ASSET = ['M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z'];

const WITHDRAW_POLICIES = [
  { value: 0, label: 'Use Cabinet Policy' },
  { value: 2, label: 'Dual Auth — Any User / Admin' },
  { value: 3, label: 'Dual Auth — Same Asset User / Admin' },
  { value: 4, label: 'Dual Auth — Admin Only' },
  { value: 5, label: 'Dual Auth — Authorizer Only' },
];

const RETURN_BEFORE_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Use Time Constraints' },
  { value: '2', label: 'Return Within (HH:MM)' },
];

function validateReturnWithin(value: string): string {
  const v = value.trim();
  if (!v) return 'Return within time is required.';
  const match = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 'Format must be HH:MM (e.g. 08:00).';
  const h = parseInt(match[1]), m = parseInt(match[2]);
  if (m > 59) return 'Minutes must be 00–59.';
  if (h > 47) return 'Hours must not exceed 47.';
  if (h === 0 && m < 15) return 'Minimum return time is 00:15.';
  return '';
}

function AssetForm({
  initial, existingAssets, onSave, onCancel, loading,
}: {
  initial?: AssetResponse;
  existingAssets: AssetResponse[];
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
  const [returnBefore, setReturnBefore] = useState(initial?.returnBefore ?? '0');
  const [returnWithin, setReturnWithin] = useState(initial?.returnWithin ?? '');
  const [fixedSlot, setFixedSlot] = useState<number | ''>(initial?.fixedSlot ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateName(value: string, locId: number): string {
    const v = value.trim();
    if (!v) return 'Name is required.';
    if (v.length < 3) return 'Name must be at least 3 characters.';
    if (v.length > 20) return 'Name must not exceed 20 characters.';
    if (!/^[a-zA-Z0-9\s]+$/.test(v)) return 'Name must contain only letters, numbers, and spaces.';
    const dup = existingAssets.find(
      (a) => a.name.toLowerCase() === v.toLowerCase() && a.locationId === locId && a.id !== initial?.id,
    );
    if (dup) return 'Asset name already exists in this location.';
    return '';
  }

  function validateNumber(value: number, locId: number): string {
    if (!value || value < 1) return 'Number must be at least 1.';
    if (value > 99999999) return 'Number must not exceed 99999999.';
    const dup = existingAssets.find(
      (a) => a.number === value && a.locationId === locId && a.id !== initial?.id,
    );
    if (dup) return `Number ${value} already exists in this location.`;
    return '';
  }

  const setErr = (field: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));

  const handleReturnBeforeChange = (val: string) => {
    setReturnBefore(val);
    if (val !== '2') { setReturnWithin(''); setErr('returnWithin', ''); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateName(name, locationId);
    const numErr = validateNumber(number, locationId);
    const withinErr = returnBefore === '2' ? validateReturnWithin(returnWithin) : '';
    const next = { name: nameErr, number: numErr, returnWithin: withinErr };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSave({
      tagUid, number, name: name.trim(),
      shortKeyName: shortKeyName || undefined,
      details: details || undefined,
      type, locationId,
      withdrawPolicy,
      returnBefore,
      returnWithin: returnBefore === '2' ? returnWithin : undefined,
      fixedSlot: fixedSlot !== '' ? fixedSlot : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGrid>
        <FormField type="number" label="Tag UID" value={tagUid || ''} onChange={(e) => setTagUid(Number(e.target.value))} required min={1} />
        <FormField
          type="number"
          label="Number"
          value={number || ''}
          onChange={(e) => { setNumber(Number(e.target.value)); if (errors.number) setErr('number', ''); }}
          onBlur={() => setErr('number', validateNumber(number, locationId))}
          required
          min={1}
          max={99999999}
          error={errors.number}
        />
        <FormField
          label="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); if (errors.name) setErr('name', ''); }}
          onBlur={() => setErr('name', validateName(name, locationId))}
          required
          maxLength={20}
          wrapperClassName="col-span-full"
          error={errors.name}
        />
        <FormField label="Short Name" value={shortKeyName} onChange={(e) => setShortKeyName(e.target.value)} maxLength={20} />
        <FormSelect label="Type" value={type} onChange={(e) => setType(Number(e.target.value))} required>
          {Object.entries(ASSET_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </FormSelect>
        <FormSelect
          label="Location"
          value={locationId}
          onChange={(e) => {
            const lid = Number(e.target.value);
            setLocationId(lid);
            if (errors.name) setErr('name', validateName(name, lid));
            if (errors.number) setErr('number', validateNumber(number, lid));
          }}
          required
          wrapperClassName="col-span-full"
        >
          <option value={0} disabled>Select location…</option>
          {locations?.content.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </FormSelect>
        <FormSelect label="Withdraw Policy" value={withdrawPolicy} onChange={(e) => setWithdrawPolicy(Number(e.target.value))}>
          {WITHDRAW_POLICIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </FormSelect>
        <FormField type="number" label="Fixed Slot" value={fixedSlot} onChange={(e) => setFixedSlot(e.target.value === '' ? '' : Number(e.target.value))} min={1} />
        <FormSelect label="Return Policy" value={returnBefore} onChange={(e) => handleReturnBeforeChange(e.target.value)} wrapperClassName="col-span-full">
          {RETURN_BEFORE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FormSelect>
        {returnBefore === '2' && (
          <FormField
            label="Return Within"
            value={returnWithin}
            onChange={(e) => { setReturnWithin(e.target.value); if (errors.returnWithin) setErr('returnWithin', ''); }}
            onBlur={() => setErr('returnWithin', validateReturnWithin(returnWithin))}
            placeholder="HH:MM"
            maxLength={5}
            hint="Max 47:00, min 00:15"
            wrapperClassName="col-span-full"
            error={errors.returnWithin}
          />
        )}
        <FormTextarea label="Details" value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={100} wrapperClassName="col-span-full" />
      </FormGrid>
      <FormActions onCancel={onCancel} loading={loading} submitLabel={initial ? 'Update' : 'Create'} />
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
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const selectedLocation = useAppSelector(selectSelectedLocation);
  const [locationFilter, setLocationFilter] = useState<number>(selectedLocation?.id ?? 0);

  useEffect(() => {
    setLocationFilter(selectedLocation?.id ?? 0);
    setPage(0);
    setSelected(null);
  }, [selectedLocation]);
  const [selected, setSelected] = useState<AssetResponse | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetResponse | null>(null);
  const [historyAsset, setHistoryAsset] = useState<AssetResponse | null>(null);
  const [confirm, setConfirm] = useState<{ asset: AssetResponse; action: 'disable' | 'restore' } | null>(null);

  const { data: pagedData, isLoading: loadingPaged } = useListAssetsQuery(
    { page, size: 20, includeDisabled },
    { skip: !!locationFilter }
  );
  const { data: filteredData, isLoading: loadingFiltered } = useListAssetsByLocationQuery(
    locationFilter,
    { skip: !locationFilter }
  );

  const isLoading = loadingPaged || loadingFiltered;
  const rows = (locationFilter
    ? (filteredData?.filter((a) => includeDisabled || !a.disabled) ?? [])
    : (pagedData?.content ?? [])
  ).filter((a) => {
    if (filterName && !a.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterAssetType && String(a.type) !== filterAssetType) return false;
    return true;
  });

  const [create, { isLoading: creating }] = useCreateAssetMutation();
  const [update, { isLoading: updating }] = useUpdateAssetMutation();
  const [disable, { isLoading: disabling }] = useDisableAssetMutation();
  const [restore, { isLoading: restoring }] = useRestoreAssetMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (asset: AssetResponse) => { setEditing(asset); setModalOpen(true); };

  const handleSave = async (body: AssetRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Asset updated' : 'Asset created' });
      setModalOpen(false);
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Failed to save asset' });
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'disable') await disable(confirm.asset.id).unwrap();
      else await restore(confirm.asset.id).unwrap();
      addToast({ type: 'success', message: confirm.action === 'disable' ? 'Asset disabled' : 'Asset restored' });
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Action failed' });
    }
    setConfirm(null);
  };

  const cols = useMemo<ColDef<AssetResponse>[]>(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'number', headerName: '#', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      headerName: 'Type',
      width: 100,
      valueGetter: ({ data: d }) => d ? (ASSET_TYPES[d.type] ?? `Type ${d.type}`) : '',
    },
    { field: 'tagUid', headerName: 'Tag UID', width: 130 },
    {
      headerName: 'Status',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: AssetResponse }) => (
        d.disabled
          ? <span className="badge badge-ghost badge-sm">Disabled</span>
          : <span className="badge badge-success badge-sm">Active</span>
      ),
    },
    {
      headerName: 'Actions',
      width: 120,
      sortable: false,
      resizable: false,
      cellRenderer: ({ data: d }: { data: AssetResponse }) => (
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-xs text-primary"
            onClick={(e) => { e.stopPropagation(); navigate(`/assets/${d.id}`); }}>
            Detail
          </button>
          <button className="btn btn-ghost btn-xs text-secondary"
            onClick={(e) => { e.stopPropagation(); setHistoryAsset(d); }}>
            History
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_ASSET}
        title="Assets"
        resource="ASSET"
        onAdd={openCreate}
        onUpdate={() => selected && openEdit(selected)}
        onRestore={() => selected && setConfirm({ asset: selected, action: 'restore' })}
        onDisable={() => selected && setConfirm({ asset: selected, action: 'disable' })}
        updateDisabled={!selected}
        restoreDisabled={!selected || !selected.disabled}
        disableDisabled={!selected || selected.disabled}
        extra={
          <label className="label cursor-pointer gap-2" style={{ margin: 0, padding: 0 }}>
            <span className="label-text text-sm" style={{ color: 'var(--ent-dark)', opacity: 0.7 }}>Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm" checked={includeDisabled}
              onChange={(e) => { setIncludeDisabled(e.target.checked); setSelected(null); }} />
          </label>
        }
      />

      <div className="card bg-base-100 shadow" style={{ flex: 1, minHeight: 0 }}><div className="card-body p-0 overflow-hidden" style={{ flex: 1 }}>
        <DataGrid
          columnDefs={cols}
          rowData={rows}
          loading={isLoading}
          getRowId={(r) => String(r.id)}
          onRowClicked={(r) => setSelected(r)}
          onRowDoubleClicked={(r) => { setSelected(r); openEdit(r); }}
          exportable
          exportFilename="assets"
          height="100%"
          toolbar={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="input input-bordered input-xs"
                style={{ width: '140px' }}
                placeholder="Filter name…"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <select
                className="select select-bordered select-xs"
                style={{ width: '110px' }}
                value={filterAssetType}
                onChange={(e) => setFilterAssetType(e.target.value)}
              >
                <option value="">All Types</option>
                {Object.entries(ASSET_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          }
        />
      </div></div>

      <Modal open={modalOpen} title={editing ? 'Edit Asset' : 'New Asset'}
        onClose={() => setModalOpen(false)} size="lg">
        <AssetForm
          initial={editing ?? undefined}
          existingAssets={rows}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
          loading={creating || updating}
        />
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
