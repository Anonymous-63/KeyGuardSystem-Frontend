import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText, Key, Clock, ListChecks, Receipt,
  Server, ChevronUp, ChevronDown,
  Search, Download, Ban, RefreshCw, Pencil,
} from 'lucide-react';
import { useAppSelector } from '@/app/store/hooks';
import { selectSelectedLocation } from '@/features/location/store/locationSlice';
import {
  useListCabinetUsersQuery,
  useListCabinetUsersByLocationQuery,
  useCreateCabinetUserMutation,
  useUpdateCabinetUserMutation,
  useDisableCabinetUserMutation,
  useRestoreCabinetUserMutation,

  useGetUserAssetsQuery,
  useAssignUserAssetMutation,
  useRemoveUserAssetMutation,
  useUpdateUserAssetPriorityMutation,
  useGetUserAssetGroupsQuery,
  useAssignUserAssetGroupMutation,
  useRemoveUserAssetGroupMutation,
  useUpdateUserAssetGroupPriorityMutation,
  useGetUserTimeConstraintsQuery,
  useAssignUserTimeConstraintMutation,
  useRemoveUserTimeConstraintMutation,
  useGetUserCabinetsQuery,
  useAssignUserCabinetMutation,
  useRemoveUserCabinetMutation,
} from '@/features/cabinetUser/api/cabinetUserApi';
import { useListCabinetsByLocationQuery } from '@/features/cabinet/api/cabinetApi';
import { useListLocationsQuery } from '@/features/location/api/locationApi';
import { useListAssetsByLocationQuery } from '@/features/asset/api/assetApi';
import { useListTransactionsByUserQuery } from '@/features/transaction/api/transactionApi';
import { useListAssetGroupsByLocationQuery } from '@/features/assetGroup/api/assetGroupApi';
import { useListTimeConstraintsByLocationQuery } from '@/features/timeConstraint/api/timeConstraintApi';
import type { CabinetUserResponse, CabinetUserRequest } from '@/shared/types/api';
import { CABINET_USER_TYPES } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Tabs from '@/shared/components/ui/Tabs';
import PermissionGate from '@/shared/components/ui/PermissionGate';
import { useToast } from '@/shared/components/ui/Toast';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';
import { usePermissions } from '@/features/abac/hooks/usePermissions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

// features[0] & 0x01 == 1 → 3.5 LCD cabinet (old protocol, needs shortId/shortName/shift)
function is35Lcd(featuresHex?: string | null): boolean {
  if (!featuresHex) return false;
  return (parseInt(featuresHex.slice(0, 2), 16) & 0x01) !== 0;
}

// ─── Enterprise form primitives ───────────────────────────────────────────────

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.65, userSelect: 'none',
    }}>
      {text}
    </span>
    {required && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1, opacity: 1 }}>*</span>}
  </div>
);

const Sect = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', margin: '0.125rem 0' }}>
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.35,
    }}>
      {label}
    </span>
    <div style={{ flex: 1, height: '1px', background: 'var(--color-base-300)' }} />
  </div>
);

const COUNTRY_CODES = [
  { code: '91',  label: 'India (+91)' },
  { code: '1',   label: 'US/Canada (+1)' },
  { code: '44',  label: 'UK (+44)' },
  { code: '61',  label: 'Australia (+61)' },
  { code: '971', label: 'UAE (+971)' },
  { code: '966', label: 'Saudi Arabia (+966)' },
  { code: '65',  label: 'Singapore (+65)' },
  { code: '60',  label: 'Malaysia (+60)' },
  { code: '49',  label: 'Germany (+49)' },
  { code: '33',  label: 'France (+33)' },
  { code: '86',  label: 'China (+86)' },
  { code: '81',  label: 'Japan (+81)' },
  { code: '82',  label: 'South Korea (+82)' },
  { code: '55',  label: 'Brazil (+55)' },
  { code: '27',  label: 'South Africa (+27)' },
];

const inp = 'input input-bordered w-full input-sm';
const sel = 'select select-bordered w-full select-sm';

// ─── Tab icon nodes ───────────────────────────────────────────────────────────

const ICO_DETAILS   = <FileText    size={13} strokeWidth={1.8} />;

const ICO_ASSETS    = <Key         size={13} strokeWidth={1.8} />;
const ICO_GROUPS    = <ListChecks  size={13} strokeWidth={1.8} />;
const ICO_TC        = <Clock       size={13} strokeWidth={1.8} />;
const ICO_TXN       = <Receipt     size={13} strokeWidth={1.8} />;
const ICO_CABINET   = <Server      size={13} strokeWidth={1.8} />;

// ─── User Details Form ────────────────────────────────────────────────────────

type ManageTab = 'details' | 'cabinets' | 'assets' | 'groups' | 'constraints' | 'transactions';

