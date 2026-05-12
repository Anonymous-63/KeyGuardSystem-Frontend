import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useListOperatorsQuery,
  useLazyListOperatorsQuery,
  useCreateOperatorMutation,
  useUpdateOperatorMutation,
  useDisableOperatorMutation,
  useRestoreOperatorMutation,
  useChangePasswordMutation,
  useListLocationsForOperatorQuery,
  useAssignLocationToOperatorMutation,
  useRemoveLocationFromOperatorMutation,
} from '../features/operator/operatorApi';
import { useListLocationsQuery } from '../features/location/locationApi';
import type { OperatorResponse, OperatorRequest } from '../types/api';
import { OPERATOR_TYPES } from '../types/api';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../components/shared/Toast';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';
import { useAppSelector } from '../app/hooks';
import { hasPermission } from '../features/auth/permissions';
import { Search, Pencil, Ban, RefreshCw, MapPin, Download } from 'lucide-react';

const PAGE_SIZE = 20;
const DEFAULT_PASSWORD = 'Admin@123';

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

const COUNTRY_CODES = [
  { code: '91',  label: '+91 (India)'     },
  { code: '1',   label: '+1 (USA)'        },
  { code: '44',  label: '+44 (UK)'        },
  { code: '971', label: '+971 (UAE)'      },
  { code: '65',  label: '+65 (Singapore)' },
  { code: '61',  label: '+61 (Australia)' },
];

// ─── Enterprise form primitives ───────────────────────────────────────────────

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.65,
      userSelect: 'none',
    }}>
      {text}
    </span>
    {required && (
      <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1, opacity: 1 }}>*</span>
    )}
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

