import { useState } from 'react';
import {
  useListTimeConstraintsQuery,
  useCreateTimeConstraintMutation,
  useUpdateTimeConstraintMutation,
  useDisableTimeConstraintMutation,
} from '../features/timeConstraint/timeConstraintApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import type {
  TimeConstraintResponse, TimeConstraintRequest, TimeConstraintDetailRequest,
} from '../types/api';
import { TIME_CONSTRAINT_TYPES, DAY_SHORT } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';

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
    initial?.details?.map((d) => ({ day: d.day, name: d.name, startTime: d.startTime, endTime: d.endTime })) ??
    [{ ...EMPTY_DETAIL }]
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
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Name *</span></label>
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
        <div className="form-control">
          <label className="label"><span className="label-text">Type</span></label>
          <select className="select select-bordered" value={type}
            onChange={(e) => setType(Number(e.target.value))}>
            {Object.entries(TIME_CONSTRAINT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {type === 4 && (
          <>
            <div className="form-control">
              <label className="label"><span className="label-text">From Date</span></label>
              <input type="date" className="input input-bordered" value={fromDate}
                onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">To Date</span></label>
              <input type="date" className="input input-bordered" value={toDate}
                min={fromDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* Schedule details */}
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
                  onChange={(e) => updateDetail(i, 'name', e.target.value)} />
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

export default function TimeConstraintsPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimeConstraintResponse | null>(null);
  const [confirm, setConfirm] = useState<TimeConstraintResponse | null>(null);

  const { data: locations } = useListLocationsQuery({ size: 200 });
  const { data, isLoading } = useListTimeConstraintsQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateTimeConstraintMutation();
  const [update, { isLoading: updating }] = useUpdateTimeConstraintMutation();
  const [disable, { isLoading: disabling }] = useDisableTimeConstraintMutation();

  const locationName = (id: number) => locations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (tc: TimeConstraintResponse) => { setEditing(tc); setModalOpen(true); };

  const handleSave = async (body: TimeConstraintRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Constraint updated' : 'Constraint created' });
      setModalOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to save constraint' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Time Constraints</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <PermissionGate resource="TIME_CONSTRAINT" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Constraint</button>
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
                <th>Type</th>
                <th>Windows</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={7} />}
              {!isLoading && data?.content.length === 0 && (
                <EmptyState colSpan={7} icon="⏰" title="No time constraints"
                  message="Constraints restrict when assets can be accessed." />
              )}
              {data?.content.map((tc) => (
                <tr key={tc.id}>
                  <td className="font-mono text-sm">{tc.id}</td>
                  <td className="font-medium">{tc.name}</td>
                  <td className="text-base-content/70">{locationName(tc.locationId)}</td>
                  <td>
                    <span className="badge badge-outline badge-sm">
                      {TIME_CONSTRAINT_TYPES[tc.type] ?? `Type ${tc.type}`}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-0.5">
                      {Array.from(new Set(tc.details.map((d) => d.day))).sort().map((day) => (
                        <span key={day} className="badge badge-neutral badge-xs">{DAY_SHORT[day]}</span>
                      ))}
                    </div>
                  </td>
                  <td><StatusBadge disabled={tc.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <PermissionGate resource="TIME_CONSTRAINT" action="UPDATE">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(tc)}>Edit</button>
                      </PermissionGate>
                      <PermissionGate resource="TIME_CONSTRAINT" action="DELETE">
                        {!tc.disabled && (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm(tc)}>Disable</button>
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

      <Modal open={modalOpen} title={editing ? 'Edit Time Constraint' : 'New Time Constraint'}
        onClose={() => setModalOpen(false)} size="lg">
        <ConstraintForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Disable Time Constraint"
        message={`Disable "${confirm?.name}"? Users assigned this constraint will lose time-based access control.`}
        confirmLabel="Disable"
        danger
        loading={disabling}
        onConfirm={async () => {
          if (confirm) {
            try {
              await disable(confirm.id).unwrap();
              addToast({ type: 'success', message: 'Constraint disabled' });
            } catch {
              addToast({ type: 'error', message: 'Failed to disable constraint' });
            }
            setConfirm(null);
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