function UserDetailsForm({
  initial, onSave, onCancel, loading, isOldCabinet = false,
}: {
  initial: CabinetUserResponse;
  onSave: (data: Partial<CabinetUserRequest>) => void;
  onCancel: () => void;
  loading: boolean;
  isOldCabinet?: boolean;
}) {
  const [name, setName]               = useState(initial.name);
  const [shortId, setShortId]         = useState(initial.shortId ?? '');
  const [shortName, setShortName]     = useState(initial.shortName ?? '');
  const [noCard, setNoCard]           = useState(false);
  const [cardUid, setCardUid]         = useState<number | ''>(initial.cardUid ?? '');
  const [pin, setPin]                 = useState('');
  const [emailId, setEmailId]         = useState(initial.emailId ?? '');
  const [mobileCC, setMobileCC]       = useState(initial.mobileCountryCode ?? '91');
  const [mobileNo, setMobileNo]       = useState(initial.mobileNo ?? '');
  const [landlineNo, setLandlineNo]   = useState(initial.landlineNo ?? '');
  const [division, setDivision]       = useState(initial.division ?? '');
  const [designation, setDesignation] = useState(initial.designation ?? '');
  const [address, setAddress]         = useState(initial.address ?? '');

  const handleNoCard = (checked: boolean) => {
    setNoCard(checked);
    if (checked) { const n = parseInt(initial.id, 10); if (!isNaN(n)) setCardUid(n); }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        id: initial.id, name,
        shortId: shortId || undefined,
        shortName: shortName || undefined,
        cardUid: cardUid !== '' ? cardUid : undefined,
        pin: pin || undefined,
        emailId: emailId || undefined,
        mobileCountryCode: mobileCC || undefined,
        mobileNo: mobileNo || undefined,
        landlineNo: landlineNo || undefined,
        division: division || undefined,
        designation: designation || undefined,
        address: address || undefined,
      });
    }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      <Sect label="Identity" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="User ID" />
          <input className={inp} value={initial.id} disabled />
        </div>
        <div>
          <FL text="Full Name" required />
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
        </div>
        {isOldCabinet && (
          <div>
            <FL text="Short ID" />
            <input className={inp} value={shortId} onChange={(e) => setShortId(e.target.value)} maxLength={8} placeholder="Uploaded to cabinet" />
          </div>
        )}
        {isOldCabinet && (
          <div>
            <FL text="Short Name" />
            <input className={inp} value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={12} placeholder="Displayed on cabinet" />
          </div>
        )}
        <div>
          <FL text="Card UID" />
          <input type="number" className={inp} value={cardUid} disabled={noCard}
            onChange={(e) => setCardUid(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={isOldCabinet ? 'Max 8 hex digits' : 'Max 16 hex digits'} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', cursor: 'pointer', marginTop: '0.25rem' }}>
            <input type="checkbox" className="checkbox checkbox-xs" checked={noCard} onChange={(e) => handleNoCard(e.target.checked)} />
            No Physical Card (use ID)
          </label>
        </div>
        <div>
          <FL text="PIN" />
          <input type="password" className={inp} value={pin}
            onChange={(e) => setPin(e.target.value)} maxLength={8} placeholder="Leave blank to keep" />
        </div>
      </div>

      <Sect label="Contact" />
      <div>
        <FL text="Email ID" />
        <input type="email" className={inp} value={emailId}
          onChange={(e) => setEmailId(e.target.value)} maxLength={100} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="Mobile No" />
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <select className={sel} style={{ width: '42%', flexShrink: 0 }}
              value={mobileCC} onChange={(e) => setMobileCC(e.target.value)}>
              {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <input className={inp} style={{ flex: 1 }} value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)} maxLength={15} placeholder="Number" />
          </div>
        </div>
        <div>
          <FL text="Landline No" />
          <input className={inp} value={landlineNo} onChange={(e) => setLandlineNo(e.target.value)} maxLength={20} />
        </div>
      </div>

      <Sect label="Organization" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="Division" />
          <input className={inp} value={division} onChange={(e) => setDivision(e.target.value)} maxLength={50} />
        </div>
        <div>
          <FL text="Designation" />
          <input className={inp} value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={50} />
        </div>
      </div>
      <div>
        <FL text="Address" />
        <textarea className="textarea textarea-bordered w-full textarea-sm" rows={2}
          value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem', marginTop: '0.125rem' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>Reset</button>
        <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '120px' }} disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

// ─── Cabinets Tab (MULTI_DIFF locations only) ─────────────────────────────────

