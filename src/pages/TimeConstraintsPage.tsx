import { useMemo, useState } from 'react';
import {
  useListTimeConstraintsQuery,
  useCreateTimeConstraintMutation,
  useUpdateTimeConstraintMutation,
  useDisableTimeConstraintMutation,
  useRestoreTimeConstraintMutation,
} from '../features/timeConstraint/timeConstraintApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import type {
  TimeConstraintResponse, TimeConstraintRequest, TimeConstraintDetailRequest,
} from '../types/api';
import { TIME_CONSTRAINT_TYPES, DAY_SHORT } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PageHeader from '../components/shared/PageHeader';
import { useToast } from '../components/shared/Toast';
import { FormRow, FormSection, FormActions } from '../components/shared/Form';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';

const ICO_CLOCK = ['M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'];

const EMPTY_DETAIL: TimeConstraintDetailRequest = { day: 0, name: '', startTime: '08:00', endTime: '17:00' };

function ConstraintForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: TimeConstraintResponse;
  onSave: (data: TimeConstraintRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { data: locations } = useListLocationsQuery({ size: 200 });
  const [name, setName] = useState(initial?.name ?? '');
  const [locationId, setLocationId] = useState<number>(initial?.locationId ?? 0);
  const [type, setType] = useState<number>(initial?.type ?? 1);
  const [fromDate, setFromDate] = useState(initial?.fromDate?.slice(0, 10) ?? '');
  const [toDate, setToDate] = useState(initial?.toDate?.slice(0, 10) ?? '');
  const [details, setDetails] = useState<TimeConstraintDetailRequest[]>(
    initial?.details?.map((d) => ({
      day: d.day,
      name: d.name,
      startTime: d.startTime.slice(0, 5),
      endTime: d.endTime.slice(0, 5),
    })) ?? [{ ...EMPTY_DETAIL }]
  );

  const addDetail = () => setDetails((prev) => [...prev, { ...EMPTY_DETAIL }]);
  const removeDetail = (i: number) => setDetails((prev) => prev.filter((_, idx) => idx !== i));
  const updateDetail = (i: number, field: keyof TimeConstraintDetailRequest, value: string | number) =>
    setDetails((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ name, locationId, type, fromDate: fromDate || undefined, toDate: toDate || undefined, details });
    }} className="space-y-4">
      <FormSection title="General">
        <FormRow label="Name" required>
          <input className="input input-bordered w-full" value={name}
            onChange={(e) => setName(e.target.value)} required maxLength={20} />
        </FormRow>
        <FormRow label="Location" required>
          <select className="select select-bordered w-full" value={locationId}
            onChange={(e) => setLocationId(Number(e.target.value))} required>
            <option value={0} disabled>Select location…</option>
            {locations?.content.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Type">
          <select className="select select-bordered w-full" value={type}
            onChange={(e) => setType(Number(e.target.value))}>
            {Object.entries(TIME_CONSTRAINT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormRow>
        {type === 4 && (
          <FormRow label="Date Range">
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="date" className="input input-bordered flex-1" value={fromDate}
                onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="input input-bordered flex-1" value={toDate}
                min={fromDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </FormRow>
        )}
      </FormSection>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Time Windows</p>
          <button type="button" className="btn btn-xs btn-ghost text-primary" onClick={addDetail}>+ Add</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {details.map((d, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-end bg-base-200 rounded-lg p-2">
              <div className="col-span-3">
                <label className="label py-0"><span className="label-text text-xs">Day</span></label>
                <select className="select select-bordered select-xs w-full" value={d.day}
                  onChange={(e) => updateDetail(i, 'day', Number(e.target.value))}>
                  {DAY_SHORT.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="label py-0"><span className="label-text text-xs">Name</span></label>
                <input className="input input-bordered input-xs w-full" value={d.name}
                  onChange={(e) => updateDetail(i, 'name', e.target.value)} maxLength={50} />
              </div>
              <div className="col-span-2">
                <label className="label py-0"><span className="label-text text-xs">From</span></label>
                <input type="time" className="input input-bordered input-xs w-full" value={d.startTime}
                  onChange={(e) => updateDetail(i, 'startTime', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label py-0"><span className="label-text text-xs">To</span></label>
                <input type="time" className="input input-bordered input-xs w-full" value={d.endTime}
                  onChange={(e) => updateDetail(i, 'endTime', e.target.value)} />
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="button" className="btn btn-xs btn-ghost text-error"
                  onClick={() => removeDetail(i)} disabled={details.length <= 1}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormActions onCancel={onCancel} loading={loading} submitLabel={initial ? 'Update' : 'Create'} />
    </form>
  );
}

export default function TimeConstraintsPage() {
  const { addToast } = useToast();
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [selected, setSelected] = useState<TimeConstraintResponse | null>(null);
  const [filterName, setFilterName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimeConstraintResponse | null>(null);
  const [confirm, setConfirm] = useState<{ tc: TimeConstraintResponse; action: 'disable' | 'restore' } | null>(null);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data, isLoading } = useListTimeConstraintsQuery({ size: 500, includeDisabled });
  const [create, { isLoading: creating }] = useCreateTimeConstraintMutation();
  const [update, { isLoading: updating }] = useUpdateTimeConstraintMutation();
  const [disable, { isLoading: disabling }] = useDisableTimeConstraintMutation();
  const [restore, { isLoading: restoring }] = useRestoreTimeConstraintMutation();

  const locationName = (id: number) => locations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  const rows = (data?.content ?? []).filter((tc) => {
    if (filterName && !tc.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (tc: TimeConstraintResponse) => { setEditing(tc); setModalOpen(true); };

  const handleSave = async (body: TimeConstraintRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Constraint updated' : 'Constraint created' });
      setModalOpen(false);
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Failed to save constraint' });
    }
  };

  const cols = useMemo<ColDef<TimeConstraintResponse>[]>(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      headerName: 'Location',
      width: 120,
      valueGetter: ({ data: d }) => d ? locationName(d.locationId) : '',
    },
    {
      headerName: 'Type',
      width: 100,
      valueGetter: ({ data: d }) => d ? (TIME_CONSTRAINT_TYPES[d.type] ?? `Type ${d.type}`) : '',
    },
    {
      headerName: 'Windows',
      width: 140,
      sortable: false,
      valueGetter: ({ data: d }) => {
        if (!d) return '';
        const unique = Array.from(new Set(d.details.map((det) => det.day))).sort();
        return unique.map((day) => {
          const det = d.details.find((x) => x.day === day);
          return det
            ? `${DAY_SHORT[day]} ${det.startTime.slice(0, 5)}-${det.endTime.slice(0, 5)}`
            : DAY_SHORT[day];
        }).join(', ');
      },
    },
    {
      headerName: 'Status',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: TimeConstraintResponse }) => (
        d.disabled
          ? <span className="badge badge-ghost badge-sm">Disabled</span>
          : <span className="badge badge-success badge-sm">Active</span>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [locations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_CLOCK}
        title="Time Constraints"
        resource="TIME_CONSTRAINT"
        onAdd={openCreate}
        onUpdate={() => selected && openEdit(selected)}
        onRestore={() => selected && setConfirm({ tc: selected, action: 'restore' })}
        onDisable={() => selected && setConfirm({ tc: selected, action: 'disable' })}
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
          exportFilename="time-constraints"
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

      <Modal open={modalOpen} title={editing ? 'Edit Time Constraint' : 'New Time Constraint'}
        onClose={() => setModalOpen(false)} size="lg">
        <ConstraintForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable Time Constraint' : 'Restore Time Constraint'}
        message={
          confirm?.action === 'disable'
            ? `Disable "${confirm?.tc.name}"? Users assigned this constraint will lose time-based access control.`
            : `Restore "${confirm?.tc.name}"?`
        }
        confirmLabel={confirm?.action === 'disable' ? 'Disable' : 'Restore'}
        danger={confirm?.action === 'disable'}
        loading={disabling || restoring}
        onConfirm={async () => {
          if (confirm) {
            try {
              if (confirm.action === 'disable') await disable(confirm.tc.id).unwrap();
              else await restore(confirm.tc.id).unwrap();
              addToast({ type: 'success', message: confirm.action === 'disable' ? 'Constraint disabled' : 'Constraint restored' });
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
