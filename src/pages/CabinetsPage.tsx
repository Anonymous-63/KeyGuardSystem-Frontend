import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useListCabinetsQuery,
  useCreateCabinetMutation,
  useUpdateCabinetMutation,
  useDisableCabinetMutation,
  useRestoreCabinetMutation,
} from '../features/cabinet/cabinetApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import type { CabinetResponse, CabinetRequest } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';

const SYNC_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Pending',     cls: 'badge-neutral' },
  1: { label: 'Synced',      cls: 'badge-success' },
  2: { label: 'Out of Sync', cls: 'badge-warning' },
  3: { label: 'Error',       cls: 'badge-error' },
};

function CabinetForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: CabinetResponse;
  onSave: (data: CabinetRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { data: locations } = useListLocationsQuery({ size: 200 });
  const [locationId, setLocationId] = useState<number>(initial?.locationId ?? 0);
  const [name, setName] = useState(initial?.name ?? '');
  const [mac, setMac] = useState(initial?.mac ?? '');
  const [ip, setIp] = useState(initial?.ip ?? '');
  const [subnetMask, setSubnetMask] = useState(initial?.subnetMask ?? '');
  const [gateway, setGateway] = useState(initial?.gateway ?? '');
  const [serverIp, setServerIp] = useState(initial?.serverIp ?? '');
  const [serverURL, setServerURL] = useState(initial?.serverURL ?? '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ locationId, name, mac, ip, subnetMask, gateway,
        serverIp: serverIp || undefined, serverURL: serverURL || undefined });
    }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
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
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Name *</span></label>
          <input className="input input-bordered" value={name}
            onChange={(e) => setName(e.target.value)} required maxLength={50} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">MAC *</span></label>
          <input className="input input-bordered font-mono" value={mac}
            onChange={(e) => setMac(e.target.value)} required maxLength={17}
            placeholder="AA:BB:CC:DD:EE:FF" />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">IP *</span></label>
          <input className="input input-bordered font-mono" value={ip}
            onChange={(e) => setIp(e.target.value)} required maxLength={15}
            placeholder="192.168.1.100" />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Subnet Mask *</span></label>
          <input className="input input-bordered font-mono" value={subnetMask}
            onChange={(e) => setSubnetMask(e.target.value)} required maxLength={15}
            placeholder="255.255.255.0" />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Gateway *</span></label>
          <input className="input input-bordered font-mono" value={gateway}
            onChange={(e) => setGateway(e.target.value)} required maxLength={15}
            placeholder="192.168.1.1" />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Server IP</span></label>
          <input className="input input-bordered font-mono" value={serverIp}
            onChange={(e) => setServerIp(e.target.value)} maxLength={15} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Server URL</span></label>
          <input className="input input-bordered" value={serverURL}
            onChange={(e) => setServerURL(e.target.value)} maxLength={200} />
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

export default function CabinetsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CabinetResponse | null>(null);
  const [confirm, setConfirm] = useState<{ cab: CabinetResponse; action: 'disable' | 'restore' } | null>(null);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data, isLoading } = useListCabinetsQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateCabinetMutation();
  const [update, { isLoading: updating }] = useUpdateCabinetMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetMutation();

  const locationName = (id: number) => locations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (cab: CabinetResponse) => { setEditing(cab); setModalOpen(true); };

  const handleSave = async (body: CabinetRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Cabinet updated' : 'Cabinet created' });
      setModalOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to save cabinet' });
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'disable') await disable(confirm.cab.id).unwrap();
      else await restore(confirm.cab.id).unwrap();
      addToast({ type: 'success', message: confirm.action === 'disable' ? 'Cabinet disabled' : 'Cabinet restored' });
    } catch {
      addToast({ type: 'error', message: 'Action failed' });
    }
    setConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Cabinets</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <PermissionGate resource="CABINET" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Cabinet</button>
          </PermissionGate>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>IP</th>
                <th>MAC</th>
                <th>Status</th>
                <th>Sync</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={8} />}
              {!isLoading && data?.content.length === 0 && (
                <EmptyState colSpan={8} icon="🗄️" title="No cabinets found" />
              )}
              {data?.content.map((cab) => (
                <tr key={cab.id}>
                  <td className="font-mono text-sm">{cab.id}</td>
                  <td className="font-medium">{cab.name}</td>
                  <td className="text-base-content/70">{locationName(cab.locationId)}</td>
                  <td className="font-mono text-sm">{cab.ip}</td>
                  <td className="font-mono text-sm text-base-content/70">{cab.mac}</td>
                  <td><StatusBadge disabled={cab.disabled} /></td>
                  <td>
                    <span className={`badge badge-xs ${(SYNC_STATUS[cab.syncStatus] ?? SYNC_STATUS[0]).cls}`}>
                      {(SYNC_STATUS[cab.syncStatus] ?? SYNC_STATUS[0]).label}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs text-primary"
                        onClick={() => navigate(`/cabinets/${cab.id}`)}>
                        Matrix
                      </button>
                      <PermissionGate resource="CABINET" action="UPDATE">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(cab)}>Edit</button>
                      </PermissionGate>
                      <PermissionGate resource="CABINET" action="DELETE">
                        {cab.disabled ? (
                          <button className="btn btn-ghost btn-xs text-success"
                            onClick={() => setConfirm({ cab, action: 'restore' })}>Restore</button>
                        ) : (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm({ cab, action: 'disable' })}>Disable</button>
                        )}
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={data.totalPages}
              totalElements={data.totalElements} size={20} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal open={modalOpen} title={editing ? 'Edit Cabinet' : 'New Cabinet'}
        onClose={() => setModalOpen(false)} size="lg">
        <CabinetForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable Cabinet' : 'Restore Cabinet'}
        message={
          confirm?.action === 'disable'
            ? `Disable cabinet "${confirm?.cab.name}"? It will stop syncing.`
            : `Restore cabinet "${confirm?.cab.name}"?`
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