function CabinetsTab({ userId, allLocations }: {
  userId: string;
  allLocations: import('@/shared/types/api').LocationResponse[] | undefined;
}) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserCabinetsQuery(userId);
  const [assignCabinet, { isLoading: assigning }] = useAssignUserCabinetMutation();
  const [removeCabinet, { isLoading: removing }]  = useRemoveUserCabinetMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [cabinetId, setCabinetId]   = useState<number>(0);

  const multiDiffLocations = allLocations?.filter((l) => !l.disabled && l.cabinetTypeName === 'MULTI_DIFF') ?? [];
  const { data: locationCabinets } = useListCabinetsByLocationQuery(locationId, { skip: !locationId });
  const assignedIds      = new Set(assigned?.map((c) => c.cabinetId) ?? []);
  const availableCabinets = locationCabinets?.filter((c) => !c.deleted && !assignedIds.has(c.id)) ?? [];

  return (
    <div className="space-y-3">
      <p style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.6 }}>
        Cabinet Assignments ({assigned?.length ?? 0})
        <span style={{ fontWeight: 400, marginLeft: '0.4rem', opacity: 0.7 }}>— applies to Multi-Different locations only</span>
      </p>
      {isLoading ? <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        : !assigned?.length ? <p style={{ fontSize: '0.8rem', opacity: 0.4, fontStyle: 'italic' }}>No individual cabinet assignments.</p>
        : (
          <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {assigned.map((ca, i) => (
              <div key={ca.cabinetId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.75rem', borderBottom: i < assigned.length - 1 ? '1px solid var(--color-base-200)' : 'none', fontSize: '0.82rem' }}>
                <Server size={12} strokeWidth={1.5} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{ca.cabinetName ?? `Cabinet #${ca.cabinetId}`}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.45, fontFamily: 'monospace' }}>
                  {new Date(ca.validFrom).toLocaleDateString()}
                  {ca.validUpto ? ` → ${new Date(ca.validUpto).toLocaleDateString()}` : ''}
                </span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)', opacity: 0.7 }} disabled={removing}
                    onClick={async () => {
                      try { await removeCabinet({ userId, cabinetId: ca.cabinetId }).unwrap(); addToast({ type: 'success', message: 'Cabinet removed' }); }
                      catch { addToast({ type: 'error', message: 'Failed to remove cabinet' }); }
                    }}>×</button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        {multiDiffLocations.length === 0 ? (
          <p style={{ fontSize: '0.78rem', opacity: 0.4, fontStyle: 'italic' }}>No Multi-Different locations configured.</p>
        ) : (
          <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.75rem' }}>
            <Sect label="Assign Cabinet" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div>
                <FL text="Location" />
                <select className={sel} value={locationId} onChange={(e) => { setLocationId(Number(e.target.value)); setCabinetId(0); }}>
                  <option value={0} disabled>Select location…</option>
                  {multiDiffLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <FL text="Cabinet" />
                <select className={sel} value={cabinetId} onChange={(e) => setCabinetId(Number(e.target.value))} disabled={!locationId}>
                  <option value={0} disabled>Select cabinet…</option>
                  {availableCabinets.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" disabled={!cabinetId || !locationId || assigning}
                onClick={async () => {
                  if (!cabinetId || !locationId) return;
                  try {
                    await assignCabinet({ userId, body: { cabinetId, validFrom: new Date().toISOString() } }).unwrap();
                    addToast({ type: 'success', message: 'Cabinet assigned' });
                  } catch { addToast({ type: 'error', message: 'Failed to assign cabinet' }); }
                  setCabinetId(0);
                }}>
                {assigning && <span className="loading loading-spinner loading-xs" />} Assign Cabinet
              </button>
            </div>
          </div>
        )}
      </PermissionGate>
    </div>
  );
}

// ─── Assets Tab ───────────────────────────────────────────────────────────────

function AssetsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserAssetsQuery(userId);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const [assignAsset, { isLoading: assigning }] = useAssignUserAssetMutation();
  const [removeAsset, { isLoading: removing }]  = useRemoveUserAssetMutation();
  const [updatePriority] = useUpdateUserAssetPriorityMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [assetId, setAssetId]       = useState<number>(0);

  const { data: locationAssets } = useListAssetsByLocationQuery(locationId, { skip: !locationId });
  const assignedIds    = new Set(assigned?.map((a) => a.assetId) ?? []);
  const availableAssets = locationAssets?.filter((a) => !assignedIds.has(a.id) && !a.disabled) ?? [];

  const reorderAsset = useCallback(async (index: number, dir: 'up' | 'down') => {
    if (!assigned) return;
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= assigned.length) return;
    const a = assigned[index]; const b = assigned[swapIdx];
    try {
      await Promise.all([
        updatePriority({ userId, assetId: a.assetId, locationId: a.locationId, priority: swapIdx }).unwrap(),
        updatePriority({ userId, assetId: b.assetId, locationId: b.locationId, priority: index }).unwrap(),
      ]);
    } catch { addToast({ type: 'error', message: 'Failed to reorder' }); }
  }, [assigned, userId, updatePriority, addToast]);

  return (
    <div className="space-y-3">
      <p style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.6 }}>Assigned Assets ({assigned?.length ?? 0})</p>
      {isLoading ? <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        : !assigned?.length ? <p style={{ fontSize: '0.8rem', opacity: 0.4, fontStyle: 'italic' }}>No individual assets assigned.</p>
        : (
          <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {assigned.map((ua, i) => (
              <div key={`${ua.assetId}-${ua.locationId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.75rem', borderBottom: i < assigned.length - 1 ? '1px solid var(--color-base-200)' : 'none', fontSize: '0.82rem' }}>
                <Key size={12} strokeWidth={1.5} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  {ua.assetName ?? `Asset #${ua.assetId}`}
                  {ua.assetNumber != null && <span style={{ opacity: 0.45, marginLeft: '0.35rem' }}>#{ua.assetNumber}</span>}
                </span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <div style={{ display: 'flex', gap: '0.1rem' }}>
                    <button className="btn btn-ghost btn-xs" style={{ padding: '0 0.2rem' }} disabled={i === 0} onClick={() => reorderAsset(i, 'up')}><ChevronUp size={11} /></button>
                    <button className="btn btn-ghost btn-xs" style={{ padding: '0 0.2rem' }} disabled={i === assigned.length - 1} onClick={() => reorderAsset(i, 'down')}><ChevronDown size={11} /></button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)', opacity: 0.7 }} disabled={removing}
                      onClick={async () => {
                        try { await removeAsset({ userId, assetId: ua.assetId, locationId: ua.locationId }).unwrap(); addToast({ type: 'success', message: 'Asset removed' }); }
                        catch { addToast({ type: 'error', message: 'Failed to remove asset' }); }
                      }}>×</button>
                  </div>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.75rem' }}>
          <Sect label="Add Asset" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div>
              <FL text="Location" />
              <select className={sel} value={locationId} onChange={(e) => { setLocationId(Number(e.target.value)); setAssetId(0); }}>
                <option value={0} disabled>Select location…</option>
                {allLocations?.content.filter((l) => !l.disabled).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <FL text="Asset" />
              <select className={sel} value={assetId} onChange={(e) => setAssetId(Number(e.target.value))} disabled={!locationId}>
                <option value={0} disabled>Select asset…</option>
                {availableAssets.map((a) => <option key={a.id} value={a.id}>{a.name} #{a.number}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" disabled={!assetId || !locationId || assigning}
              onClick={async () => {
                if (!assetId || !locationId) return;
                try { await assignAsset({ userId, assetId, locationId }).unwrap(); addToast({ type: 'success', message: 'Asset assigned' }); }
                catch { addToast({ type: 'error', message: 'Failed to assign asset' }); }
                setAssetId(0);
              }}>
              {assigning && <span className="loading loading-spinner loading-xs" />} Assign Asset
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

function GroupsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserAssetGroupsQuery(userId);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const [assignGroup, { isLoading: assigning }] = useAssignUserAssetGroupMutation();
  const [removeGroup, { isLoading: removing }]  = useRemoveUserAssetGroupMutation();
  const [updatePriority] = useUpdateUserAssetGroupPriorityMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [groupId, setGroupId]       = useState<number>(0);

  const { data: locationGroups } = useListAssetGroupsByLocationQuery(locationId, { skip: !locationId });
  const assignedIds    = new Set(assigned?.map((g) => g.groupId) ?? []);
  const availableGroups = locationGroups?.filter((g) => !assignedIds.has(g.id) && !g.disabled) ?? [];

  const reorderGroup = useCallback(async (index: number, dir: 'up' | 'down') => {
    if (!assigned) return;
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= assigned.length) return;
    const a = assigned[index]; const b = assigned[swapIdx];
    try {
      await Promise.all([
        updatePriority({ userId, groupId: a.groupId, locationId: a.locationId, priority: swapIdx }).unwrap(),
        updatePriority({ userId, groupId: b.groupId, locationId: b.locationId, priority: index }).unwrap(),
      ]);
    } catch { addToast({ type: 'error', message: 'Failed to reorder' }); }
  }, [assigned, userId, updatePriority, addToast]);

  return (
    <div className="space-y-3">
      <p style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.6 }}>Assigned Groups ({assigned?.length ?? 0})</p>
      {isLoading ? <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        : !assigned?.length ? <p style={{ fontSize: '0.8rem', opacity: 0.4, fontStyle: 'italic' }}>No asset groups assigned.</p>
        : (
          <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {assigned.map((ug, i) => (
              <div key={`${ug.groupId}-${ug.locationId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.75rem', borderBottom: i < assigned.length - 1 ? '1px solid var(--color-base-200)' : 'none', fontSize: '0.82rem' }}>
                <ListChecks size={12} strokeWidth={1.5} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{ug.groupName ?? `Group #${ug.groupId}`}</span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <div style={{ display: 'flex', gap: '0.1rem' }}>
                    <button className="btn btn-ghost btn-xs" style={{ padding: '0 0.2rem' }} disabled={i === 0} onClick={() => reorderGroup(i, 'up')}><ChevronUp size={11} /></button>
                    <button className="btn btn-ghost btn-xs" style={{ padding: '0 0.2rem' }} disabled={i === assigned.length - 1} onClick={() => reorderGroup(i, 'down')}><ChevronDown size={11} /></button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)', opacity: 0.7 }} disabled={removing}
                      onClick={async () => {
                        try { await removeGroup({ userId, groupId: ug.groupId, locationId: ug.locationId }).unwrap(); addToast({ type: 'success', message: 'Group removed' }); }
                        catch { addToast({ type: 'error', message: 'Failed to remove group' }); }
                      }}>×</button>
                  </div>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.75rem' }}>
          <Sect label="Add Group" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div>
              <FL text="Location" />
              <select className={sel} value={locationId} onChange={(e) => { setLocationId(Number(e.target.value)); setGroupId(0); }}>
                <option value={0} disabled>Select location…</option>
                {allLocations?.content.filter((l) => !l.disabled).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <FL text="Group" />
              <select className={sel} value={groupId} onChange={(e) => setGroupId(Number(e.target.value))} disabled={!locationId}>
                <option value={0} disabled>Select group…</option>
                {availableGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" disabled={!groupId || !locationId || assigning}
              onClick={async () => {
                if (!groupId || !locationId) return;
                try { await assignGroup({ userId, groupId, locationId }).unwrap(); addToast({ type: 'success', message: 'Group assigned' }); }
                catch { addToast({ type: 'error', message: 'Failed to assign group' }); }
                setGroupId(0);
              }}>
              {assigning && <span className="loading loading-spinner loading-xs" />} Assign Group
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

// ─── Time Constraints Tab ─────────────────────────────────────────────────────

function TimeConstraintsTab({ userId }: { userId: string }) {
  const { addToast } = useToast();
  const { data: assigned, isLoading } = useGetUserTimeConstraintsQuery(userId);
  const [assignTC, { isLoading: assigning }] = useAssignUserTimeConstraintMutation();
  const [removeTC, { isLoading: removing }]  = useRemoveUserTimeConstraintMutation();
  const [locationId, setLocationId] = useState<number>(0);
  const [tcId, setTcId]             = useState<number>(0);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const { data: locationTCs }  = useListTimeConstraintsByLocationQuery(locationId, { skip: !locationId });
  const assignedIds  = new Set(assigned?.map((t) => t.timeConstraintId) ?? []);
  const availableTCs = locationTCs?.filter((t) => !assignedIds.has(t.id) && !t.disabled) ?? [];

  return (
    <div className="space-y-3">
      <p style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.6 }}>Assigned Time Constraints ({assigned?.length ?? 0})</p>
      {isLoading ? <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
        : !assigned?.length ? <p style={{ fontSize: '0.8rem', opacity: 0.4, fontStyle: 'italic' }}>No time constraints — unrestricted access hours.</p>
        : (
          <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {assigned.map((ut, i) => (
              <div key={ut.timeConstraintId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.75rem', borderBottom: i < assigned.length - 1 ? '1px solid var(--color-base-200)' : 'none', fontSize: '0.82rem' }}>
                <Clock size={12} strokeWidth={1.5} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{ut.constraintName ?? `Constraint #${ut.timeConstraintId}`}</span>
                <PermissionGate resource="CABINET_USER" action="ASSIGN">
                  <button className="btn btn-ghost btn-xs" style={{ color: 'var(--color-error)', opacity: 0.7 }} disabled={removing}
                    onClick={async () => {
                      try { await removeTC({ userId, timeConstraintId: ut.timeConstraintId }).unwrap(); addToast({ type: 'success', message: 'Constraint removed' }); }
                      catch { addToast({ type: 'error', message: 'Failed to remove constraint' }); }
                    }}>×</button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}

      <PermissionGate resource="CABINET_USER" action="ASSIGN">
        <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.75rem' }}>
          <Sect label="Add Time Constraint" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div>
              <FL text="Location" />
              <select className={sel} value={locationId} onChange={(e) => { setLocationId(Number(e.target.value)); setTcId(0); }}>
                <option value={0} disabled>Select location…</option>
                {allLocations?.content.filter((l) => !l.disabled).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <FL text="Constraint" />
              <select className={sel} value={tcId} onChange={(e) => setTcId(Number(e.target.value))} disabled={!locationId}>
                <option value={0} disabled>Select constraint…</option>
                {availableTCs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" disabled={!tcId || assigning}
              onClick={async () => {
                if (!tcId) return;
                try { await assignTC({ userId, timeConstraintId: tcId }).unwrap(); addToast({ type: 'success', message: 'Constraint assigned' }); }
                catch { addToast({ type: 'error', message: 'Failed to assign constraint' }); }
                setTcId(0);
              }}>
              {assigning && <span className="loading loading-spinner loading-xs" />} Assign
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab({ userId }: { userId: string }) {
  const { data: txs, isLoading } = useListTransactionsByUserQuery(userId);
  return (
    <div>
      <p style={{ fontSize: '0.78rem', opacity: 0.5, marginBottom: '0.75rem' }}>
        Transaction history ({txs?.length ?? 0} records)
      </p>
      {isLoading ? <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md text-primary" /></div>
        : !txs?.length ? <p style={{ fontSize: '0.82rem', opacity: 0.4, textAlign: 'center', fontStyle: 'italic' }}>No transactions found.</p>
        : (
          <div className="overflow-x-auto" style={{ maxHeight: '20rem' }}>
            <table className="table table-xs table-bordered">
              <thead className="bg-success/10">
                <tr><th>#</th><th>Asset</th><th>Cabinet</th><th>Issued At</th><th>Returned At</th><th>Status</th></tr>
              </thead>
              <tbody>
                {txs.map((tx) => {
                  const isOut     = !tx.returnedAt;
                  const isOverdue = !!tx.overdueMinutes && tx.overdueMinutes > 0 && isOut;
                  return (
                    <tr key={tx.autoNo} className={isOverdue ? 'bg-error/5' : ''}>
                      <td className="font-mono text-xs opacity-50">{tx.autoNo}</td>
                      <td className="text-xs">
                        <p className="font-medium">{tx.assetName ?? `Asset #${tx.assetId}`}</p>
                        {tx.assetNumber && <p className="opacity-50">#{tx.assetNumber}</p>}
                      </td>
                      <td className="text-xs opacity-60">{tx.issuedFromName ?? `Cabinet ${tx.issuedFrom}`}</td>
                      <td className="text-xs">{new Date(tx.issuedAt).toLocaleString()}</td>
                      <td className="text-xs">{tx.returnedAt ? new Date(tx.returnedAt).toLocaleString() : '—'}</td>
                      <td>
                        {tx.returnedAt ? <span className="badge badge-success badge-xs">Returned</span>
                          : isOverdue ? <span className="badge badge-error badge-xs">Overdue</span>
                          : <span className="badge badge-warning badge-xs">Out</span>}
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

// ─── Manage User Modal ────────────────────────────────────────────────────────

function ManageUserModal({ user, onClose, isOldCabinet = false, allLocations }: {
  user: CabinetUserResponse;
  onClose: () => void;
  isOldCabinet?: boolean;
  allLocations: import('@/shared/types/api').LocationResponse[] | undefined;
}) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab]     = useState<ManageTab>('details');
  const [update, { isLoading: updating }] = useUpdateCabinetUserMutation();
  const { data: assets }      = useGetUserAssetsQuery(user.id);
  const { data: groups }      = useGetUserAssetGroupsQuery(user.id);
  const { data: constraints } = useGetUserTimeConstraintsQuery(user.id);
  const { data: txs }         = useListTransactionsByUserQuery(user.id);
  const { data: cabinets }    = useGetUserCabinetsQuery(user.id);

  const hasMultiDiff = (allLocations ?? []).some((l) => !l.disabled && l.cabinetTypeName === 'MULTI_DIFF');

  const tabs = [
    { id: 'details',      label: 'Details',            icon: ICO_DETAILS },
    ...(hasMultiDiff ? [{ id: 'cabinets', label: 'Assign Cabinets', icon: ICO_CABINET, badge: cabinets?.length }] : []),
    { id: 'assets',       label: 'Assign Keys',         icon: ICO_ASSETS,  badge: assets?.length },
    { id: 'groups',       label: 'Assign Groups',       icon: ICO_GROUPS,  badge: groups?.length },
    ...(!isOldCabinet ? [{ id: 'constraints', label: 'Time Constraints', icon: ICO_TC, badge: constraints?.length }] : []),
    { id: 'transactions', label: 'Transactions',        icon: ICO_TXN,     badge: txs?.length },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--color-base-200)', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'var(--ent-dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>{user.name}</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.5, margin: 0 }}>{user.id}</p>
        </div>
        <StatusBadge disabled={user.disabled} />
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as ManageTab)} />

      <div style={{ minHeight: '20rem' }}>
        {activeTab === 'details' && (
          <UserDetailsForm initial={user} isOldCabinet={isOldCabinet}
            onSave={async (body) => {
              try { await update({ id: user.id, body }).unwrap(); addToast({ type: 'success', message: 'User updated' }); }
              catch { addToast({ type: 'error', message: 'Failed to update user' }); }
            }}
            onCancel={onClose} loading={updating} />
        )}
        {activeTab === 'cabinets'     && <CabinetsTab        userId={user.id} allLocations={allLocations} />}
        {activeTab === 'assets'       && <AssetsTab          userId={user.id} />}
        {activeTab === 'groups'       && <GroupsTab          userId={user.id} />}
        {activeTab === 'constraints'  && <TimeConstraintsTab userId={user.id} />}
        {activeTab === 'transactions' && <TransactionsTab    userId={user.id} />}
      </div>
    </div>
  );
}

// ─── New User Form ────────────────────────────────────────────────────────────

function NewUserForm({ onSave, onCancel, loading, isOldCabinet = false }: { onSave: (d: CabinetUserRequest) => void; onCancel: () => void; loading: boolean; isOldCabinet?: boolean }) {
  const [id, setId]               = useState('');
  const [name, setName]           = useState('');
  const [shortId, setShortId]     = useState('');
  const [shortName, setShortName] = useState('');
  const [noCard, setNoCard]       = useState(false);
  const [cardUid, setCardUid]     = useState<number | ''>('');
  const [pin, setPin]             = useState('');
  const [mobileCC, setMobileCC]   = useState('91');
  const [mobileNo, setMobileNo]   = useState('');
  const [landlineNo, setLandlineNo] = useState('');
  const [emailId, setEmailId]     = useState('');
  const [division, setDivision]   = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress]     = useState('');

  const handleNoCard = (checked: boolean) => {
    setNoCard(checked);
    if (checked) { const n = parseInt(id, 10); if (!isNaN(n)) setCardUid(n); }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ id, name, shortId: shortId || undefined, shortName: shortName || undefined, cardUid: cardUid !== '' ? cardUid : undefined, pin: pin || undefined, mobileCountryCode: mobileNo ? mobileCC : undefined, mobileNo: mobileNo || undefined, landlineNo: landlineNo || undefined, emailId: emailId || undefined, division: division || undefined, designation: designation || undefined, address: address || undefined });
    }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      <Sect label="Identity" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div><FL text="User ID" required /><input className={inp} value={id} onChange={(e) => setId(e.target.value)} required maxLength={20} placeholder="e.g. EMP001" /></div>
        <div><FL text="Full Name" required /><input className={inp} value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} /></div>
        {isOldCabinet && (
          <div><FL text="Short ID" /><input className={inp} value={shortId} onChange={(e) => setShortId(e.target.value)} maxLength={8} placeholder="Uploaded to cabinet" /></div>
        )}
        {isOldCabinet && (
          <div><FL text="Short Name" /><input className={inp} value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={12} placeholder="Displayed on cabinet" /></div>
        )}
        <div>
          <FL text="Card UID" />
          <input type="number" className={inp} value={cardUid} disabled={noCard}
            onChange={(e) => setCardUid(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={isOldCabinet ? 'Max 8 hex digits' : 'Max 16 hex digits'} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', cursor: 'pointer', marginTop: '0.25rem' }}>
            <input type="checkbox" className="checkbox checkbox-xs" checked={noCard} onChange={(e) => handleNoCard(e.target.checked)} />
            No Physical Card (use ID)
          </label>
        </div>
        <div><FL text="PIN" /><input type="password" className={inp} value={pin} onChange={(e) => setPin(e.target.value)} maxLength={8} placeholder="Default: 1234" /></div>
      </div>

      <Sect label="Contact" />
      <div><FL text="Email ID" /><input type="email" className={inp} value={emailId} onChange={(e) => setEmailId(e.target.value)} maxLength={100} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="Mobile No" />
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <select className={sel} style={{ width: '42%', flexShrink: 0 }} value={mobileCC} onChange={(e) => setMobileCC(e.target.value)}>
              {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <input className={inp} style={{ flex: 1 }} value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} maxLength={15} placeholder="Number" />
          </div>
        </div>
        <div><FL text="Landline No" /><input className={inp} value={landlineNo} onChange={(e) => setLandlineNo(e.target.value)} maxLength={20} /></div>
      </div>

      <Sect label="Organization" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div><FL text="Division" /><input className={inp} value={division} onChange={(e) => setDivision(e.target.value)} maxLength={50} /></div>
        <div><FL text="Designation" /><input className={inp} value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={50} /></div>
      </div>
      <div><FL text="Address" /><textarea className="textarea textarea-bordered w-full textarea-sm" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} /></div>

      <p style={{ fontSize: '0.75rem', opacity: 0.45 }}>After creating, use Manage to assign locations, assets, and time constraints.</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem', marginTop: '0.125rem' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>Reset</button>
        <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '120px' }} disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />} Create User
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'active' | 'disabled';

export default function CabinetUsersPage() {
  const { addToast } = useToast();
  const { canAccess } = usePermissions();

  const can = useCallback(
    (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE') => canAccess('CABINET_USER', action),
    [canAccess],
  );

  const [activeTab,    setActiveTab]    = useState<Tab>('active');
  const [filterName,   setFilterName]   = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [currentPage,  setCurrentPage]  = useState(0);
  const [pageSize,     setPageSize]     = useState(20);
  const [managing,     setManaging]     = useState<CabinetUserResponse | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [confirm,      setConfirm]      = useState<{ user: CabinetUserResponse; action: 'disable' | 'restore' } | null>(null);
  const [selectedRows, setSelectedRows] = useState<CabinetUserResponse[]>([]);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [bulkLoading,  setBulkLoading]  = useState(false);

  const selectedLocation = useAppSelector(selectSelectedLocation);
  const { data: allLocations } = useListLocationsQuery({ size: 200 });
  const selectedLocationFull = allLocations?.content.find((l) => l.id === selectedLocation?.id);
  const isOldCabinet = is35Lcd(selectedLocationFull?.features);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  // Debounce name 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(filterName), 300);
    return () => clearTimeout(t);
  }, [filterName]);

  // Reset page on filter/tab change
  useEffect(() => { setCurrentPage(0); }, [debouncedName, activeTab, pageSize]);

  // Tab counts (3 lightweight queries, size=1)
  const { data: countAll }    = useListCabinetUsersQuery({ size: 1, includeDisabled: true },  { skip: !!selectedLocation });
  const { data: countActive } = useListCabinetUsersQuery({ size: 1, includeDisabled: false }, { skip: !!selectedLocation });

  // Main data
  const isDisabledTab = activeTab === 'disabled';
  const { data: pagedData, isLoading: loadingPaged } = useListCabinetUsersQuery({
    page: currentPage,
    size: isDisabledTab ? 500 : pageSize,
    includeDisabled: activeTab !== 'active',
  }, { skip: !!selectedLocation });

  const { data: locationData, isLoading: loadingLocation } = useListCabinetUsersByLocationQuery(
    selectedLocation?.id ?? 0, { skip: !selectedLocation },
  );

  const locAll      = locationData?.length ?? 0;
  const locActive   = locationData?.filter((u) => !u.disabled).length ?? 0;
  const totalAll      = selectedLocation ? locAll      : (countAll?.totalElements    ?? 0);
  const totalActive   = selectedLocation ? locActive   : (countActive?.totalElements ?? 0);
  const totalDisabled = selectedLocation ? (locAll - locActive) : (totalAll - totalActive);
  const counts: Record<Tab, number> = { all: totalAll, active: totalActive, disabled: totalDisabled };

  const isLoading = loadingPaged || loadingLocation;

  const [create,  { isLoading: creating }]  = useCreateCabinetUserMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetUserMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetUserMutation();

  // Filter rows
  const rawRows     = selectedLocation ? (locationData ?? []) : (pagedData?.content ?? []);
  const tabFiltered = selectedLocation
    ? (activeTab === 'active'   ? rawRows.filter((u) => !u.disabled)
       : activeTab === 'disabled' ? rawRows.filter((u) =>  u.disabled)
       : rawRows)
    : (isDisabledTab ? rawRows.filter((u) => u.disabled) : rawRows);
  const nameLower   = debouncedName.trim().toLowerCase();
  const rows        = nameLower
    ? tabFiltered.filter((u) =>
        u.name.toLowerCase().includes(nameLower) ||
        u.id.toLowerCase().includes(nameLower) ||
        (u.division ?? '').toLowerCase().includes(nameLower))
    : tabFiltered;

  const totalItems = selectedLocation ? rows.length : (isDisabledTab ? totalDisabled : (pagedData?.totalElements ?? 0));
  const totalPages = isDisabledTab || selectedLocation ? 1 : (pagedData?.totalPages ?? 1);

  const clearSelection = () => { setSelectedRows([]); setClearTrigger((n) => n + 1); };

  // Export CSV
  const handleExport = () => {
    if (!rows.length) return;
    const headers = ['User ID', 'Name', 'Card UID', 'Mobile', 'Division', 'Designation', 'Status'];
    const csvData = rows.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      u.cardUid ?? '',
      u.mobileNo ? (u.mobileCountryCode ? `+${u.mobileCountryCode} ${u.mobileNo}` : u.mobileNo) : '',
      u.division ?? '',
      u.designation ?? '',
      u.disabled ? 'Disabled' : 'Active',
    ]);
    const csv  = [headers, ...csvData].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'cabinet-users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreate = async (body: CabinetUserRequest) => {
    try { await create(body).unwrap(); addToast({ type: 'success', message: 'User created' }); setCreateOpen(false); }
    catch { addToast({ type: 'error', message: 'Failed to create user' }); }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'disable') await disable(confirm.user.id).unwrap();
      else await restore(confirm.user.id).unwrap();
      addToast({ type: 'success', message: confirm.action === 'disable' ? 'User disabled' : 'User restored' });
      clearSelection();
    } catch { addToast({ type: 'error', message: 'Action failed' }); }
    setConfirm(null);
  };

  const handleBulkDisable = async () => {
    const targets = selectedRows.filter((u) => !u.disabled);
    if (!targets.length) return;
    setBulkLoading(true);
    const results = await Promise.allSettled(targets.map((u) => disable(u.id).unwrap()));
    const failed  = results.filter((r) => r.status === 'rejected').length;
    setBulkLoading(false);
    addToast({ type: failed ? 'error' : 'success', message: failed ? `${failed} failed` : `${targets.length} users disabled` });
    clearSelection();
  };

  const handleBulkRestore = async () => {
    const targets = selectedRows.filter((u) => u.disabled);
    if (!targets.length) return;
    setBulkLoading(true);
    const results = await Promise.allSettled(targets.map((u) => restore(u.id).unwrap()));
    const failed  = results.filter((r) => r.status === 'rejected').length;
    setBulkLoading(false);
    addToast({ type: failed ? 'error' : 'success', message: failed ? `${failed} failed` : `${targets.length} users restored` });
    clearSelection();
  };

  const cols = useMemo<ColDef<CabinetUserResponse>[]>(() => [
    { field: 'id',   headerName: 'User ID', width: 110, cellStyle: { fontFamily: 'monospace', fontSize: '0.8rem' } },
    { field: 'name', headerName: 'Name',    flex: 1, minWidth: 120 },
    {
      headerName: 'Card UID', width: 110,
      valueGetter: ({ data: d }) => d?.cardUid ? String(d.cardUid) : '—',
      cellStyle: { fontFamily: 'monospace', fontSize: '0.78rem' },
    },
    { headerName: 'Division',    width: 110, hide: isMobile, valueGetter: ({ data: d }) => d?.division    ?? '—' },
    { headerName: 'Designation', width: 120, hide: isMobile, valueGetter: ({ data: d }) => d?.designation ?? '—' },
    {
      headerName: 'Mobile', width: 130, hide: isMobile,
      valueGetter: ({ data: d }) => !d?.mobileNo ? '—' : (d.mobileCountryCode ? `+${d.mobileCountryCode} ${d.mobileNo}` : d.mobileNo),
    },
    {
      headerName: 'Status', width: 90, sortable: false,
      cellRenderer: ({ data: d }: { data: CabinetUserResponse }) => (
        d.disabled
          ? <span className="badge badge-soft badge-error badge-sm" style={{ cursor: 'default' }}>Disabled</span>
          : <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
      ),
    },
    {
      headerName: 'Actions',
      width: isMobile ? 80 : 180,
      minWidth: isMobile ? 72 : 170,
      sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: CabinetUserResponse }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', height: '100%' }}>
          {can('UPDATE') && (isMobile
            ? <button className="btn btn-ghost btn-xs btn-square" title="Manage" onClick={(e) => { e.stopPropagation(); setManaging(d); }}><Pencil size={15} strokeWidth={1.5} /></button>
            : <button className="btn btn-outline btn-xs gap-1" onClick={(e) => { e.stopPropagation(); setManaging(d); }}><Pencil size={13} strokeWidth={1.5} /> Manage</button>
          )}
          {!d.disabled && can('DELETE') && (isMobile
            ? <button className="btn btn-ghost btn-xs btn-square text-error" title="Disable" onClick={(e) => { e.stopPropagation(); setConfirm({ user: d, action: 'disable' }); }}><Ban size={15} strokeWidth={1.5} /></button>
            : <button className="btn btn-outline btn-error btn-xs gap-1" onClick={(e) => { e.stopPropagation(); setConfirm({ user: d, action: 'disable' }); }}><Ban size={13} strokeWidth={1.5} /> Disable</button>
          )}
          {d.disabled && can('RESTORE') && (isMobile
            ? <button className="btn btn-ghost btn-xs btn-square text-info" title="Restore" onClick={(e) => { e.stopPropagation(); setConfirm({ user: d, action: 'restore' }); }}><RefreshCw size={15} strokeWidth={1.5} /></button>
            : <button className="btn btn-outline btn-info btn-xs gap-1" onClick={(e) => { e.stopPropagation(); setConfirm({ user: d, action: 'restore' }); }}><RefreshCw size={13} strokeWidth={1.5} /> Restore</button>
          )}
        </div>
      ),
    },
  ], [can, isMobile]);

  const bulkDisableCount = selectedRows.filter((r) => !r.disabled).length;
  const bulkRestoreCount = selectedRows.filter((r) =>  r.disabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)', margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Cabinet Users
        </h1>
        {can('CREATE') && (
          <button className="btn btn-sm btn-primary gap-1" onClick={() => setCreateOpen(true)}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span> Add User
          </button>
        )}
      </div>

      {/* Card */}
      <div className="bg-base-100 shadow-sm"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '0.5rem', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flex: 1, paddingLeft: '0.25rem' }}>
            {(['all', 'active', 'disabled'] as Tab[]).map((tab) => {
              const isActive = activeTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'active' ? 'Active' : 'Disabled';
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--color-primary)' : 'var(--sb-text-muted)',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                    marginBottom: '-1px', cursor: 'pointer',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}>
                  {label}
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600, padding: '0.05rem 0.35rem',
                    borderRadius: '0.75rem',
                    background: isActive ? 'var(--color-primary)' : 'var(--color-base-300)',
                    color: isActive ? 'var(--color-primary-content)' : 'var(--sb-text-muted)',
                    minWidth: '1.25rem', textAlign: 'center',
                  }}>
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: record count + export */}
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--sb-border)', padding: '0 0.75rem', gap: '0.75rem' }}>
            {!isMobile && (
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : `${totalItems} record${totalItems !== 1 ? 's' : ''}`}
              </span>
            )}
            <button onClick={handleExport} disabled={rows.length === 0}
              title="Export CSV"
              className={isMobile ? 'btn btn-sm btn-outline btn-primary btn-square' : 'btn btn-sm btn-outline btn-primary gap-1.5'}
              style={{ fontSize: '0.75rem', height: '1.75rem', minHeight: '1.75rem', paddingInline: isMobile ? undefined : '0.6rem' }}>
              <Download size={14} strokeWidth={1.5} />
              {!isMobile && 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center', gap: '0.4rem',
          padding: '0.45rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
          background: 'var(--color-base-200)', flexShrink: 0,
        }}>
          <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.55rem', display: 'flex', pointerEvents: 'none', color: 'var(--sb-text-muted)' }}>
              <Search size={13} strokeWidth={1.5} />
            </span>
            <input className="input input-bordered input-sm"
              style={{ paddingLeft: '1.8rem', width: isMobile ? '100%' : '200px' }}
              placeholder="Search name, ID, division..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)} />
          </label>
          {filterName && (
            <button className="btn btn-xs btn-ghost gap-1" onClick={() => setFilterName('')}>✕ Clear</button>
          )}
        </div>

        {/* Bulk selection bar */}
        {selectedRows.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 1rem',
            background: 'color-mix(in oklch, var(--color-primary) 8%, transparent)',
            borderBottom: '1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)',
            flexShrink: 0, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              {selectedRows.length} selected
            </span>
            {bulkDisableCount > 0 && can('DELETE') && (
              <button className="btn btn-xs btn-error btn-outline gap-1"
                onClick={handleBulkDisable} disabled={bulkLoading}>
                {bulkLoading && <span className="loading loading-spinner loading-xs" />}
                Disable {bulkDisableCount > 1 ? `(${bulkDisableCount})` : ''}
              </button>
            )}
            {bulkRestoreCount > 0 && can('RESTORE') && (
              <button className="btn btn-xs btn-info btn-outline gap-1"
                onClick={handleBulkRestore} disabled={bulkLoading}>
                {bulkLoading && <span className="loading loading-spinner loading-xs" />}
                Restore {bulkRestoreCount > 1 ? `(${bulkRestoreCount})` : ''}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-xs" onClick={clearSelection}>Clear</button>
          </div>
        )}

        {/* Grid */}
        <DataGrid
          columnDefs={cols}
          rowData={rows}
          loading={isLoading}
          getRowId={(r) => String(r.id)}
          onRowDoubleClicked={(r) => setManaging(r)}
          onSelectionChanged={setSelectedRows}
          checkboxes
          height="100%"
          hideToolbar
          clearSelectionTrigger={clearTrigger}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.45rem 0.875rem', borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-100)', flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : <>Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems}</>}
              </span>
              <select className="select select-bordered select-xs" value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ fontSize: '0.72rem', height: '1.5rem', minHeight: '1.5rem', paddingBlock: 0 }}>
                {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
            {totalPages > 1 && (
              isMobile ? (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  <button className="join-item btn btn-sm btn-active pointer-events-none">{currentPage + 1} / {totalPages}</button>
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                </div>
              ) : (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={currentPage === 0} onClick={() => setCurrentPage(0)}>«</button>
                  <button className="join-item btn btn-sm" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === '...'
                      ? <button key={`el-${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                      : <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={`join-item btn btn-sm${p === currentPage ? ' btn-active' : ''}`}>
                          {(p as number) + 1}
                        </button>
                  )}
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)}>»</button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} title="New Cabinet User" onClose={() => setCreateOpen(false)} size="lg">
        <NewUserForm onSave={handleCreate} onCancel={() => setCreateOpen(false)} loading={creating} isOldCabinet={isOldCabinet} />
      </Modal>

      {/* Manage modal */}
      <Modal
        open={!!managing}
        title={`Update Record : ${managing?.name ?? ''} (${managing?.id ?? ''})`}
        onClose={() => setManaging(null)}
        size="xl"
      >
        {managing && <ManageUserModal user={managing} onClose={() => setManaging(null)} isOldCabinet={isOldCabinet} allLocations={allLocations?.content} />}
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
