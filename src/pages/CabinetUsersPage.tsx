import { useState } from 'react';
import {
  useListCabinetUsersQuery,
  useCreateCabinetUserMutation,
  useUpdateCabinetUserMutation,
  useDisableCabinetUserMutation,
  useRestoreCabinetUserMutation,
} from '../features/cabinetUser/cabinetUserApi';
import type { CabinetUserResponse, CabinetUserRequest } from '../types/api';
import { CABINET_USER_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import PermissionGate from '../components/PermissionGate';

function UserForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: CabinetUserResponse;
  onSave: (data: CabinetUserRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [userId, setUserId] = useState(initial?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [shortId, setShortId] = useState(initial?.shortId ?? '');
  const [shortName, setShortName] = useState(initial?.shortName ?? '');
  const [cardUid, setCardUid] = useState<number | ''>(initial?.cardUid ?? '');
  const [pin, setPin] = useState('');
  const [type, setType] = useState<number>(initial?.type ?? 0);
  const [email, setEmail] = useState(initial?.email ?? '');
  const [mobileNo, setMobileNo] = useState(initial?.mobileNo ?? '');
  const [division, setDivision] = useState(initial?.division ?? '');
  const [designation, setDesignation] = useState(initial?.designation ?? '');
  const [validFrom, setValidFrom] = useState(initial?.validFrom?.slice(0, 16) ?? '');
  const [validUpto, setValidUpto] = useState(initial?.validUpto?.slice(0, 16) ?? '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        userId, name, type,
        shortId: shortId || undefined,
        shortName: shortName || undefined,
        cardUid: cardUid !== '' ? cardUid : undefined,
        pin: pin || undefined,
        email: email || undefined,
        mobileNo: mobileNo || undefined,
        division: division || undefined,
        designation: designation || undefined,
        validFrom: validFrom || undefined,
        validUpto: validUpto || undefined,
      });
    }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text">User ID *</span></label>
          <input className="input input-bordered" value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={!!initial} required maxLength={20} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Type *</span></label>
          <select className="select select-bordered" value={type}
            onChange={(e) => setType(Number(e.target.value))}>
            {Object.entries(CABINET_USER_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-control col-span-2">
          <label className="label"><span className="label-text">Full Name *</span></label>
          <input className="input input-bordered" value={name}
            onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Short ID</span></label>
          <input className="input input-bordered" value={shortId}
            onChange={(e) => setShortId(e.target.value)} maxLength={10} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Short Name</span></label>
          <input className="input input-bordered" value={shortName}
            onChange={(e) => setShortName(e.target.value)} maxLength={20} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Card UID</span></label>
          <input type="number" className="input input-bordered font-mono" value={cardUid}
            onChange={(e) => setCardUid(e.target.value === '' ? '' : Number(e.target.value))} min={1} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">PIN</span></label>
          <input type="password" className="input input-bordered" value={pin}
            onChange={(e) => setPin(e.target.value)} maxLength={8}
            placeholder={initial ? '(leave blank to keep)' : ''} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Email</span></label>
          <input type="email" className="input input-bordered" value={email}
            onChange={(e) => setEmail(e.target.value)} maxLength={100} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Mobile No</span></label>
          <input className="input input-bordered" value={mobileNo}
            onChange={(e) => setMobileNo(e.target.value)} maxLength={15} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Division</span></label>
          <input className="input input-bordered" value={division}
            onChange={(e) => setDivision(e.target.value)} maxLength={50} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Designation</span></label>
          <input className="input input-bordered" value={designation}
            onChange={(e) => setDesignation(e.target.value)} maxLength={50} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Valid From</span></label>
          <input type="datetime-local" className="input input-bordered" value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Valid Until</span></label>
          <input type="datetime-local" className="input input-bordered" value={validUpto}
            min={validFrom} onChange={(e) => setValidUpto(e.target.value)} />
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

function TypeBadge({ type }: { type: number }) {
  const colors: Record<number, string> = {
    0: 'badge-neutral',
    1: 'badge-primary',
    2: 'badge-secondary',
    3: 'badge-accent',
  };
  return (
    <span className={`badge badge-sm ${colors[type] ?? 'badge-neutral'}`}>
      {CABINET_USER_TYPES[type] ?? `Type ${type}`}
    </span>
  );
}

export default function CabinetUsersPage() {
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CabinetUserResponse | null>(null);
  const [confirm, setConfirm] = useState<{ user: CabinetUserResponse; action: 'disable' | 'restore' } | null>(null);

  const { data, isLoading } = useListCabinetUsersQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateCabinetUserMutation();
  const [update, { isLoading: updating }] = useUpdateCabinetUserMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetUserMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetUserMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (user: CabinetUserResponse) => { setEditing(user); setModalOpen(true); };

  const handleSave = async (body: CabinetUserRequest) => {
    if (editing) await update({ id: editing.id, body });
    else await create(body);
    setModalOpen(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.action === 'disable') await disable(confirm.user.id);
    else await restore(confirm.user.id);
    setConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Cabinet Users</h1>
        <div className="flex items-center gap-3">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Show disabled</span>
            <input type="checkbox" className="toggle toggle-sm"
              checked={includeDisabled} onChange={(e) => setIncludeDisabled(e.target.checked)} />
          </label>
          <PermissionGate resource="CABINET_USER" action="CREATE">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add User</button>
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
                <th>Type</th>
                <th>Division</th>
                <th>Mobile</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <LoadingRow colSpan={8} />}
              {!isLoading && data?.content.length === 0 && (
                <EmptyState colSpan={8} icon="🧑" title="No cabinet users found"
                  message="Add users to allow them to access cabinets."
                  action={{ label: '+ Add User', onClick: openCreate }} />
              )}
              {data?.content.map((user) => (
                <tr key={user.id}>
                  <td className="font-mono text-sm">{user.id}</td>
                  <td>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      {user.shortName && <p className="text-xs text-base-content/50">{user.shortName}</p>}
                    </div>
                  </td>
                  <td><TypeBadge type={user.type} /></td>
                  <td className="text-base-content/70 text-sm">{user.division ?? '—'}</td>
                  <td className="font-mono text-sm">{user.mobileNo ?? '—'}</td>
                  <td className="text-sm text-base-content/70">
                    {user.validUpto ? new Date(user.validUpto).toLocaleDateString() : '—'}
                  </td>
                  <td><StatusBadge disabled={user.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <PermissionGate resource="CABINET_USER" action="UPDATE">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(user)}>Edit</button>
                      </PermissionGate>
                      <PermissionGate resource="CABINET_USER" action={user.disabled ? 'RESTORE' : 'DELETE'}>
                        {user.disabled ? (
                          <button className="btn btn-ghost btn-xs text-success"
                            onClick={() => setConfirm({ user, action: 'restore' })}>Restore</button>
                        ) : (
                          <button className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirm({ user, action: 'disable' })}>Disable</button>
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

      <Modal open={modalOpen} title={editing ? 'Edit Cabinet User' : 'New Cabinet User'}
        onClose={() => setModalOpen(false)} size="lg">
        <UserForm initial={editing ?? undefined} onSave={handleSave}
          onCancel={() => setModalOpen(false)} loading={creating || updating} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable User' : 'Restore User'}
        message={
          confirm?.action === 'disable'
            ? `Disable "${confirm?.user.name}"? They will lose cabinet access.`
            : `Restore access for "${confirm?.user.name}"?`
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
