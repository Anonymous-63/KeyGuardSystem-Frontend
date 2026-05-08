import { useState } from 'react';
import {
  useListLocationsQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDisableLocationMutation,
  useRestoreLocationMutation,
  useListLocationOperatorsQuery,
  useAssignOperatorToLocationMutation,
  useRemoveOperatorFromLocationMutation,
} from '../features/location/locationApi';
import { useListOperatorsQuery } from '../features/operator/operatorApi';
import type { LocationResponse, LocationRequest } from '../types/api';
import { LOCATION_ASSET_TYPES, LOCATION_CABINET_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';
import { FormField, FormSelect, FormGrid, FormActions } from '../components/shared/Form';

function LocationForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: LocationResponse;
  onSave: (data: LocationRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [assetType, setAssetType] = useState<number>(initial?.assetType ?? 1);
  const [cabinetType, setCabinetType] = useState<number>(initial?.cabinetType ?? 0);
  const [features, setFeatures] = useState(initial?.features ?? '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ name, assetType, cabinetType, features: features || undefined }); }} className="space-y-4">
      <FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
      <FormGrid>
        <FormSelect label="Asset Type" value={assetType} onChange={(e) => setAssetType(Number(e.target.value))} required>
          {Object.entries(LOCATION_ASSET_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </FormSelect>
        <FormSelect label="Cabinet Type" value={cabinetType} onChange={(e) => setCabinetType(Number(e.target.value))} required>
          {Object.entries(LOCATION_CABINET_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </FormSelect>
      </FormGrid>
      <FormField label="Features" value={features} onChange={(e) => setFeatures(e.target.value)} maxLength={200} />
      <FormActions onCancel={onCancel} loading={loading} submitLabel={initial ? 'Update' : 'Create'} />
    </form>
  );
}

function LocationOperatorsPanel({ locationId, locationName }: { locationId: number; locationName: string }) {
  const { addToast } = useToast();
  const [selectedOpId, setSelectedOpId] = useState('');
  const { data: assigned, isLoading } = useListLocationOperatorsQuery(locationId);
  const { data: allOps } = useListOperatorsQuery({ size: 200 });
  const [assign, { isLoading: assigning }] = useAssignOperatorToLocationMutation();
  const [remove, { isLoading: removing }] = useRemoveOperatorFromLocationMutation();

  const assignedIds = new Set(assigned?.map((o) => o.operatorId) ?? []);
  const available = allOps?.content.filter((o) => !o.disabled && !assignedIds.has(o.id)) ?? [];

  const handleAssign = async () => {
    if (!selectedOpId) return;
    try {
      await assign({ locationId, body: { operatorId: selectedOpId } }).unwrap();
      addToast({ type: 'success', message: 'Operator assigned' });
      setSelectedOpId('');
    } catch {
      addToast({ type: 'error', message: 'Failed to assign operator' });
    }
  };

  const handleRemove = async (operatorId: string) => {
    try {
      await remove({ locationId, operatorId }).unwrap();
      addToast({ type: 'success', message: 'Operator removed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove operator' });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/60">
        Operators assigned to <span className="font-semibold text-base-content">{locationName}</span>
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <span className="loading loading-spinner loading-sm text-primary" />
        </div>
      ) : !assigned?.length ? (
        <p className="text-sm text-base-content/40 text-center py-4 italic">No operators assigned</p>
      ) : (
        <div className="divide-y divide-base-200">
          {assigned.map((op) => (
            <div key={op.operatorId} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{op.operatorName}</p>
                <p className="text-xs text-base-content/50 font-mono">{op.operatorId}</p>
              </div>
              <PermissionGate resource="LOCATION" action="ASSIGN">
                <button
                  className="btn btn-ghost btn-xs text-error"
                  disabled={removing}
                  onClick={() => handleRemove(op.operatorId)}
                >
                  Remove
                </button>
              </PermissionGate>
            </div>
          ))}
        </div>
      )}

      <PermissionGate resource="LOCATION" action="ASSIGN">
        <div className="border-t border-base-200 pt-3">
          <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Assign Operator</p>
          <div className="flex gap-2">
            <select
              className="select select-bordered select-sm flex-1"
              value={selectedOpId}
              onChange={(e) => setSelectedOpId(e.target.value)}
            >
              <option value="">Select operator…</option>
              {available.map((op) => (
                <option key={op.id} value={op.id}>{op.name} ({op.id})</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              disabled={!selectedOpId || assigning}
              onClick={handleAssign}
            >
              {assigning && <span className="loading loading-spinner loading-xs" />}
              Assign
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

export default function LocationsPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationResponse | null>(null);
  const [confirm, setConfirm] = useState<{ loc: LocationResponse; action: 'disable' | 'restore' } | null>(null);
  const [operatorsLoc, setOperatorsLoc] = useState<LocationResponse | null>(null);

  const { data, isLoading } = useListLocationsQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateLocationMutation();
  const [update, { isLoading: updating }] = useUpdateLocationMutation();
  const [disable, { isLoading: disabling }] = useDisableLocationMutation();
  const [restore, { isLoading: restoring }] = useRestoreLocationMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (loc: LocationResponse) => { setEditing(loc); setModalOpen(true); };

  const handleSave = async (body: LocationRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Location updated' : 'Location created' });
      setModalOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to save location' });
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'disable') await disable(confirm.loc.id).unwrap();
      else await restore(confirm.loc.id).unwrap();
      addToast({ type: 'success', message: confirm.action === 'disable' ? 'Location disabled' : 'Location restored' });
    } catch {
      addToast({ type: 'error', message: 'Action failed' });
    }
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
          <PermissionGate resource="LOCATION" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Location</button>
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
                <th>Asset Type</th>
                <th>Cabinet Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-8">
                  <span className="loading loading-spinner" />
                </td></tr>
              )}
              {!isLoading && data?.content.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-base-content/50">No locations found</td></tr>
              )}
              {data?.content.map((loc) => (
                <tr key={loc.id}>
                  <td className="font-mono text-sm">{loc.id}</td>
                  <td className="font-medium">{loc.name}</td>
                  <td className="text-base-content/70">{loc.assetTypeName ?? LOCATION_ASSET_TYPES[loc.assetType] ?? '—'}</td>
                  <td className="text-base-content/70">{loc.cabinetTypeName ?? LOCATION_CABINET_TYPES[loc.cabinetType] ?? '—'}</td>
                  <td><StatusBadge disabled={loc.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs text-primary"
                        onClick={() => setOperatorsLoc(loc)}>Operators</button>
                      <PermissionGate resource="LOCATION" action="UPDATE">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(loc)}>Edit</button>
                      </PermissionGate>
                      <PermissionGate resource="LOCATION" action="DELETE">
                        {loc.disabled ? (
                          <button className="btn btn-ghost btn-xs text-success"
                            onClick={() => setConfirm({ loc, action: 'restore' })}>Restore</button>
                        ) : (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm({ loc, action: 'disable' })}>Disable</button>
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

      <Modal open={modalOpen} title={editing ? 'Edit Location' : 'New Location'} onClose={() => setModalOpen(false)}>
        <LocationForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <Modal open={!!operatorsLoc} title="Location Operators"
        onClose={() => setOperatorsLoc(null)} size="md">
        {operatorsLoc && (
          <LocationOperatorsPanel locationId={operatorsLoc.id} locationName={operatorsLoc.name} />
        )}
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
