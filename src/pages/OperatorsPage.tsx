import { useState } from 'react';
import {
  useListOperatorsQuery,
  useCreateOperatorMutation,
  useUpdateOperatorMutation,
  useDisableOperatorMutation,
  useRestoreOperatorMutation,
  useChangePasswordMutation,
  useListLocationsForOperatorQuery,
} from '../features/operator/operatorApi';
import type { OperatorResponse, OperatorRequest } from '../types/api';
import { OPERATOR_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';

function OperatorForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: OperatorResponse;
  onSave: (data: OperatorRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [operatorId, setOperatorId] = useState(initial?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [type, setType] = useState<number>(initial?.type ?? 5);
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ operatorId, name, email: email || undefined, type, password }); }}
      className="space-y-3">
      <div className="form-control">
        <label className="label"><span className="label-text">Operator ID *</span></label>
        <input className="input input-bordered" value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          disabled={!!initial} required maxLength={30} />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">Name *</span></label>
        <input className="input input-bordered" value={name}
          onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">Email</span></label>
        <input type="email" className="input input-bordered" value={email}
          onChange={(e) => setEmail(e.target.value)} maxLength={100} />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">Type *</span></label>
        <select className="select select-bordered" value={type}
          onChange={(e) => setType(Number(e.target.value))}>
          {Object.entries(OPERATOR_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v} (Type {k})</option>
          ))}
        </select>
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">{initial ? 'New Password (leave blank to keep)' : 'Password *'}</span>
        </label>
        <input type="password" className="input input-bordered" value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!initial} minLength={6} maxLength={100} />
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

function OperatorLocationsPanel({ operatorId, operatorName }: { operatorId: string; operatorName: string }) {
  const { data: locations, isLoading } = useListLocationsForOperatorQuery(operatorId);

  return (
    <div className="space-y-3">
      <p className="text-sm text-base-content/60">
        Locations assigned to <span className="font-semibold text-base-content">{operatorName}</span>
      </p>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : !locations?.length ? (
        <p className="text-sm text-base-content/40 text-center py-6 italic">
          No locations assigned. Assign via Locations → Operators.
        </p>
      ) : (
        <div className="space-y-1">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-base-200">
              <span className="text-base">📍</span>
              <div>
                <p className="text-sm font-medium">{loc.name}</p>
                {loc.address && <p className="text-xs text-base-content/50">{loc.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangePasswordPanel({
  operatorId, onClose,
}: {
  operatorId: string;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) return;
    await changePassword({ id: operatorId, body: { newPassword } });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="form-control">
        <label className="label"><span className="label-text">New Password *</span></label>
        <input type="password" className="input input-bordered" value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} required minLength={6} maxLength={100} />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">Confirm Password *</span></label>
        <input type="password" className="input input-bordered" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
        {confirm && newPassword !== confirm && (
          <label className="label"><span className="label-text-alt text-error">Passwords do not match</span></label>
        )}
      </div>
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary"
          disabled={isLoading || !newPassword || newPassword !== confirm}>
          {isLoading && <span className="loading loading-spinner loading-xs" />}
          Set Password
        </button>
      </div>
    </form>
  );
}

export default function OperatorsPage() {
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorResponse | null>(null);
  const [confirm, setConfirm] = useState<{ op: OperatorResponse; action: 'disable' | 'restore' } | null>(null);
  const [locationsOp, setLocationsOp] = useState<OperatorResponse | null>(null);
  const [changePwdOp, setChangePwdOp] = useState<OperatorResponse | null>(null);

  const { data, isLoading } = useListOperatorsQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateOperatorMutation();
  const [update, { isLoading: updating }] = useUpdateOperatorMutation();
  const [disable, { isLoading: disabling }] = useDisableOperatorMutation();
  const [restore, { isLoading: restoring }] = useRestoreOperatorMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (op: OperatorResponse) => { setEditing(op); setModalOpen(true); };

  const handleSave = async (body: OperatorRequest) => {
    if (editing) await update({ id: editing.id, body });
    else await create(body);
    setModalOpen(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.action === 'disable') await disable(confirm.op.id);
    else await restore(confirm.op.id);
    setConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Web Operators</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <PermissionGate resource="OPERATOR" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Operator</button>
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
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={6} />}
              {!isLoading && data?.content.length === 0 && (
                <EmptyState colSpan={6} icon="👤" title="No operators found" />
              )}
              {data?.content.map((op) => (
                <tr key={op.id}>
                  <td className="font-mono text-sm">{op.id}</td>
                  <td className="font-medium">{op.name}</td>
                  <td className="text-base-content/70">{op.email ?? '—'}</td>
                  <td>
                    <span className="badge badge-outline badge-sm">
                      {OPERATOR_TYPES[op.type] ?? `Type ${op.type}`}
                    </span>
                  </td>
                  <td><StatusBadge disabled={op.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs text-primary"
                        onClick={() => setLocationsOp(op)}>
                        Locations
                      </button>
                      <PermissionGate resource="OPERATOR" action="UPDATE">
                        <button className="btn btn-ghost btn-xs"
                          onClick={() => openEdit(op)}>Edit</button>
                        <button className="btn btn-ghost btn-xs"
                          onClick={() => setChangePwdOp(op)}>Change Pwd</button>
                      </PermissionGate>
                      <PermissionGate resource="OPERATOR" action="DELETE">
                        {op.disabled ? (
                          <button className="btn btn-ghost btn-xs text-success"
                            onClick={() => setConfirm({ op, action: 'restore' })}>Restore</button>
                        ) : (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm({ op, action: 'disable' })}>Disable</button>
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

      <Modal open={modalOpen} title={editing ? 'Edit Operator' : 'New Operator'}
        onClose={() => setModalOpen(false)}>
        <OperatorForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <Modal open={!!locationsOp} title="Operator Locations"
        onClose={() => setLocationsOp(null)} size="sm">
        {locationsOp && (
          <OperatorLocationsPanel operatorId={locationsOp.id} operatorName={locationsOp.name} />
        )}
      </Modal>

      <Modal open={!!changePwdOp} title={`Change Password — ${changePwdOp?.name ?? ''}`}
        onClose={() => setChangePwdOp(null)} size="sm">
        {changePwdOp && (
          <ChangePasswordPanel operatorId={changePwdOp.id} onClose={() => setChangePwdOp(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable Operator' : 'Restore Operator'}
        message={
          confirm?.action === 'disable'
            ? `Disable "${confirm?.op.name}"? They will not be able to log in.`
            : `Restore "${confirm?.op.name}"?`
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
