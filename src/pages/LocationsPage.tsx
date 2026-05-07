import { useState } from 'react';
import {
  useListLocationsQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDisableLocationMutation,
  useRestoreLocationMutation,
} from '../features/location/locationApi';
import type { LocationResponse, LocationRequest } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';

function LocationForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: LocationResponse;
  onSave: (data: LocationRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ name, address }); }} className="space-y-3">
      <div className="form-control">
        <label className="label"><span className="label-text">Name *</span></label>
        <input className="input input-bordered" value={name}
          onChange={(e) => setName(e.target.value)} required maxLength={50} />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">Address</span></label>
        <input className="input input-bordered" value={address}
          onChange={(e) => setAddress(e.target.value)} maxLength={200} />
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

export default function LocationsPage() {
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationResponse | null>(null);
  const [confirm, setConfirm] = useState<{ loc: LocationResponse; action: 'disable' | 'restore' } | null>(null);

  const { data, isLoading } = useListLocationsQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateLocationMutation();
  const [update, { isLoading: updating }] = useUpdateLocationMutation();
  const [disable, { isLoading: disabling }] = useDisableLocationMutation();
  const [restore, { isLoading: restoring }] = useRestoreLocationMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (loc: LocationResponse) => { setEditing(loc); setModalOpen(true); };

  const handleSave = async (body: LocationRequest) => {
    if (editing) await update({ id: editing.id, body });
    else await create(body);
    setModalOpen(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.action === 'disable') await disable(confirm.loc.id);
    else await restore(confirm.loc.id);
    setConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Locations</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Location</button>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="text-center py-8">
                  <span className="loading loading-spinner" />
                </td></tr>
              )}
              {!isLoading && data?.content.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-base-content/50">No locations found</td></tr>
              )}
              {data?.content.map((loc) => (
                <tr key={loc.id}>
                  <td className="font-mono text-sm">{loc.id}</td>
                  <td className="font-medium">{loc.name}</td>
                  <td className="text-base-content/70">{loc.address ?? '—'}</td>
                  <td><StatusBadge disabled={loc.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs" onClick={() => openEdit(loc)}>Edit</button>
                      {loc.disabled ? (
                        <button className="btn btn-ghost btn-xs text-success"
                          onClick={() => setConfirm({ loc, action: 'restore' })}>Restore</button>
                      ) : (
                        <button className="btn btn-ghost btn-xs text-error"
                          onClick={() => setConfirm({ loc, action: 'disable' })}>Disable</button>
                      )}
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

      <Modal open={modalOpen} title={editing ? 'Edit Location' : 'New Location'} onClose={() => setModalOpen(false)}>
        <LocationForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable Location' : 'Restore Location'}
        message={
          confirm?.action === 'disable'
            ? `Disable "${confirm?.loc.name}"? It will no longer be selectable.`
            : `Restore "${confirm?.loc.name}"?`
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
