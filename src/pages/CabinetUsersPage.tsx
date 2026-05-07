import { useState } from 'react';
import {
  useListCabinetUsersQuery,
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
import { useListAssetGroupsByLocationQuery } from '../features/assetGroup/assetGroupApi';
import { useListTimeConstraintsByLocationQuery } from '../features/timeConstraint/timeConstraintApi';
import type { CabinetUserResponse, CabinetUserRequest } from '../types/api';
import { CABINET_USER_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import Pagination from '../components/shared/Pagination';
import LoadingRow from '../components/shared/LoadingRow';
import EmptyState from '../components/shared/EmptyState';
import Tabs from '../components/shared/Tabs';
import PermissionGate from '../components/PermissionGate';

// ─── User Detail Modal ────────────────────────────────────────────────────────

type ManageTab = 'details' | 'locations' | 'assets' | 'groups' | 'constraints';

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
  const [type, setType] = useState<number>(initial.type);
  const [email, setEmail] = useState(initial.email ?? '');
  const [mobileNo, setMobileNo] = useState(initial.mobileNo ?? '');
  const [division, setDivision] = useState(initial.division ?? '');
  const [designation, setDesignation] = useState(initial.designation ?? '');
  const [validFrom, setValidFrom] = useState(initial.validFrom?.slice(0, 16) ?? '');
  const [validUpto, setValidUpto] = useState(initial.validUpto?.slice(0, 16) ?? '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        name, type,
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
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">User ID</span></label>
          <input className="input input-bordered input-sm font-mono" value={initial.id} disabled />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Type *</span></label>
          <select className="select select-bordered select-sm" value={type}
            onChange={(e) => setType(Number(e.target.value))}>
            {Object.entries(CABINET_USER_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-control col-span-2">
          <label className="label py-1"><span className="label-text text-xs">Full Name *</span></label>
          <input className="input input-bordered input-sm" value={name}
            onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Short ID</span></label>
          <input className="input input-bordered input-sm" value={shortId}
            onChange={(e) => setShortId(e.target.value)} maxLength={10} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Short Name</span></label>
          <input className="input input-bordered input-sm" value={shortName}
            onChange={(e) => setShortName(e.target.value)} maxLength={20} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Card UID</span></label>
          <input type="number" className="input input-bordered input-sm font-mono" value={cardUid}
            onChange={(e) => setCardUid(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">PIN (leave blank to keep)</span></label>
          <input type="password" className="input input-bordered input-sm" value={pin}
            onChange={(e) => setPin(e.target.value)} maxLength={8} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Email</span></label>
          <input type="email" className="input input-bordered input-sm" value={email}
            onChange={(e) => setEmail(e.target.value)} maxLength={100} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Mobile No</span></label>
          <input className="input input-bordered input-sm" value={mobileNo}
            onChange={(e) => setMobileNo(e.target.value)} maxLength={15} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Division</span></label>
          <input className="input input-bordered input-sm" value={division}
            onChange={(e) => setDivision(e.target.value)} maxLength={50} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Designation</span></label>
          <input className="input input-bordered input-sm" value={designation}
            onChange={(e) => setDesignation(e.target.value)} maxLength={50} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Valid From</span></label>
          <input type="datetime-local" className="input input-bordered input-sm" value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs">Valid Until</span></label>
          <input type="datetime-local" className="input input-bordered input-sm" value={validUpto}
            min={validFrom} onChange={(e) => setValidUpto(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

function LocationsTab({ userId }: { userId: string }) {
  const { data: assigned, isLoading } = useGetCabinetUserLocationsQuery(userId);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const [assign, { isLoading: assigning }] = useAssignLocationMutation();
  const [remove, { isLoading: removing }] = useRemoveLocationMutation();
  const [selectedId, setSelectedId] = useState<number>(0);

  const assignedIds = new Set(assigned?.map((l) => l.id) ?? []);
  const available = allLocations?.content.filter((l) => !assignedIds.has(l.id) && !l.disabled) ?? [];

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
              <div key={loc.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200">
                <div>
                  <span className="text-sm font-medium">📍 {loc.name}</span>
                  {loc.address && <span className="text-xs text-base-content/50 ml-2">{loc.address}</span>}
                </div>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs text-error" disabled={removing}
                    onClick={() => remove({ id: userId, locationId: loc.id })}>Remove</button>
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
            <div className="flex gap-2">
              <select className="select select-bordered select-sm flex-1" value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}>
                <option value={0} disabled>Select location…</option>
                {available.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button className="btn btn-primary btn-sm"
                disabled={!selectedId || assigning}
                onClick={async () => {
                  if (!selectedId) return;
                  await assign({ id: userId, body: { locationId: selectedId } });
                  setSelectedId(0);
                }}>
                {assigning ? <span className="loading loading-spinner loading-xs" /> : 'Assign'}
              </button>
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

function AssetsTab({ userId }: { userId: string }) {
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
                    onClick={() => removeAsset({ userId, assetId: ua.assetId, locationId: ua.locationId })}>
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
                await assignAsset({ userId, assetId, locationId });
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
                    onClick={() => removeGroup({ userId, groupId: ug.groupId, locationId: ug.locationId })}>
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
                await assignGroup({ userId, groupId, locationId });
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
                    onClick={() => removeTC({ userId, timeConstraintId: ut.timeConstraintId })}>
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
                await assignTC({ userId, timeConstraintId: tcId });
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

function ManageUserModal({
  user, onClose,
}: {
  user: CabinetUserResponse;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ManageTab>('details');
  const [update, { isLoading: updating }] = useUpdateCabinetUserMutation();
  const { data: locations } = useGetCabinetUserLocationsQuery(user.id);
  const { data: assets } = useGetUserAssetsQuery(user.id);
  const { data: groups } = useGetUserAssetGroupsQuery(user.id);
  const { data: constraints } = useGetUserTimeConstraintsQuery(user.id);

  const tabs = [
    { id: 'details',     label: 'Details',          icon: '👤' },
    { id: 'locations',   label: 'Locations',         icon: '📍', badge: locations?.length },
    { id: 'assets',      label: 'Assets',            icon: '🔑', badge: assets?.length },
    { id: 'groups',      label: 'Groups',            icon: '📦', badge: groups?.length },
    { id: 'constraints', label: 'Time Constraints',  icon: '⏰', badge: constraints?.length },
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
            onSave={(body) => update({ id: user.id, body })}
            onCancel={onClose} loading={updating} />
        )}
        {activeTab === 'locations' && <LocationsTab userId={user.id} />}
        {activeTab === 'assets' && <AssetsTab userId={user.id} />}
        {activeTab === 'groups' && <GroupsTab userId={user.id} />}
        {activeTab === 'constraints' && <TimeConstraintsTab userId={user.id} />}
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
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [division, setDivision] = useState('');
  const [designation, setDesignation] = useState('');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        userId, name, type,
        email: email || undefined,
        mobileNo: mobileNo || undefined,
        division: division || undefined,
        designation: designation || undefined,
      });
    }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text">User ID *</span></label>
          <input className="input input-bordered" value={userId}
            onChange={(e) => setUserId(e.target.value)} required maxLength={20} />
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
          <label className="label"><span className="label-text">Email</span></label>
          <input type="email" className="input input-bordered" value={email}
            onChange={(e) => setEmail(e.target.value)} maxLength={100} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Mobile No</span></label>
          <input className="input input-bordered" value={mobileNo}
            onChange={(e) => setMobileNo(e.target.value)} maxLength={15} />
        </div>
      </div>
      <p className="text-xs text-base-content/50">
        After creating, use "Manage" to assign locations, assets, and time constraints.
      </p>
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          Create User
        </button>
      </div>
    </form>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: number }) {
  const colors: Record<number, string> = {
    0: 'badge-neutral', 1: 'badge-primary', 2: 'badge-secondary', 3: 'badge-accent',
  };
  return (
    <span className={`badge badge-sm ${colors[type] ?? 'badge-neutral'}`}>
      {CABINET_USER_TYPES[type] ?? `Type ${type}`}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CabinetUsersPage() {
  const [page, setPage] = useState(0);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [managing, setManaging] = useState<CabinetUserResponse | null>(null);
  const [confirm, setConfirm] = useState<{ user: CabinetUserResponse; action: 'disable' | 'restore' } | null>(null);

  const { data, isLoading } = useListCabinetUsersQuery({ page, size: 20, includeDisabled });
  const [create, { isLoading: creating }] = useCreateCabinetUserMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetUserMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetUserMutation();

  const handleCreate = async (body: CabinetUserRequest) => {
    await create(body);
    setCreateOpen(false);
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
            <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              + Add User
            </button>
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
                <th>Division / Designation</th>
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
                  message="Cabinet users are the people who physically access key cabinets."
                  action={{ label: '+ Add User', onClick: () => setCreateOpen(true) }} />
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
                  <td className="text-xs text-base-content/70">
                    {[user.division, user.designation].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="font-mono text-sm">{user.mobileNo ?? '—'}</td>
                  <td className="text-sm text-base-content/70">
                    {user.validUpto ? new Date(user.validUpto).toLocaleDateString() : '—'}
                  </td>
                  <td><StatusBadge disabled={user.disabled} /></td>
                  <td>
                    <div className="flex gap-1">
                      <PermissionGate resource="CABINET_USER" action="UPDATE">
                        <button className="btn btn-primary btn-xs"
                          onClick={() => setManaging(user)}>Manage</button>
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
