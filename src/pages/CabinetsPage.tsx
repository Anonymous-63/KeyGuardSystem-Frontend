import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useListCabinetsQuery,
  useListCabinetsByLocationQuery,
  useCreateCabinetMutation,
  useUpdateCabinetMutation,
  useDisableCabinetMutation,
  useRestoreCabinetMutation,
} from '../features/cabinet/cabinetApi';
import { useAppSelector } from '../app/hooks';
import { selectSelectedLocation } from '../features/location/locationSlice';
import { useListLocationsQuery } from '../features/location/locationApi';
import type { CabinetResponse, CabinetRequest } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PageHeader from '../components/shared/PageHeader';
import { useToast } from '../components/shared/Toast';
import { FormRow, FormField, FormGrid, FormSection, FormActions } from '../components/shared/Form';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';

const ICO_CABINET = [
  'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25',
  'M21 15V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25V15m18 0A2.25 2.25 0 0118.75 17.25H5.25A2.25 2.25 0 013 15',
];

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
  const [serverUrl, setServerUrl] = useState(initial?.serverUrl ?? '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ locationId, name, mac, ip, subnetMask, gateway,
        serverIp: serverIp || undefined, serverUrl: serverUrl || undefined });
    }} className="space-y-4">
      <FormSection title="Basic Info">
        <FormRow label="Location" required>
          <select className="select select-bordered w-full" value={locationId}
            onChange={(e) => setLocationId(Number(e.target.value))} required>
            <option value={0} disabled>Select location…</option>
            {locations?.content.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Name" required>
          <input className="input input-bordered w-full" value={name}
            onChange={(e) => setName(e.target.value)} required maxLength={30} />
        </FormRow>
      </FormSection>
      <FormSection title="Network">
        <FormGrid>
          <FormField label="MAC" value={mac} onChange={(e) => setMac(e.target.value)}
            required maxLength={17} placeholder="AA:BB:CC:DD:EE:FF" mono />
          <FormField label="IP" value={ip} onChange={(e) => setIp(e.target.value)}
            required maxLength={15} placeholder="192.168.1.100" mono />
          <FormField label="Subnet Mask" value={subnetMask} onChange={(e) => setSubnetMask(e.target.value)}
            required maxLength={15} placeholder="255.255.255.0" mono />
          <FormField label="Gateway" value={gateway} onChange={(e) => setGateway(e.target.value)}
            required maxLength={15} placeholder="192.168.1.1" mono />
          <FormField label="Server IP" value={serverIp} onChange={(e) => setServerIp(e.target.value)}
            maxLength={15} mono />
          <FormField label="Server URL" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
            maxLength={50} />
        </FormGrid>
      </FormSection>
      <FormActions onCancel={onCancel} loading={loading} submitLabel={initial ? 'Update' : 'Create'} />
    </form>
  );
}

export default function CabinetsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [selected, setSelected] = useState<CabinetResponse | null>(null);
  const [filterName, setFilterName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CabinetResponse | null>(null);
  const [confirm, setConfirm] = useState<{ cab: CabinetResponse; action: 'disable' | 'restore' } | null>(null);

  const selectedLocation = useAppSelector(selectSelectedLocation);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data: pagedData, isLoading: loadingPaged } = useListCabinetsQuery(
    { size: 500, includeDisabled },
    { skip: !!selectedLocation },
  );
  const { data: locationData, isLoading: loadingLocation } = useListCabinetsByLocationQuery(
    selectedLocation?.id ?? 0,
    { skip: !selectedLocation },
  );
  const isLoading = loadingPaged || loadingLocation;

  const [create, { isLoading: creating }] = useCreateCabinetMutation();
  const [update, { isLoading: updating }] = useUpdateCabinetMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetMutation();

  const locationName = (id: number) => locations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  const rows = (selectedLocation
    ? (locationData?.filter((c) => includeDisabled || !c.disabled) ?? [])
    : (pagedData?.content ?? [])
  ).filter((cab) => {
    if (filterName && !cab.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (cab: CabinetResponse) => { setEditing(cab); setModalOpen(true); };

  const handleSave = async (body: CabinetRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Cabinet updated' : 'Cabinet created' });
      setModalOpen(false);
      setSelected(null);
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
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Action failed' });
    }
    setConfirm(null);
  };

  const cols = useMemo<ColDef<CabinetResponse>[]>(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      headerName: 'Location',
      width: 120,
      valueGetter: ({ data: d }) => d ? locationName(d.locationId) : '',
    },
    { field: 'ip', headerName: 'IP', width: 120 },
    { field: 'mac', headerName: 'MAC', width: 130 },
    {
      headerName: 'Status',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: CabinetResponse }) => (
        d.disabled
          ? <span className="badge badge-ghost badge-sm">Disabled</span>
          : <span className="badge badge-success badge-sm">Active</span>
      ),
    },
    {
      headerName: 'Sync',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: CabinetResponse }) => {
        const s = SYNC_STATUS[d.syncStatus] ?? SYNC_STATUS[0];
        return <span className={`badge badge-xs ${s.cls}`}>{s.label}</span>;
      },
    },
    {
      headerName: 'Actions',
      width: 80,
      sortable: false,
      resizable: false,
      cellRenderer: ({ data: d }: { data: CabinetResponse }) => (
        <button
          className="btn btn-ghost btn-xs text-primary"
          onClick={(e) => { e.stopPropagation(); navigate(`/cabinets/${d.id}`); }}
        >
          Matrix
        </button>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [locations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_CABINET}
        title="Cabinets"
        resource="CABINET"
        onAdd={openCreate}
        onUpdate={() => selected && openEdit(selected)}
        onRestore={() => selected && setConfirm({ cab: selected, action: 'restore' })}
        onDisable={() => selected && setConfirm({ cab: selected, action: 'disable' })}
        updateDisabled={!selected}
        restoreDisabled={!selected || !selected.disabled}
        disableDisabled={!selected || selected.disabled}
        extra={
          <label className="label cursor-pointer gap-2" style={{ margin: 0, padding: 0 }}>
            <span className="label-text text-sm" style={{ color: 'var(--ent-dark)', opacity: 0.7 }}>
              Show disabled
            </span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={includeDisabled}
              onChange={(e) => { setIncludeDisabled(e.target.checked); setSelected(null); }}
            />
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
          exportFilename="cabinets"
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
