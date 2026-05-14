import { useMemo, useState } from 'react';
import { useAppSelector } from '../app/hooks';
import { selectSelectedLocation } from '../features/location/locationSlice';
import {
  useListCabinetUsersQuery,
  useListCabinetUsersByLocationQuery,
  useCreateCabinetUserMutation,
  useUpdateCabinetUserMutation,
  useDisableCabinetUserMutation,
  useRestoreCabinetUserMutation,
  useGetCabinetUserLocationsQuery,
  useAssignLocationMutation,
  useRemoveLocationMutation,
  useGetUserAssetsQuery,
  useAssignUserAssetMutation,
  useRemoveUserAssetMutation,
  useGetUserAssetGroupsQuery,
  useAssignUserAssetGroupMutation,
  useRemoveUserAssetGroupMutation,
  useGetUserTimeConstraintsQuery,
  useAssignUserTimeConstraintMutation,
  useRemoveUserTimeConstraintMutation,
} from '../features/cabinetUser/cabinetUserApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import { useListAssetsByLocationQuery } from '../features/asset/assetApi';
import { useListTransactionsByUserQuery } from '../features/transaction/transactionApi';
import { useListAssetGroupsByLocationQuery } from '../features/assetGroup/assetGroupApi';
import { useListTimeConstraintsByLocationQuery } from '../features/timeConstraint/timeConstraintApi';
import type { CabinetUserResponse, CabinetUserRequest } from '../types/api';
import { CABINET_USER_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Tabs from '../components/shared/Tabs';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';
import { FormField, FormRow, FormGrid, FormActions } from '../components/shared/Form';
import PageHeader from '../components/shared/PageHeader';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';

const ICO_USERS = ['M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z'];

// ─── User Detail Modal ────────────────────────────────────────────────────────

type ManageTab = 'details' | 'locations' | 'assets' | 'groups' | 'constraints' | 'transactions';

function UserDetailsForm({
  initial, onSave, onCancel, loading,
}: {
  initial: CabinetUserResponse;
  onSave: (data: Partial<CabinetUserRequest>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [shortId, setShortId] = useState(initial.shortId ?? '');
  const [shortName, setShortName] = useState(initial.shortName ?? '');
  const [cardUid, setCardUid] = useState<number | ''>(initial.cardUid ?? '');
  const [pin, setPin] = useState('');
  const [emailId, setEmailId] = useState(initial.emailId ?? '');
  const [mobileNo, setMobileNo] = useState(initial.mobileNo ?? '');
  const [division, setDivision] = useState(initial.division ?? '');
  const [designation, setDesignation] = useState(initial.designation ?? '');
  const [address, setAddress] = useState(initial.address ?? '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        id: initial.id,
        name,
        shortId: shortId || undefined,
        shortName: shortName || undefined,
        cardUid: cardUid !== '' ? cardUid : undefined,
        pin: pin || undefined,
        emailId: emailId || undefined,
        mobileNo: mobileNo || undefined,
        division: division || undefined,
        designation: designation || undefined,
        address: address || undefined,
      });
    }} className="space-y-3">
      <FormRow label="User ID">
        <input className="input input-bordered w-full font-mono" value={initial.id} disabled />
      </FormRow>
      <FormRow label="Full Name" required>
        <input className="input input-bordered w-full" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
      </FormRow>
      <FormRow label="Short ID">
        <input className="input input-bordered w-full" value={shortId} onChange={(e) => setShortId(e.target.value)} maxLength={10} />
      </FormRow>
      <FormRow label="Short Name">
        <input className="input input-bordered w-full" value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={20} />
      </FormRow>
      <FormRow label="Card UID">
        <input type="number" className="input input-bordered w-full font-mono" value={cardUid} onChange={(e) => setCardUid(e.target.value === '' ? '' : Number(e.target.value))} />
      </FormRow>
      <FormRow label="PIN">
        <input type="password" className="input input-bordered w-full" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={8} placeholder="Leave blank to keep" />
      </FormRow>
      <FormRow label="Email">
        <input type="email" className="input input-bordered w-full" value={emailId} onChange={(e) => setEmailId(e.target.value)} maxLength={100} />
      </FormRow>
      <FormRow label="Mobile No">
        <input className="input input-bordered w-full" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} maxLength={15} />
      </FormRow>
      <FormRow label="Division">
        <input className="input input-bordered w-full" value={division} onChange={(e) => setDivision(e.target.value)} maxLength={50} />
      </FormRow>
      <FormRow label="Designation">
        <input className="input input-bordered w-full" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={50} />
      </FormRow>
      <FormRow label="Address">
        <input className="input input-bordered w-full" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
      </FormRow>
      <FormActions onCancel={onCancel} loading={loading} submitLabel="Save Changes" />
    </form>
  );
}

function LocationsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetCabinetUserLocationsQuery(userId);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const [assign, { isLoading: assigning }] = useAssignLocationMutation();
  const [remove, { isLoading: removing }] = useRemoveLocationMutation();
  const [selectedId, setSelectedId] = useState<number>(0);
  const [validFrom, setValidFrom] = useState('');

  const assignedLocationIds = new Set(assigned?.map((l) => l.locationId) ?? []);
  const available = allLocations?.content.filter((l) => !assignedLocationIds.has(l.id) && !l.disabled) ?? [];
  const getLocName = (id: number) => allLocations?.content.find((l) => l.id === id)?.name ?? `#${id}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-base-content/70 mb-2">
          Assigned Locations ({assigned?.length ?? 0})
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        ) : assigned?.length === 0 ? (
          <p className="text-sm text-base-content/40 italic py-2">No locations assigned yet.</p>
        ) : (
          <div className="space-y-1">
            {assigned?.map((loc) => (
              <div key={loc.locationId}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200">
                <div>
                  <span className="text-sm font-medium">📍 {getLocName(loc.locationId)}</span>
                  <div className="text-xs text-base-content/50 mt-0.5">
                    From {new Date(loc.validFrom).toLocaleDateString()}
                    {loc.validUpto && ` · Until ${new Date(loc.validUpto).toLocaleDateString()}`}
                    {loc.type != null && (
                      <span className="ml-2 badge badge-xs badge-outline">
                        {CABINET_USER_TYPES[loc.type] ?? `Type ${loc.type}`}
                      </span>
                    )}
                  </div>
                </div>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs text-error" disabled={removing}
                    onClick={async () => {
                      try {
                        await remove({ id: userId, locationId: loc.locationId }).unwrap();
                        addToast({ type: 'success', message: 'Location removed' });
                      } catch { addToast({ type: 'error', message: 'Failed to remove location' }); }
                    }}>Remove</button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </div>

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div className="border-t border-base-200 pt-4">
          <p className="text-sm font-medium text-base-content/70 mb-2">Add Location</p>
          {available.length === 0 ? (
            <p className="text-sm text-base-content/40 italic">All active locations already assigned.</p>
          ) : (
            <div className="space-y-2">
              <select className="select select-bordered select-sm w-full" value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}>
                <option value={0} disabled>Select location…</option>
                {available.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <div className="flex gap-2 items-end">
                <div className="form-control flex-1">
                  <label className="label py-0"><span className="label-text text-xs">Valid From *</span></label>
                  <input type="date" className="input input-bordered input-sm" value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm"
                  disabled={!selectedId || !validFrom || assigning}
                  onClick={async () => {
                    if (!selectedId || !validFrom) return;
                    try {
                      await assign({ id: userId, body: { locationId: selectedId, validFrom: `${validFrom}T00:00:00` } }).unwrap();
                      addToast({ type: 'success', message: 'Location assigned' });
                    } catch { addToast({ type: 'error', message: 'Failed to assign location' }); }
                    setSelectedId(0);
                    setValidFrom('');
                  }}>
                  {assigning ? <span className="loading loading-spinner loading-xs" /> : 'Assign'}
                </button>
              </div>
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

function AssetsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserAssetsQuery(userId);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const [assignAsset, { isLoading: assigning }] = useAssignUserAssetMutation();
  const [removeAsset, { isLoading: removing }] = useRemoveUserAssetMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [assetId, setAssetId] = useState<number>(0);

  const { data: locationAssets } = useListAssetsByLocationQuery(locationId, { skip: !locationId });
  const assignedAssetIds = new Set(assigned?.map((a) => a.assetId) ?? []);
  const availableAssets = locationAssets?.filter((a) => !assignedAssetIds.has(a.id) && !a.disabled) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-base-content/70 mb-2">
          Assigned Assets ({assigned?.length ?? 0})
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        ) : assigned?.length === 0 ? (
          <p className="text-sm text-base-content/40 italic py-2">No individual assets assigned.</p>
        ) : (
          <div className="space-y-1">
            {assigned?.map((ua) => (
              <div key={`${ua.assetId}-${ua.locationId}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200">
                <span className="text-sm">
                  🔑 {ua.assetName ?? `Asset #${ua.assetId}`}
                  {ua.assetNumber && <span className="text-base-content/50 ml-1">#{ua.assetNumber}</span>}
                </span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs text-error" disabled={removing}
                    onClick={async () => {
                      try {
                        await removeAsset({ userId, assetId: ua.assetId, locationId: ua.locationId }).unwrap();
                        addToast({ type: 'success', message: 'Asset removed' });
                      } catch { addToast({ type: 'error', message: 'Failed to remove asset' }); }
                    }}>
                    Remove
                  </button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </div>

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div className="border-t border-base-200 pt-4">
          <p className="text-sm font-medium text-base-content/70 mb-2">Add Asset</p>
          <div className="grid grid-cols-2 gap-2">
            <select className="select select-bordered select-sm" value={locationId}
              onChange={(e) => { setLocationId(Number(e.target.value)); setAssetId(0); }}>
              <option value={0} disabled>Select location…</option>
              {allLocations?.content.filter((l) => !l.disabled).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select className="select select-bordered select-sm" value={assetId}
              onChange={(e) => setAssetId(Number(e.target.value))} disabled={!locationId}>
              <option value={0} disabled>Select asset…</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} #{a.number}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end mt-2">
            <button className="btn btn-primary btn-sm"
              disabled={!assetId || !locationId || assigning}
              onClick={async () => {
                if (!assetId || !locationId) return;
                try {
                  await assignAsset({ userId, assetId, locationId }).unwrap();
                  addToast({ type: 'success', message: 'Asset assigned' });
                } catch { addToast({ type: 'error', message: 'Failed to assign asset' }); }
                setAssetId(0);
              }}>
              {assigning ? <span className="loading loading-spinner loading-xs" /> : 'Assign Asset'}
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

function GroupsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserAssetGroupsQuery(userId);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const [assignGroup, { isLoading: assigning }] = useAssignUserAssetGroupMutation();
  const [removeGroup, { isLoading: removing }] = useRemoveUserAssetGroupMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [groupId, setGroupId] = useState<number>(0);

  const { data: locationGroups } = useListAssetGroupsByLocationQuery(locationId, { skip: !locationId });
  const assignedGroupIds = new Set(assigned?.map((g) => g.groupId) ?? []);
  const availableGroups = locationGroups?.filter((g) => !assignedGroupIds.has(g.id) && !g.disabled) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-base-content/70 mb-2">
          Assigned Groups ({assigned?.length ?? 0})
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        ) : assigned?.length === 0 ? (
          <p className="text-sm text-base-content/40 italic py-2">No asset groups assigned.</p>
        ) : (
          <div className="space-y-1">
            {assigned?.map((ug) => (
              <div key={`${ug.groupId}-${ug.locationId}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200">
                <span className="text-sm">
                  📦 {ug.groupName ?? `Group #${ug.groupId}`}
                </span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs text-error" disabled={removing}
                    onClick={async () => {
                      try {
                        await removeGroup({ userId, groupId: ug.groupId, locationId: ug.locationId }).unwrap();
                        addToast({ type: 'success', message: 'Group removed' });
                      } catch { addToast({ type: 'error', message: 'Failed to remove group' }); }
                    }}>
                    Remove
                  </button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </div>

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div className="border-t border-base-200 pt-4">
          <p className="text-sm font-medium text-base-content/70 mb-2">Add Group</p>
          <div className="grid grid-cols-2 gap-2">
            <select className="select select-bordered select-sm" value={locationId}
              onChange={(e) => { setLocationId(Number(e.target.value)); setGroupId(0); }}>
              <option value={0} disabled>Select location…</option>
              {allLocations?.content.filter((l) => !l.disabled).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select className="select select-bordered select-sm" value={groupId}
              onChange={(e) => setGroupId(Number(e.target.value))} disabled={!locationId}>
              <option value={0} disabled>Select group…</option>
              {availableGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end mt-2">
            <button className="btn btn-primary btn-sm"
              disabled={!groupId || !locationId || assigning}
              onClick={async () => {
                if (!groupId || !locationId) return;
                try {
                  await assignGroup({ userId, groupId, locationId }).unwrap();
                  addToast({ type: 'success', message: 'Group assigned' });
                } catch { addToast({ type: 'error', message: 'Failed to assign group' }); }
                setGroupId(0);
              }}>
              {assigning ? <span className="loading loading-spinner loading-xs" /> : 'Assign Group'}
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

function TimeConstraintsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserTimeConstraintsQuery(userId);
  const [assignTC, { isLoading: assigning }] = useAssignUserTimeConstraintMutation();
  const [removeTC, { isLoading: removing }] = useRemoveUserTimeConstraintMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [tcId, setTcId] = useState<number>(0);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const { data: locationTCs } = useListTimeConstraintsByLocationQuery(locationId, { skip: !locationId });
  const assignedIds = new Set(assigned?.map((t) => t.timeConstraintId) ?? []);
  const availableTCs = locationTCs?.filter((t) => !assignedIds.has(t.id) && !t.disabled) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-base-content/70 mb-2">
          Assigned Time Constraints ({assigned?.length ?? 0})
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        ) : assigned?.length === 0 ? (
          <p className="text-sm text-base-content/40 italic py-2">No time constraints assigned. User has unrestricted access hours.</p>
        ) : (
          <div className="space-y-1">
            {assigned?.map((ut) => (
              <div key={ut.timeConstraintId}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200">
                <span className="text-sm">⏰ {ut.constraintName ?? `Constraint #${ut.timeConstraintId}`}</span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs text-error" disabled={removing}
                    onClick={async () => {
                      try {
                        await removeTC({ userId, timeConstraintId: ut.timeConstraintId }).unwrap();
                        addToast({ type: 'success', message: 'Constraint removed' });
                      } catch { addToast({ type: 'error', message: 'Failed to remove constraint' }); }
                    }}>
                    Remove
                  </button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </div>

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div className="border-t border-base-200 pt-4">
          <p className="text-sm font-medium text-base-content/70 mb-2">Add Time Constraint</p>
          <div className="grid grid-cols-2 gap-2">
            <select className="select select-bordered select-sm" value={locationId}
              onChange={(e) => { setLocationId(Number(e.target.value)); setTcId(0); }}>
              <option value={0} disabled>Select location…</option>
              {allLocations?.content.filter((l) => !l.disabled).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select className="select select-bordered select-sm" value={tcId}
              onChange={(e) => setTcId(Number(e.target.value))} disabled={!locationId}>
              <option value={0} disabled>Select constraint…</option>
              {availableTCs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end mt-2">
            <button className="btn btn-primary btn-sm"
              disabled={!tcId || assigning}
              onClick={async () => {
                if (!tcId) return;
                try {
                  await assignTC({ userId, timeConstraintId: tcId }).unwrap();
                  addToast({ type: 'success', message: 'Constraint assigned' });
                } catch { addToast({ type: 'error', message: 'Failed to assign constraint' }); }
                setTcId(0);
              }}>
              {assigning ? <span className="loading loading-spinner loading-xs" /> : 'Assign Constraint'}
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

function TransactionsTab({ userId }: { userId: string }) {
  const { data: txs, isLoading } = useListTransactionsByUserQuery(userId);

  return (
    <div>
      <p className="text-sm text-base-content/60 mb-3">
        Asset transaction history ({txs?.length ?? 0} records)
      </p>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : !txs?.length ? (
        <p className="text-sm text-base-content/40 text-center py-6 italic">No transactions found for this user.</p>
      ) : (
        <div className="overflow-x-auto max-h-80">
          <table className="table table-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>Asset</th>
                <th>Cabinet</th>
                <th>Issued At</th>
                <th>Returned At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => {
                const isOut = !tx.returnedAt;
                const isOverdue = !!tx.overdueMinutes && tx.overdueMinutes > 0 && isOut;
                return (
                  <tr key={tx.autoNo} className={isOverdue ? 'bg-error/5' : ''}>
                    <td className="font-mono text-xs text-base-content/50">{tx.autoNo}</td>
                    <td className="text-xs">
                      <p className="font-medium">{tx.assetName ?? `Asset #${tx.assetId}`}</p>
                      {tx.assetNumber && <p className="text-base-content/50">#{tx.assetNumber}</p>}
                    </td>
                    <td className="text-xs text-base-content/60">
                      {tx.issuedFromName ?? `Cabinet ${tx.issuedFrom}`}
                    </td>
                    <td className="text-xs">{new Date(tx.issuedAt).toLocaleString()}</td>
                    <td className="text-xs">
                      {tx.returnedAt ? new Date(tx.returnedAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      {tx.returnedAt
                        ? <span className="badge badge-success badge-xs">Returned</span>
                        : isOverdue
                          ? <span className="badge badge-error badge-xs">Overdue</span>
                          : <span className="badge badge-warning badge-xs">Out</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ManageUserModal({
  user, onClose,
}: {
  user: CabinetUserResponse;
  onClose: () => void;
}) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ManageTab>('details');
  const [update, { isLoading: updating }] = useUpdateCabinetUserMutation();
  const { data: locations } = useGetCabinetUserLocationsQuery(user.id);
  const { data: assets } = useGetUserAssetsQuery(user.id);
  const { data: groups } = useGetUserAssetGroupsQuery(user.id);
  const { data: constraints } = useGetUserTimeConstraintsQuery(user.id);
  const { data: txs } = useListTransactionsByUserQuery(user.id);

  const tabs = [
    { id: 'details',      label: 'Details',          icon: '👤' },
    { id: 'locations',    label: 'Locations',         icon: '📍', badge: locations?.length },
    { id: 'assets',       label: 'Assets',            icon: '🔑', badge: assets?.length },
    { id: 'groups',       label: 'Groups',            icon: '📦', badge: groups?.length },
    { id: 'constraints',  label: 'Time Constraints',  icon: '⏰', badge: constraints?.length },
    { id: 'transactions', label: 'Transactions',      icon: '📋', badge: txs?.length },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="avatar placeholder">
          <div className="bg-primary text-primary-content rounded-full w-10">
            <span className="text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <div>
          <p className="font-bold">{user.name}</p>
          <p className="text-xs font-mono text-base-content/50">{user.id}</p>
        </div>
        <StatusBadge disabled={user.disabled} />
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as ManageTab)} />

      <div className="min-h-[280px]">
        {activeTab === 'details' && (
          <UserDetailsForm initial={user}
            onSave={async (body) => {
              try {
                await update({ id: user.id, body }).unwrap();
                addToast({ type: 'success', message: 'User updated' });
              } catch { addToast({ type: 'error', message: 'Failed to update user' }); }
            }}
            onCancel={onClose} loading={updating} />
        )}
        {activeTab === 'locations' && <LocationsTab userId={user.id} />}
        {activeTab === 'assets' && <AssetsTab userId={user.id} />}
        {activeTab === 'groups' && <GroupsTab userId={user.id} />}
        {activeTab === 'constraints' && <TimeConstraintsTab userId={user.id} />}
        {activeTab === 'transactions' && <TransactionsTab userId={user.id} />}
      </div>
    </div>
  );
}

// ─── New User Form (simple, no tabs) ─────────────────────────────────────────

function NewUserForm({
  onSave, onCancel, loading,
}: {
  onSave: (data: CabinetUserRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [division, setDivision] = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        id, name,
        emailId: emailId || undefined,
        mobileNo: mobileNo || undefined,
        division: division || undefined,
        designation: designation || undefined,
        address: address || undefined,
      });
    }} className="space-y-4">
      <FormGrid>
        <FormField label="User ID" value={id} onChange={(e) => setId(e.target.value)} required maxLength={20} wrapperClassName="col-span-full" />
        <FormField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} wrapperClassName="col-span-full" />
        <FormField label="Division" value={division} onChange={(e) => setDivision(e.target.value)} maxLength={50} />
        <FormField label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={50} />
        <FormField type="email" label="Email" value={emailId} onChange={(e) => setEmailId(e.target.value)} maxLength={100} />
        <FormField label="Mobile No" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} maxLength={15} />
        <FormField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} wrapperClassName="col-span-full" />
      </FormGrid>
      <p className="text-xs text-base-content/50">
        After creating, use "Manage" to assign locations, assets, and time constraints.
      </p>
      <FormActions onCancel={onCancel} loading={loading} submitLabel="Create User" />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CabinetUsersPage() {
  const { addToast } = useToast();
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CabinetUserResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [managing, setManaging] = useState<CabinetUserResponse | null>(null);
  const [confirm, setConfirm] = useState<{ user: CabinetUserResponse; action: 'disable' | 'restore' } | null>(null);

  const selectedLocation = useAppSelector(selectSelectedLocation);

  const { data: pagedData, isLoading: loadingPaged } = useListCabinetUsersQuery(
    { size: 500, includeDisabled },
    { skip: !!selectedLocation },
  );
  const { data: locationData, isLoading: loadingLocation } = useListCabinetUsersByLocationQuery(
    selectedLocation?.id ?? 0,
    { skip: !selectedLocation },
  );
  const isLoading = loadingPaged || loadingLocation;

  const [create, { isLoading: creating }] = useCreateCabinetUserMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetUserMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetUserMutation();

  const baseRows = selectedLocation
    ? (locationData?.filter((u) => includeDisabled || !u.disabled) ?? [])
    : (pagedData?.content ?? []);
  const searchLower = search.trim().toLowerCase();
  const rows = searchLower
    ? baseRows.filter(
        (u) => u.name.toLowerCase().includes(searchLower) || u.id.toLowerCase().includes(searchLower)
      )
    : baseRows;

  const handleCreate = async (body: CabinetUserRequest) => {
    try {
      await create(body).unwrap();
      addToast({ type: 'success', message: 'User created' });
      setCreateOpen(false);
      setSelected(null);
    } catch { addToast({ type: 'error', message: 'Failed to create user' }); }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'disable') await disable(confirm.user.id).unwrap();
      else await restore(confirm.user.id).unwrap();
      addToast({ type: 'success', message: confirm.action === 'disable' ? 'User disabled' : 'User restored' });
      setSelected(null);
    } catch { addToast({ type: 'error', message: 'Action failed' }); }
    setConfirm(null);
  };

  const cols = useMemo<ColDef<CabinetUserResponse>[]>(() => [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      headerName: 'Division',
      width: 120,
      valueGetter: ({ data: d }) => d?.division ?? '—',
    },
    {
      headerName: 'Designation',
      width: 120,
      valueGetter: ({ data: d }) => d?.designation ?? '—',
    },
    {
      headerName: 'Mobile',
      width: 120,
      valueGetter: ({ data: d }) => d?.mobileNo ?? '—',
    },
    {
      headerName: 'Status',
      width: 90,
      sortable: false,
      cellRenderer: ({ data: d }: { data: CabinetUserResponse }) => (
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
      cellRenderer: ({ data: d }: { data: CabinetUserResponse }) => (
        <PermissionGate resource="CABINET_USER" action="UPDATE">
          <button className="btn btn-primary btn-xs"
            onClick={(e) => { e.stopPropagation(); setManaging(d); }}>
            Manage
          </button>
        </PermissionGate>
      ),
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_USERS}
        title="Cabinet Users"
        resource="CABINET_USER"
        onAdd={() => setCreateOpen(true)}
        onUpdate={() => selected && setManaging(selected)}
        onRestore={() => selected && setConfirm({ user: selected, action: 'restore' })}
        onDisable={() => selected && setConfirm({ user: selected, action: 'disable' })}
        updateDisabled={!selected}
        restoreDisabled={!selected || !selected.disabled}
        disableDisabled={!selected || selected.disabled}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="search" className="input input-bordered input-sm" style={{ width: '160px' }}
              placeholder="Search name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="label cursor-pointer gap-2" style={{ margin: 0, padding: 0 }}>
              <span className="label-text text-sm" style={{ color: 'var(--ent-dark)', opacity: 0.7 }}>Show disabled</span>
              <input type="checkbox" className="toggle toggle-sm" checked={includeDisabled}
                onChange={(e) => { setIncludeDisabled(e.target.checked); setSelected(null); }} />
            </label>
          </div>
        }
      />

      <div className="card bg-base-100 shadow" style={{ flex: 1, minHeight: 0 }}><div className="card-body p-0 overflow-hidden" style={{ flex: 1 }}>
        <DataGrid
          columnDefs={cols}
          rowData={rows}
          loading={isLoading}
          getRowId={(r) => String(r.id)}
          onRowClicked={(r) => setSelected(r)}
          onRowDoubleClicked={(r) => { setSelected(r); setManaging(r); }}
          exportable
          exportFilename="cabinet-users"
          height="100%"
        />
      </div></div>

      {/* Create modal */}
      <Modal open={createOpen} title="New Cabinet User"
        onClose={() => setCreateOpen(false)} size="lg">
        <NewUserForm onSave={handleCreate} onCancel={() => setCreateOpen(false)} loading={creating} />
      </Modal>

      {/* Manage modal (tabbed) */}
      <Modal open={!!managing} title={`Manage: ${managing?.name ?? ''}`}
        onClose={() => setManaging(null)} size="xl">
        {managing && (
          <ManageUserModal user={managing} onClose={() => setManaging(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable User' : 'Restore User'}
        message={
          confirm?.action === 'disable'
            ? `Disable "${confirm?.user.name}"? They will lose all cabinet access.`
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
