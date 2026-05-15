import { useMemo, useState } from 'react';
import {
  useListAssetGroupsQuery,
  useCreateAssetGroupMutation,
  useUpdateAssetGroupMutation,
  useDisableAssetGroupMutation,
  useRestoreAssetGroupMutation,
  useAddAssetToGroupMutation,
  useRemoveAssetFromGroupMutation,
} from '@/features/assetGroup/api/assetGroupApi';
import { useListLocationsQuery } from '@/features/location/api/locationApi';
import { useListAssetsByLocationQuery } from '@/features/asset/api/assetApi';
import type { AssetGroupResponse, AssetGroupRequest } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import PermissionGate from '@/shared/components/ui/PermissionGate';
import { useToast } from '@/shared/components/ui/Toast';
import { FormRow, FormActions } from '@/shared/components/form/Form';
import PageHeader from '@/shared/components/ui/PageHeader';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';

const ICO_ASSET_GROUP = [
  'M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75z',
  'M14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25z',
  'M3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z',
];

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
      <FormRow label="Group Name" required>
        <input className="input input-bordered w-full" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} />
      </FormRow>
      <FormRow label="Location" required>
        <select className="select select-bordered w-full" value={locationId} onChange={(e) => setLocationId(Number(e.target.value))} required>
          <option value={0} disabled>Select location…</option>
          {locations?.content.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </FormRow>
      <FormActions onCancel={onCancel} loading={loading} submitLabel={initial ? 'Update' : 'Create'} />
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
      <div className="flex justify-end pt-4 mt-2 border-t border-base-200">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function AssetGroupsPage() {
  const { addToast } = useToast();
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<AssetGroupResponse | null>(null);
  const [assigning, setAssigning] = useState<AssetGroupResponse | null>(null);
  const [selected, setSelected] = useState<AssetGroupResponse | null>(null);
  const [filterName, setFilterName] = useState('');
  const [confirm, setConfirm] = useState<{ g: AssetGroupResponse; action: 'disable' | 'restore' } | null>(null);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data, isLoading } = useListAssetGroupsQuery({ size: 500, includeDisabled });
  const [create, { isLoading: creating }] = useCreateAssetGroupMutation();
  const [update, { isLoading: updating }] = useUpdateAssetGroupMutation();
  const [disable, { isLoading: disabling }] = useDisableAssetGroupMutation();
  const [restore, { isLoading: restoring }] = useRestoreAssetGroupMutation();

  const locationName = (id: number) => locations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (g: AssetGroupResponse) => { setEditing(g); setModalOpen(true); };
  const openAssign = (g: AssetGroupResponse) => { setAssigning(g); setAssignOpen(true); };

  const rows = (data?.content ?? []).filter((item) => {
    if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (body: AssetGroupRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Group updated' : 'Group created' });
      setModalOpen(false);
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Failed to save group' });
    }
  };

  const cols = useMemo<ColDef<AssetGroupResponse>[]>(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      headerName: 'Location',
      width: 120,
      valueGetter: ({ data: d }) => d ? locationName(d.locationId) : '',
    },
    {
      headerName: 'Assets',
      width: 80,
      valueGetter: ({ data: d }) => d ? d.assetIds.length : 0,
    },
    {
      headerName: 'Status',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: AssetGroupResponse }) => (
        d.disabled
          ? <span className="badge badge-ghost badge-sm">Disabled</span>
          : <span className="badge badge-success badge-sm">Active</span>
      ),
    },
    {
      headerName: 'Actions',
      width: 80,
      sortable: false,
      resizable: false,
      cellRenderer: ({ data: d }: { data: AssetGroupResponse }) => (
        <PermissionGate resource="ASSET_GROUP" action="ASSIGN">
          <button className="btn btn-ghost btn-xs text-primary"
            onClick={(e) => { e.stopPropagation(); openAssign(d); }}>
            Assets
          </button>
        </PermissionGate>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [locations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_ASSET_GROUP}
        title="Asset Groups"
        resource="ASSET_GROUP"
        onAdd={openCreate}
        onUpdate={() => selected && openEdit(selected)}
        onRestore={() => selected && setConfirm({ g: selected, action: 'restore' })}
        onDisable={() => selected && setConfirm({ g: selected, action: 'disable' })}
        updateDisabled={!selected}
        restoreDisabled={!selected || !selected.disabled}
        disableDisabled={!selected || selected.disabled}
        extra={
          <label className="label cursor-pointer gap-2" style={{ margin: 0, padding: 0 }}>
            <span className="label-text text-sm" style={{ color: 'var(--ent-dark)', opacity: 0.7 }}>Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm" checked={includeDisabled} onChange={(e) => { setIncludeDisabled(e.target.checked); setSelected(null); }} />
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
          exportFilename="asset-groups"
          height="100%"
          toolbar={
            <input
              className="input input-bordered input-xs"
              style={{ width: '140px' }}
              placeholder="Filter name…"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          }
        />
      </div></div>

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
        title={confirm?.action === 'disable' ? 'Disable Asset Group' : 'Restore Asset Group'}
        message={
          confirm?.action === 'disable'
            ? `Disable group "${confirm?.g.name}"?`
            : `Restore group "${confirm?.g.name}"?`
        }
        confirmLabel={confirm?.action === 'disable' ? 'Disable' : 'Restore'}
        danger={confirm?.action === 'disable'}
        loading={disabling || restoring}
        onConfirm={async () => {
          if (confirm) {
            try {
              if (confirm.action === 'disable') await disable(confirm.g.id).unwrap();
              else await restore(confirm.g.id).unwrap();
              addToast({ type: 'success', message: confirm.action === 'disable' ? 'Group disabled' : 'Group restored' });
              setSelected(null);
            } catch {
              addToast({ type: 'error', message: 'Action failed' });
            }
            setConfirm(null);
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