// ─── Picker dropdown — expands from dashed trigger, stays open on each pick ───
function LocationDropdown({
  available, onAdd, disabled = false,
}: {
  available: { id: number; name: string }[];
  onAdd: (id: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? available.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : available;

  if (!open) {
    return (
      <button type="button" disabled={disabled}
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          width: '100%', padding: '0.38rem 0.625rem',
          fontSize: '0.82rem',
          color: 'var(--color-base-content)',
          background: 'var(--color-base-100)',
          border: '1px dashed var(--color-base-300)',
          borderRadius: '0.375rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}>
        <span style={{ opacity: 0.5 }}>+</span>
        <span style={{ flex: 1, textAlign: 'left', opacity: 0.5 }}>Assign location…</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{available.length} available</span>
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <input autoFocus className="input input-bordered input-sm flex-1"
          placeholder="Search locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }} />
        <button type="button" className="btn btn-ghost btn-sm btn-square"
          onClick={() => { setOpen(false); setSearch(''); }}>✕</button>
      </div>
      <div style={{
        maxHeight: '9rem', overflowY: 'auto',
        border: '1px solid var(--color-base-300)', borderRadius: '0.375rem',
        background: 'var(--color-base-100)',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '0.5rem 0.625rem', fontSize: '0.78rem', opacity: 0.45, textAlign: 'center' }}>
            No matches
          </div>
        ) : filtered.map((l) => (
          <button key={l.id} type="button" disabled={disabled}
            data-loc-row="true"
            onClick={() => onAdd(l.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              width: '100%', padding: '0.35rem 0.625rem',
              fontSize: '0.82rem', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-base-content)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-base-200)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
            <MapPin size={12} strokeWidth={1.5} style={{ opacity: 0.4, flexShrink: 0 }} />
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared assigned list with filter search ──────────────────────────────────
function AssignedList({
  items, onRemove, disabled = false,
}: {
  items: { id: number; name: string }[];
  onRemove: (id: number) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? items.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <>
      {/* Filter bar — only shown when there are assigned items */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.3rem 0.625rem',
        borderBottom: '1px solid var(--color-base-300)',
        background: 'var(--color-base-50, var(--color-base-100))',
      }}>
        <Search size={11} strokeWidth={1.5} style={{ opacity: 0.3, flexShrink: 0 }} />
        <input
          placeholder="Filter assigned…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: '0.78rem', minWidth: 0,
          }}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem' }}>
            ×
          </button>
        )}
      </div>
      {/* Rows */}
      <div style={{ maxHeight: '10rem', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', opacity: 0.35, textAlign: 'center' }}>
            {search ? 'No matches' : 'No locations assigned yet'}
          </div>
        ) : filtered.map((l, i) => (
          <div key={l.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.38rem 0.75rem',
            borderBottom: '1px solid color-mix(in oklch, var(--color-primary) 15%, transparent)',
            fontSize: '0.82rem',
            background: 'color-mix(in oklch, var(--color-primary) 8%, transparent)',
          }}>
            <MapPin size={12} strokeWidth={1.5} style={{ color: 'var(--color-primary)', opacity: 0.5, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-primary)', fontWeight: 500 }}>
              {l.name}
            </span>
            <button type="button" disabled={disabled}
              onClick={() => onRemove(l.id)}
              className="btn btn-ghost btn-xs btn-square"
              style={{ flexShrink: 0, color: 'var(--color-primary)', opacity: 0.6 }}
              title="Remove">
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Location picker — CREATE mode (local state) ──────────────────────────────
function LocationPicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const { data: page } = useListLocationsQuery({ page: 0, size: 200, disabled: false });
  const all       = page?.content ?? [];
  const selSet    = new Set(value);
  const selected  = all.filter((l) => selSet.has(l.id));
  const available = all.filter((l) => !selSet.has(l.id));

  return (
    <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      {/* Assigned section */}
      {selected.length > 0 ? (
        <AssignedList items={selected} onRemove={(id) => onChange(value.filter((v) => v !== id))} />
      ) : (
        <div style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', opacity: 0.35, textAlign: 'center' }}>
          No locations assigned yet
        </div>
      )}
      {/* Picker */}
      {available.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-base-300)', background: 'var(--color-base-200)', padding: '0.4rem 0.625rem' }}>
          <LocationDropdown available={available} onAdd={(id) => onChange([...value, id])} />
        </div>
      )}
      {/* Count footer */}
      <div style={{
        display: 'flex', gap: '1rem',
        padding: '0.22rem 0.75rem',
        borderTop: '1px solid var(--color-base-300)',
        background: 'var(--color-base-200)',
      }}>
        <span style={{ fontSize: '0.7rem' }}>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{selected.length}</span>
          <span style={{ opacity: 0.5 }}> assigned</span>
        </span>
        <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{available.length} available</span>
      </div>
    </div>
  );
}

// ─── Location chips — EDIT mode (immediate save) ──────────────────────────────
function LocationChips({ operatorId }: { operatorId: string }) {
  const { addToast } = useToast();
  const { data: assignedList = [], isLoading } = useListLocationsForOperatorQuery(operatorId);
  const { data: allPage }                      = useListLocationsQuery({ page: 0, size: 200, disabled: false });
  const [assign, { isLoading: assigning }]     = useAssignLocationToOperatorMutation();
  const [remove, { isLoading: removing }]      = useRemoveLocationFromOperatorMutation();

  const all         = allPage?.content ?? [];
  const assignedSet = new Set(assignedList.map((a) => a.locationId));
  const items       = assignedList.map((a) => ({ id: a.locationId, name: a.locationName ?? `#${a.locationId}` }));
  const available   = all.filter((l) => !assignedSet.has(l.id));

  if (isLoading) return (
    <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span className="loading loading-spinner loading-xs" />
      <span style={{ fontSize: '0.78rem', opacity: 0.4 }}>Loading…</span>
    </div>
  );

  const handleAssign = async (locationId: number) => {
    try { await assign({ locationId, operatorId }).unwrap(); }
    catch { addToast({ type: 'error', message: 'Failed to assign location' }); }
  };
  const handleRemove = async (locationId: number) => {
    try { await remove({ locationId, operatorId }).unwrap(); }
    catch { addToast({ type: 'error', message: 'Failed to remove location' }); }
  };

  return (
    <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      {/* Assigned section */}
      {items.length > 0 ? (
        <AssignedList items={items} onRemove={handleRemove} disabled={assigning || removing} />
      ) : (
        <div style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', opacity: 0.35, textAlign: 'center' }}>
          No locations assigned
        </div>
      )}
      {/* Picker */}
      {available.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-base-300)', background: 'var(--color-base-200)', padding: '0.4rem 0.625rem', position: 'relative' }}>
          <LocationDropdown available={available} onAdd={handleAssign} disabled={assigning || removing} />
          {(assigning || removing) && (
            <span className="loading loading-spinner loading-xs"
              style={{ position: 'absolute', right: '0.625rem', top: '0.75rem', pointerEvents: 'none' }} />
          )}
        </div>
      )}
      {/* Count footer */}
      <div style={{
        display: 'flex', gap: '1rem',
        padding: '0.22rem 0.75rem',
        borderTop: '1px solid var(--color-base-300)',
        background: 'var(--color-base-200)',
      }}>
        <span style={{ fontSize: '0.7rem' }}>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{items.length}</span>
          <span style={{ opacity: 0.5 }}> assigned</span>
        </span>
        <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{available.length} available</span>
      </div>
    </div>
  );
}

// ─── Operator form ────────────────────────────────────────────────────────────
function OperatorForm({
  initial, onSave, onCancel, loading, callerType = 1,
}: {
  initial?: OperatorResponse;
  onSave: (data: OperatorRequest, locationIds: number[]) => void;
  onCancel: () => void;
  loading: boolean;
  callerType?: number;
}) {
  const isEdit = !!initial;

  const [name,        setName]        = useState(initial?.name              ?? '');
  const [id,          setId]          = useState(initial?.id                ?? '');
  const [type,        setType]        = useState<number>(initial?.type      ?? 5);
  const [emailId,     setEmailId]     = useState(initial?.emailId           ?? '');
  const [mobileNo,    setMobileNo]    = useState(initial?.mobileNo          ?? '');
  const [countryCode, setCountryCode] = useState(initial?.mobileCountryCode ?? '91');
  const [pendingLocs, setPendingLocs] = useState<number[]>([]);

  const needsLocation = type === 4 || type === 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(isEdit ? {} : { id }),
      name,
      type,
      emailId:           emailId.trim()  || undefined,
      mobileNo:          mobileNo.trim() || undefined,
      mobileCountryCode: countryCode,
    }, isEdit ? [] : pendingLocs);
  };

  const inp = 'input input-bordered w-full';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Operator Type — dropdown ──────────────────────────────────── */}
      <div>
        <FL text="Operator Type" required />
        <select className="select select-bordered w-full"
          value={type} onChange={(e) => setType(Number(e.target.value))}>
          {Object.entries(OPERATOR_TYPES)
            .filter(([k]) => Number(k) >= callerType && Number(k) !== 1)
            .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: 'var(--color-base-content)', opacity: 0.45, lineHeight: 1.4 }}>
          {type === 2 && 'Full database & reporting access across all locations'}
          {type === 3 && 'Manages all locations, operators, and cabinet users'}
          {type === 4 && 'Admin access limited to assigned locations only'}
          {type === 5 && 'Standard access to assigned locations, no admin rights'}
        </p>
      </div>

      {/* ── Assigned Locations (type 4 / 5 only) ─────────────────────── */}
      {needsLocation && (
        <div>
          <FL text="Assigned Locations" />
          {isEdit
            ? <LocationChips operatorId={initial!.id} />
            : <LocationPicker value={pendingLocs} onChange={setPendingLocs} />
          }
        </div>
      )}

      {/* ── Account Info ──────────────────────────────────────────────── */}
      <Sect label="Account Info" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="Operator ID" required />
          <input className={inp}
            value={id} onChange={(e) => setId(e.target.value)}
            disabled={isEdit} required={!isEdit}
            maxLength={50} placeholder="e.g. john_doe" />
          {isEdit && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', opacity: 0.4 }}>
              ID cannot be changed
            </p>
          )}
        </div>
        <div>
          <FL text="Full Name" required />
          <input className={inp}
            value={name} onChange={(e) => setName(e.target.value)}
            required maxLength={30} placeholder="Full display name" />
        </div>
      </div>

      <div>
        <FL text="Email Address" />
        <input type="email" className={inp}
          value={emailId} onChange={(e) => setEmailId(e.target.value)}
          maxLength={100} placeholder="email@example.com" />
      </div>

      {/* ── Contact ───────────────────────────────────────────────────── */}
      <Sect label="Contact" />

      <div>
        <FL text="Mobile Number" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="select select-bordered"
            style={{ width: '148px', flexShrink: 0 }}
            value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <input className={`${inp} flex-1`} style={{ width: 'auto' }} type="tel"
            placeholder="Enter mobile number"
            value={mobileNo} onChange={(e) => setMobileNo(e.target.value)}
            maxLength={15} />
        </div>
      </div>

      {/* ── Form actions ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid var(--color-base-200)',
        paddingTop: '0.875rem', marginTop: '0.125rem',
      }}>
        <div />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '130px' }} disabled={loading}>
            {loading && <span className="loading loading-spinner loading-xs" />}
            {isEdit ? 'Save Changes' : 'Create Operator'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Change password panel ────────────────────────────────────────────────────
function ChangePasswordPanel({ operatorId, isSelf, onClose }: {
  operatorId: string; isSelf: boolean; onClose: () => void;
}) {
  const { addToast } = useToast();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const mismatch = confirmPwd.length > 0 && newPwd !== confirmPwd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) return;
    try {
      await changePassword({
        id: operatorId,
        body: { newPassword: newPwd, ...(isSelf ? { currentPassword: currentPwd } : {}) },
      }).unwrap();
      addToast({ type: 'success', message: 'Password changed successfully' });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Failed to change password' });
    }
  };

  const inp = 'input input-bordered w-full';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {isSelf && (
        <div>
          <FL text="Current Password" required />
          <input type="password" className={inp}
            value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required />
        </div>
      )}
      <div>
        <FL text="New Password" required />
        <input type="password" className={inp}
          value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
          required minLength={6} maxLength={100} />
      </div>
      <div>
        <FL text="Confirm New Password" required />
        <input type="password"
          className={`${inp}${mismatch ? ' input-error' : ''}`}
          value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
          required minLength={6} />
        {mismatch && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--color-error)' }}>
            Passwords do not match
          </p>
        )}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
        borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem',
      }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={isLoading}>
          Back
        </button>
        <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '120px' }}
          disabled={isLoading || !newPwd || mismatch}>
          {isLoading && <span className="loading loading-spinner loading-xs" />}
          Set Password
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab       = 'all' | 'active' | 'disabled';
type ModalView = 'form' | 'pwd';

export default function OperatorsPage() {
  const { addToast } = useToast();
  const operator = useAppSelector((s) => s.auth.operator);

  const can = useCallback(
    (action: 'CREATE' | 'UPDATE' | 'RESTORE' | 'DELETE') =>
      operator != null && hasPermission(operator.type, 'OPERATOR', action),
    [operator],
  );

  const [activeTab,       setActiveTab]       = useState<Tab>('active');
  const [filterSearch,    setFilterSearch]    = useState('');
  const [filterType,      setFilterType]      = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage,   setCurrentPage]   = useState(0);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [modalView,     setModalView]     = useState<ModalView>('form');
  const [editing,       setEditing]       = useState<OperatorResponse | null>(null);
  const [confirmState,  setConfirmState]  = useState<{ op: OperatorResponse; action: 'disable' | 'restore' } | null>(null);
  const [selectedRows,  setSelectedRows]  = useState<OperatorResponse[]>([]);
  const [clearTrigger,  setClearTrigger]  = useState(0);
  const [bulkLoading,   setBulkLoading]   = useState(false);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filterSearch), 300);
    return () => clearTimeout(t);
  }, [filterSearch]);

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, filterType, activeTab]);

  const disabledParam = activeTab === 'all' ? undefined : activeTab === 'active' ? false : true;
  const typeParam     = filterType ? Number(filterType) : undefined;
  const filterBase    = { search: debouncedSearch || undefined, type: typeParam };

  const { data, isLoading } = useListOperatorsQuery({
    ...filterBase, page: currentPage, size: PAGE_SIZE, disabled: disabledParam,
  });
  const { data: countAllData }      = useListOperatorsQuery({ ...filterBase, page: 0, size: 1 });
  const { data: countActiveData }   = useListOperatorsQuery({ ...filterBase, page: 0, size: 1, disabled: false });
  const { data: countDisabledData } = useListOperatorsQuery({ ...filterBase, page: 0, size: 1, disabled: true });

  const counts = {
    all:      countAllData?.totalElements      ?? 0,
    active:   countActiveData?.totalElements   ?? 0,
    disabled: countDisabledData?.totalElements ?? 0,
  };

  const [fetchAll, { isFetching: exportFetching }] = useLazyListOperatorsQuery();

  const [create,  { isLoading: creating  }] = useCreateOperatorMutation();
  const [update,  { isLoading: updating  }] = useUpdateOperatorMutation();
  const [disable, { isLoading: disabling }] = useDisableOperatorMutation();
  const [restore, { isLoading: restoring }] = useRestoreOperatorMutation();
  const [assign]                            = useAssignLocationToOperatorMutation();

  const rows       = data?.content       ?? [];
  const totalItems = data?.totalElements ?? 0;
  const totalPages = data?.totalPages    ?? 1;

  const hasActiveFilters = !!(filterSearch || filterType);
  const clearFilters = () => { setFilterSearch(''); setFilterType(''); };
  const clearSelection = () => { setSelectedRows([]); setClearTrigger((n) => n + 1); };

  const handleExport = async () => {
    if (totalItems === 0) return;
    try {
      const result = await fetchAll({ ...filterBase, disabled: disabledParam, page: 0, size: totalItems }).unwrap();
      const headers = ['ID', 'Name', 'Email', 'Type', 'Status'];
      const csvData = result.content.map((r) => [
        r.id,
        `"${r.name.replace(/"/g, '""')}"`,
        r.emailId ? `"${r.emailId.replace(/"/g, '""')}"` : '',
        OPERATOR_TYPES[r.type] ?? `Type ${r.type}`,
        r.disabled ? 'Disabled' : 'Active',
      ]);
      const csv  = [headers, ...csvData].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'operators.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', message: 'Export failed' });
    }
  };

  const openEdit = (op: OperatorResponse) => {
    setEditing(op); setModalView('form'); setModalOpen(true);
  };

  const handleSave = async (body: OperatorRequest, locationIds: number[] = []) => {
    try {
      if (editing) {
        await update({ id: editing.id, body }).unwrap();
        addToast({ type: 'success', message: 'Operator updated' });
      } else {
        const created = await create({ ...body, password: DEFAULT_PASSWORD }).unwrap();
        for (const locationId of locationIds) {
          try { await assign({ locationId, operatorId: created.id }).unwrap(); } catch {}
        }
        addToast({ type: 'success', message: `Operator created — default password: ${DEFAULT_PASSWORD}` });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Failed to save operator' });
    }
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    try {
      if (confirmState.action === 'disable') await disable(confirmState.op.id).unwrap();
      else                                   await restore(confirmState.op.id).unwrap();
      addToast({
        type: 'success',
        message: confirmState.action === 'disable' ? 'Operator disabled' : 'Operator restored',
      });
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Action failed' });
    }
    setConfirmState(null);
  };

  const handleBulkDisable = async () => {
    const targets = selectedRows.filter((r) => !r.disabled && r.type !== 1);
    if (!targets.length) return;
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((r) => disable(r.id).unwrap()));
      addToast({ type: 'success', message: `${targets.length} operator${targets.length > 1 ? 's' : ''} disabled` });
      clearSelection();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Some disable operations failed' });
    }
    setBulkLoading(false);
  };

  const handleBulkRestore = async () => {
    const targets = selectedRows.filter((r) => r.disabled && r.type !== 1);
    if (!targets.length) return;
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((r) => restore(r.id).unwrap()));
      addToast({ type: 'success', message: `${targets.length} operator${targets.length > 1 ? 's' : ''} restored` });
      clearSelection();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Some restore operations failed' });
    }
    setBulkLoading(false);
  };

  const isSelf = operator?.id === editing?.id;

  const modalTitle = modalView === 'pwd'
    ? `Change Password — ${editing?.name ?? ''}`
    : editing
      ? `Update Record : ${editing.name} (${editing.id})`
      : 'Add New Operator';

  const bulkDisableCount = selectedRows.filter((r) => !r.disabled && r.type !== 1).length;
  const bulkRestoreCount = selectedRows.filter((r) =>  r.disabled && r.type !== 1).length;

  const cols = useMemo<ColDef<OperatorResponse>[]>(() => [
    {
      field: 'id', headerName: 'Operator ID',
      width: 130, minWidth: 90,
    },
    {
      field: 'name', headerName: 'Name',
      flex: 1, minWidth: 130,
    },
    {
      field: 'emailId', headerName: 'Email',
      width: 210, minWidth: 150, hide: isMobile,
      valueFormatter: ({ value }) => (value as string | undefined) ?? '—',
    },
    {
      headerName: 'Type', width: 150, minWidth: 110, hide: isMobile,
      valueGetter: ({ data: d }) => d ? (OPERATOR_TYPES[d.type] ?? `Type ${d.type}`) : '',
    },
    {
      headerName: 'Status', width: 82, minWidth: 72, sortable: false,
      cellRenderer: ({ data: d }: { data: OperatorResponse }) => (
        d.disabled
          ? <span className="badge badge-soft badge-error badge-sm"   style={{ cursor: 'default' }}>Disabled</span>
          : <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
      ),
    },
    {
      headerName: 'Actions',
      width: isMobile ? 62 : 165,
      minWidth: isMobile ? 56 : 155,
      sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: OperatorResponse }) => {
        const isSuperAdminRow  = d.type === 1;
        const isSameLevelPeer  = d.type === operator?.type && d.id !== operator?.id;
        const restricted       = isSuperAdminRow || isSameLevelPeer;
        const canEdit          = can('UPDATE') && !restricted;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
            {canEdit && (isMobile
              ? <button className="btn btn-ghost btn-xs btn-square" title="Edit"
                  onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
                  <Pencil size={16} strokeWidth={1.5} />
                </button>
              : <button className="btn btn-outline btn-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
                  <Pencil size={14} strokeWidth={1.5} /> Edit
                </button>
            )}
            {!d.disabled && can('DELETE') && !restricted && (isMobile
              ? <button className="btn btn-ghost btn-xs btn-square text-error" title="Disable"
                  onClick={(e) => { e.stopPropagation(); setConfirmState({ op: d, action: 'disable' }); }}>
                  <Ban size={16} strokeWidth={1.5} />
                </button>
              : <button className="btn btn-outline btn-error btn-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); setConfirmState({ op: d, action: 'disable' }); }}>
                  <Ban size={14} strokeWidth={1.5} /> Disable
                </button>
            )}
            {d.disabled && can('RESTORE') && !restricted && (isMobile
              ? <button className="btn btn-ghost btn-xs btn-square text-info" title="Restore"
                  onClick={(e) => { e.stopPropagation(); setConfirmState({ op: d, action: 'restore' }); }}>
                  <RefreshCw size={16} strokeWidth={1.5} />
                </button>
              : <button className="btn btn-outline btn-info btn-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); setConfirmState({ op: d, action: 'restore' }); }}>
                  <RefreshCw size={14} strokeWidth={1.5} /> Restore
                </button>
            )}
          </div>
        );
      },
    },
  ], [can, isMobile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)', margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Web Operators
        </h1>
        {can('CREATE') && (
          <button className="btn btn-sm btn-primary gap-1"
            onClick={() => { setEditing(null); setModalView('form'); setModalOpen(true); }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span> Add Operator
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
              const label    = tab === 'all' ? 'All' : tab === 'active' ? 'Active' : 'Disabled';
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.5rem 0.875rem', fontSize: '0.8125rem',
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
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--sb-border)', padding: '0 0.75rem', gap: '0.75rem' }}>
            {!isMobile && (
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : `${totalItems} record${totalItems !== 1 ? 's' : ''}`}
              </span>
            )}
            {can('EXPORT') && (
              <button
                onClick={handleExport}
                disabled={exportFetching || totalItems === 0}
                title="Export all filtered records as CSV"
                className={isMobile ? 'btn btn-sm btn-outline btn-primary btn-square' : 'btn btn-sm btn-outline btn-primary gap-1.5'}
                style={{ fontSize: '0.75rem', height: '1.75rem', minHeight: '1.75rem', paddingInline: isMobile ? undefined : '0.6rem' }}>
                {exportFetching
                  ? <span className="loading loading-spinner loading-xs" />
                  : <Download size={14} strokeWidth={1.5} />}
                {!isMobile && (exportFetching ? 'Exporting…' : 'Export CSV')}
              </button>
            )}
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
              style={{ paddingLeft: '1.8rem', width: isMobile ? '100%' : '240px' }}
              placeholder="Search ID, name, email…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)} />
          </label>
          <select className="select select-bordered select-sm"
            style={{ width: isMobile ? '100%' : '160px' }}
            value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {Object.entries(OPERATOR_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button className="btn btn-xs btn-ghost gap-1" onClick={clearFilters}>
              ✕ Clear
            </button>
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
          onRowDoubleClicked={(r) => {
            const restricted = r.type === 1 || (r.type === operator?.type && r.id !== operator?.id);
            if (can('UPDATE') && !restricted) openEdit(r);
          }}
          onSelectionChanged={setSelectedRows}
          height="100%"
          checkboxes
          hideToolbar
          clearSelectionTrigger={clearTrigger}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: totalPages > 1 ? 'space-between' : 'flex-end',
            padding: '0.45rem 0.875rem',
            borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-100)',
            flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {isLoading ? '…' : (
                <>Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalItems)} of {totalItems}</>
              )}
            </span>
            {totalPages > 1 && (
              isMobile ? (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  <button className="join-item btn btn-sm btn-active pointer-events-none">
                    {currentPage + 1} / {totalPages}
                  </button>
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                </div>
              ) : (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage(0)}>«</button>
                  <button className="join-item btn btn-sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === '...'
                      ? <button key={`el-${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                      : <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={`join-item btn btn-sm${p === currentPage ? ' btn-active' : ''}`}>
                          {(p as number) + 1}
                        </button>
                  )}
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage(totalPages - 1)}>»</button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Edit / Create modal */}
      <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)} size="lg">
        {modalView === 'form' ? (
          <OperatorForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => setModalOpen(false)}
            loading={creating || updating}
            callerType={operator?.type ?? 1}
          />
        ) : (
          editing && (
            <ChangePasswordPanel
              operatorId={editing.id}
              isSelf={isSelf}
              onClose={() => setModalView('form')}
            />
          )
        )}
      </Modal>

      {/* Disable / restore confirm */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.action === 'disable' ? 'Disable Operator' : 'Restore Operator'}
        message={
          confirmState?.action === 'disable'
            ? `Disable "${confirmState?.op.name}"? They will not be able to log in.`
            : `Restore "${confirmState?.op.name}"?`
        }
        confirmLabel={confirmState?.action === 'disable' ? 'Disable' : 'Restore'}
        danger={confirmState?.action === 'disable'}
        loading={disabling || restoring}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
