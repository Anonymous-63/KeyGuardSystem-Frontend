import { useState } from 'react';
import {
  useListAssetGroupsQuery,
  useCreateAssetGroupMutation,
  useUpdateAssetGroupMutation,
  useDisableAssetGroupMutation,
  useAddAssetToGroupMutation,
  useRemoveAssetFromGroupMutation,
} from '../features/assetGroup/assetGroupApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import { useListAssetsByLocationQuery } from '../features/asset/assetApi';
import type { AssetGroupResponse, AssetGroupRequest } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';

function GroupForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: AssetGroupResponse;
  onSave: (data: AssetGroupRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { data: locations } = useListLocationsQuery({ size: 200 });
  const [name, setName] = useState(initial?.name ?? '');
  const [locationId, setLocationId] = useState<number>(initial?.locationId ?? 0);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ name, locationId }); }} className="space-y-3">
      <div className="form-control">
        <label className="label"><span className="label-text">Group Name *</span></label>
        <input className="input input-bordered" value={name}
          onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">Location *</span></label>
        <select className="select select-bordered" value={locationId}
          onChange={(e) => setLocationId(Number(e.target.value))} required>
          <option value={0} disabled>Select location…</option>
          {locations?.content.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
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

function AssetAssignmentPanel({ group, onClose }: { group: AssetGroupResponse; onClose: () => void }) {
  const { addToast } = useToast();
  const { data: assets } = useListAssetsByLocationQuery(group.locationId);
  const [add, { isLoading: adding }] = useAddAssetToGroupMutation();
  const [remove, { isLoading: removing }] = useRemoveAssetFromGroupMutation();

  const assigned = new Set(group.assetIds);
  const unassigned = assets?.filter((a) => !assigned.has(a.id) && !a.disabled) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2 text-base-content/70">
          Assigned Assets ({group.assetIds.length})
        </p>
        {group.assetIds.length === 0 ? (
          <p className="text-sm text-base-content/40 italic">No assets assigned</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {group.assetIds.map((assetId) => {
              const asset = assets?.find((a) => a.id === assetId);
              return (
                <span key={assetId} className="badge badge-primary gap-1">
                  {asset?.name ?? `#${assetId}`}
                  <PermissionGate resource="ASSET_GROUP" action="ASSIGN">
                    <button
                      className="text-xs opacity-70 hover:opacity-100"
                      disabled={removing}
                      onClick={async () => {
                        try {
                          await remove({ groupId: group.id, assetId }).unwrap();
                          addToast({ type: 'success', message: 'Asset removed from group' });
                        } catch {
                          addToast({ type: 'error', message: 'Failed to remove asset' });
                        }
                      }}
                    >✕</button>
                  </PermissionGate>
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium mb-2 text-base-content/70">
          Available Assets ({unassigned.length})
        </p>
        <PermissionGate resource="ASSET_GROUP" action="ASSIGN">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {unassigned.length === 0 ? (
              <p className="text-sm text-base-content/40 italic">All assets assigned</p>
            ) : (
              unassigned.map((asset) => (
                <div key={asset.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-base-200">
                  <span className="text-sm">{asset.name} <span className="text-base-content/50">#{asset.number}</span></span>
                  <button
                    className="btn btn-xs btn-primary"
                    disabled={adding}
                    onClick={async () => {
                      try {
                        await add({ groupId: group.id, assetId: asset.id }).unwrap();
                        addToast({ type: 'success', message: 'Asset added to group' });
                      } catch {
                        addToast({ type: 'error', message: 'Failed to add asset' });
                      }
                    }}
                  >Add</button>
                </div>
              ))
            )}
          </div>
        </PermissionGate>
      </div>
      <div className="modal-action">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function AssetGroupsPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<AssetGroupResponse | null>(null);
  const [assigning, setAssigning] = useState<AssetGroupResponse | null>(null);
  const [confirm, setConfirm] = useState<AssetGroupResponse | null>(null);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data, isLoading } = useListAssetGroupsQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateAssetGroupMutation();
  const [update, { isLoading: updating }] = useUpdateAssetGroupMutation();
  const [disable, { isLoading: disabling }] = useDisableAssetGroupMutation();

  const locationName = (id: number) => locations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (g: AssetGroupResponse) => { setEditing(g); setModalOpen(true); };
  const openAssign = (g: AssetGroupResponse) => { setAssigning(g); setAssignOpen(true); };

  const handleSave = async (body: AssetGroupRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Group updated' : 'Group created' });
      setModalOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to save group' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Asset Groups</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <PermissionGate resource="ASSET_GROUP" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Group</button>
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
                <th>Assets</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={6} />}
              {!isLoading && data?.content.length === 0 && (
                <EmptyState colSpan={6} icon="📦" title="No asset groups"
                  message="Groups bundle assets for batch assignment to users." />
              )}
              {data?.content.map((g) => (
                <tr key={g.id}>
                  <td className="font-mono text-sm">{g.id}</td>
                  <td className="font-medium">{g.name}</td>
                  <td className="text-base-content/70">{locationName(g.locationId)}</td>
                  <td>
                    <span className="badge badge-neutral badge-sm">{g.assetIds.length} assets</span>
                  </td>
                  <td><StatusBadge disabled={g.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <PermissionGate resource="ASSET_GROUP" action="ASSIGN">
                        <button className="btn btn-ghost btn-xs text-primary"
                          onClick={() => openAssign(g)}>Assets</button>
                      </PermissionGate>
                      <PermissionGate resource="ASSET_GROUP" action="UPDATE">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(g)}>Edit</button>
                      </PermissionGate>
                      <PermissionGate resource="ASSET_GROUP" action="DELETE">
                        {!g.disabled && (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm(g)}>Disable</button>
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

      <Modal open={modalOpen} title={editing ? 'Edit Asset Group' : 'New Asset Group'}
        onClose={() => setModalOpen(false)}>
        <GroupForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <Modal open={assignOpen && !!assigning}
        title={`Manage Assets — ${assigning?.name}`}
        onClose={() => setAssignOpen(false)} size="md">
        {assigning && (
          <AssetAssignmentPanel group={assigning} onClose={() => setAssignOpen(false)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Disable Asset Group"
        message={`Disable group "${confirm?.name}"?`}
        confirmLabel="Disable"
        danger
        loading={disabling}
        onConfirm={async () => {
          if (confirm) {
            try {
              await disable(confirm.id).unwrap();
              addToast({ type: 'success', message: 'Group disabled' });
            } catch {
              addToast({ type: 'error', message: 'Failed to disable group' });
            }
            setConfirm(null);
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
