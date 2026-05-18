import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useUploadOperatorPhotoMutation,
  useBulkDisableOperatorsMutation,
  useBulkRestoreOperatorsMutation,
} from '@/features/operator/api/operatorApi';
import { useListLocationsQuery } from '@/features/location/api/locationApi';
import { useListRolesQuery } from '@/features/roles/api/rolesApi';
import type { OperatorResponse, OperatorRequest, Role } from '@/shared/types/api';
import { SUPER_ADMIN_LEVEL } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';
import { useAppSelector } from '@/app/store/hooks';
import { operatorClearance } from '@/features/auth/utils/permissions';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import { Search, Pencil, Ban, RefreshCw, MapPin, Download, Camera, User } from 'lucide-react';

const DEFAULT_PASSWORD = 'Admin@123';
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}


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
        ) : filtered.map((l) => (
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
function LocationChips({ operatorId }: { operatorId: number }) {
  const { addToast } = useToast();
  const { data: assignedList = [], isLoading } = useListLocationsForOperatorQuery(operatorId);
  const { data: allPage }                      = useListLocationsQuery({ page: 0, size: 200, disabled: false });
  const [assign, { isLoading: assigning }]     = useAssignLocationToOperatorMutation();
  const [remove, { isLoading: removing }]      = useRemoveLocationFromOperatorMutation();

  const all         = allPage?.content ?? [];
  const assignedSet = new Set(assignedList.map((a) => a.locationId));
  const items       = assignedList.map((a) => ({ id: a.locationId, name: a.locationName ?? '—' }));
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

// ─── Photo action type ────────────────────────────────────────────────────────
type PhotoAction = { type: 'upload'; file: File } | { type: 'remove' } | null;

// ─── Operator form ────────────────────────────────────────────────────────────
function OperatorForm({
  initial, onSave, onCancel, loading, callerClearance = 5, callerIsSuperAdmin = false, roles = [], isMobile = false,
}: {
  initial?: OperatorResponse;
  onSave: (data: OperatorRequest, locationIds: number[], photoAction: PhotoAction) => void;
  onCancel: () => void;
  loading: boolean;
  callerClearance?: number;
  callerIsSuperAdmin?: boolean;
  roles?: Role[];
  isMobile?: boolean;
}) {
  const isEdit = !!initial;

  const [name,        setName]        = useState(initial?.name      ?? '');
  const [username,    setUsername]    = useState(initial?.username   ?? '');
  const [roleId,      setRoleId]      = useState<number | undefined>(initial?.role?.id);
  const [emailId,     setEmailId]     = useState(initial?.emailId   ?? '');
  const [mobileNo,    setMobileNo]    = useState(initial?.mobileNo  ?? '');
  const [pendingLocs, setPendingLocs] = useState<number[]>([]);

  const photoFileRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto,  setPendingPhoto]  = useState<PhotoAction>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [photoHover,    setPhotoHover]    = useState(false);

  useEffect(() => {
    return () => { if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl); };
  }, [localPhotoUrl]);

  const hasOriginalPhoto = isEdit && !!initial?.photoPath;
  const currentPhotoSrc = pendingPhoto?.type === 'remove'
    ? null
    : (localPhotoUrl
        ?? (hasOriginalPhoto
          ? `/api/v1/operators/${initial!.id}/photo?v=${encodeURIComponent(initial!.photoPath!)}`
          : null));

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(png|jpg|jpeg)$/i.test(file.name)) { e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { e.target.value = ''; return; }
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    setLocalPhotoUrl(URL.createObjectURL(file));
    setPendingPhoto({ type: 'upload', file });
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (localPhotoUrl) { URL.revokeObjectURL(localPhotoUrl); setLocalPhotoUrl(null); }
    setPendingPhoto({ type: 'remove' });
  };

  // Super Admin can assign any regular role; others are limited to their own level.
  // Super Admin role (level 0) is never assignable via the form.
  const availableRoles = roles.filter(
    (r) => !r.deleted && r.permissionLevel > SUPER_ADMIN_LEVEL &&
           (callerIsSuperAdmin || r.permissionLevel <= callerClearance)
  );
  const selectedRole   = availableRoles.find((r) => r.id === roleId);
  const needsLocation  = (selectedRole?.permissionLevel ?? 0) <= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(isEdit ? {} : { username }),
      name,
      roleId,
      emailId:  emailId.trim()  || undefined,
      mobileNo: mobileNo.trim() || undefined,
    }, isEdit ? [] : pendingLocs, pendingPhoto);
  };

  const inp = 'input input-bordered w-full';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Profile Photo ──────────────────────────────────────────────── */}
      <>
        <input ref={photoFileRef} type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handlePhotoSelect} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem', paddingBottom: '1.125rem', borderBottom: '1px solid var(--color-base-200)' }}>

            {/* Avatar + camera badge */}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <div
                onClick={() => photoFileRef.current?.click()}
                onMouseEnter={() => setPhotoHover(true)}
                onMouseLeave={() => setPhotoHover(false)}
                style={{
                  width: '5.5rem', height: '5.5rem', borderRadius: '50%',
                  background: currentPhotoSrc ? 'var(--color-base-200)' : 'var(--ent-dark)',
                  border: currentPhotoSrc
                    ? '3px solid var(--color-primary)'
                    : `3px dashed ${photoHover ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
                  cursor: 'pointer',
                  overflow: 'hidden', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: currentPhotoSrc
                    ? '0 0 0 4px color-mix(in oklch, var(--color-primary) 15%, transparent)'
                    : photoHover
                      ? '0 0 0 4px color-mix(in oklch, var(--color-primary) 10%, transparent)'
                      : 'none',
                }}
              >
                {currentPhotoSrc
                  ? <img src={currentPhotoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <User size={32} strokeWidth={1.25} style={{ color: 'white', opacity: 0.7 }} />
                }
                {photoHover && currentPhotoSrc && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={22} color="white" strokeWidth={1.75} />
                  </div>
                )}
              </div>

              {/* Camera badge */}
              <button
                type="button"
                onClick={() => photoFileRef.current?.click()}
                style={{
                  position: 'absolute', bottom: '3px', right: '3px',
                  width: '1.625rem', height: '1.625rem', borderRadius: '50%',
                  background: 'var(--color-primary)',
                  border: '2.5px solid var(--color-base-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                  transition: 'background 0.15s',
                  padding: 0,
                }}
              >
                <Camera size={11} color="white" strokeWidth={2} />
              </button>
            </div>

            {/* Status / hint */}
            <div style={{ textAlign: 'center' }}>
              {currentPhotoSrc ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>✓ Photo set</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.3 }}>·</span>
                  <button type="button"
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: 'var(--color-primary)', cursor: 'pointer', opacity: 0.75 }}
                    onClick={() => photoFileRef.current?.click()}>
                    Replace
                  </button>
                  <span style={{ fontSize: '0.65rem', opacity: 0.3 }}>·</span>
                  <button type="button"
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: 'var(--color-error)', cursor: 'pointer', opacity: 0.75 }}
                    onClick={handleRemovePhoto}>
                    Remove
                  </button>
                </div>
              ) : pendingPhoto?.type === 'remove' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-error)', fontWeight: 600 }}>✕ Photo will be removed</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.3 }}>·</span>
                  <button type="button"
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: 'var(--color-primary)', cursor: 'pointer', opacity: 0.75 }}
                    onClick={() => setPendingPhoto(null)}>
                    Undo
                  </button>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--sb-text-muted)', opacity: 0.55 }}>
                  Click avatar to upload · PNG or JPG · max 5 MB
                </p>
              )}
            </div>
          </div>
        </>

      {/* ── Role — dynamic dropdown ───────────────────────────────────── */}
      <div>
        <FL text="Role" required />
        <select className="select select-bordered w-full"
          value={roleId ?? ''} onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : undefined)}
          required>
          <option value="">Select role…</option>
          {availableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {selectedRole?.description && (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: 'var(--color-base-content)', opacity: 0.45, lineHeight: 1.4 }}>
            {selectedRole.description}
          </p>
        )}
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="Username" required />
          <input className={inp}
            value={username} onChange={(e) => setUsername(e.target.value)}
            disabled={isEdit} required={!isEdit}
            maxLength={50} placeholder="e.g. john_doe"
            pattern="^[a-zA-Z0-9_]{3,50}$" title="3–50 chars: letters, digits, underscore" />
          {isEdit && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', opacity: 0.4 }}>
              Username cannot be changed
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
        <input className={inp} type="tel"
          placeholder="Enter mobile number"
          value={mobileNo} onChange={(e) => setMobileNo(e.target.value)}
          maxLength={15} />
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
  operatorId: number; isSelf: boolean; onClose: () => void;
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

  const { canAccess, isSuperAdmin } = usePermissions();

  const can = useCallback(
    (action: 'CREATE' | 'UPDATE' | 'RESTORE' | 'DELETE' | 'EXPORT') => canAccess('OPERATOR', action),
    [canAccess],
  );

  const [activeTab,       setActiveTab]       = useState<Tab>('active');
  const [filterSearch,    setFilterSearch]    = useState('');
  const [filterRoleId,    setFilterRoleId]    = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage,   setCurrentPage]   = useState(0);
  const [pageSize,      setPageSize]      = useState(20);
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

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, filterRoleId, activeTab, pageSize]);

  const deletedParam = activeTab === 'all' ? undefined : activeTab === 'active' ? false : true;
  const roleIdParam  = filterRoleId ? Number(filterRoleId) : undefined;
  const filterBase   = { search: debouncedSearch || undefined, roleId: roleIdParam };

  const { data, isLoading } = useListOperatorsQuery({
    ...filterBase, page: currentPage, size: pageSize, deleted: deletedParam,
  });
  const { data: countAllData }      = useListOperatorsQuery({ ...filterBase, page: 0, size: 1 });
  const { data: countActiveData }   = useListOperatorsQuery({ ...filterBase, page: 0, size: 1, deleted: false });
  const { data: countDisabledData } = useListOperatorsQuery({ ...filterBase, page: 0, size: 1, deleted: true });

  const counts = {
    all:      countAllData?.totalElements      ?? 0,
    active:   countActiveData?.totalElements   ?? 0,
    disabled: countDisabledData?.totalElements ?? 0,
  };

  const { data: roles = [] } = useListRolesQuery();

  const [fetchAll, { isFetching: exportFetching }] = useLazyListOperatorsQuery();

  const [create,       { isLoading: creating  }] = useCreateOperatorMutation();
  const [update,       { isLoading: updating  }] = useUpdateOperatorMutation();
  const [disable,      { isLoading: disabling }] = useDisableOperatorMutation();
  const [restore,      { isLoading: restoring }] = useRestoreOperatorMutation();
  const [assign]                                 = useAssignLocationToOperatorMutation();
  const [uploadPhoto]                            = useUploadOperatorPhotoMutation();
  const [bulkDisable]                            = useBulkDisableOperatorsMutation();
  const [bulkRestore]                            = useBulkRestoreOperatorsMutation();

  const rows       = data?.content       ?? [];
  const totalItems = data?.totalElements ?? 0;
  const totalPages = data?.totalPages    ?? 1;

  const callerClearance = operatorClearance(operator);
  const hasActiveFilters = !!(filterSearch || filterRoleId);
  const clearFilters = () => { setFilterSearch(''); setFilterRoleId(''); };
  const clearSelection = () => { setSelectedRows([]); setClearTrigger((n) => n + 1); };

  const handleExport = async () => {
    if (totalItems === 0) return;
    try {
      const result = await fetchAll({ ...filterBase, deleted: deletedParam, page: 0, size: totalItems }).unwrap();
      const headers = ['Username', 'Name', 'Email', 'Role', 'Status'];
      const csvData = result.content.map((r) => [
        r.username,
        `"${r.name.replace(/"/g, '""')}"`,
        r.emailId ? `"${r.emailId.replace(/"/g, '""')}"` : '',
        r.role?.name ?? '—',
        r.deleted ? 'Disabled' : 'Active',
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

  const handleSave = async (body: OperatorRequest, locationIds: number[] = [], photoAction: PhotoAction = null) => {
    try {
      if (editing) {
        // Update: photo merged into single API call → single audit entry
        await update({
          id: editing.id,
          body,
          photo: photoAction?.type === 'upload' ? photoAction.file : undefined,
          removePhoto: photoAction?.type === 'remove' ? true : undefined,
        }).unwrap();
        addToast({ type: 'success', message: 'Operator updated' });
      } else {
        const created = await create({ ...body, password: DEFAULT_PASSWORD }).unwrap();
        const operatorId = created.id;
        for (const locationId of locationIds) {
          try { await assign({ locationId, operatorId }).unwrap(); } catch {}
        }
        if (photoAction?.type === 'upload') {
          const fd = new FormData();
          fd.append('file', photoAction.file);
          try {
            await uploadPhoto({ id: operatorId, file: fd }).unwrap();
          } catch {
            addToast({ type: 'error', message: 'Operator created but photo upload failed' });
          }
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
    const ids = selectedRows.filter((r) => !r.deleted && (r.role?.permissionLevel ?? 1) !== SUPER_ADMIN_LEVEL).map((r) => r.id);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      const count = await bulkDisable(ids).unwrap();
      addToast({ type: 'success', message: `${count} operator${count !== 1 ? 's' : ''} disabled` });
      clearSelection();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Bulk disable failed' });
    }
    setBulkLoading(false);
  };

  const handleBulkRestore = async () => {
    const ids = selectedRows.filter((r) => r.deleted && (r.role?.permissionLevel ?? 1) !== SUPER_ADMIN_LEVEL).map((r) => r.id);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      const count = await bulkRestore(ids).unwrap();
      addToast({ type: 'success', message: `${count} operator${count !== 1 ? 's' : ''} restored` });
      clearSelection();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Bulk restore failed' });
    }
    setBulkLoading(false);
  };

  const isSelf = operator?.id === editing?.id;

  const modalTitle = modalView === 'pwd'
    ? `Change Password — ${editing?.name ?? ''}`
    : editing
      ? `Update Record : ${editing.name} (${editing.username})`
      : 'Add New Operator';

  const bulkDisableCount = selectedRows.filter((r) => !r.deleted && (r.role?.permissionLevel ?? 1) !== SUPER_ADMIN_LEVEL).length;
  const bulkRestoreCount = selectedRows.filter((r) =>  r.deleted && (r.role?.permissionLevel ?? 1) !== SUPER_ADMIN_LEVEL).length;

  const cols = useMemo<ColDef<OperatorResponse>[]>(() => [
    {
      headerName: '', width: 52, minWidth: 52, sortable: false, resizable: false, suppressMovable: true,
      cellRenderer: ({ data: d }: { data: OperatorResponse }) => {
        const photoSrc = d.photoPath
          ? `/api/v1/operators/${d.id}/photo?v=${encodeURIComponent(d.photoPath)}`
          : null;
        return (
          <div style={{
            width: '2rem', height: '2rem', borderRadius: '50%',
            background: photoSrc ? 'var(--color-base-200)' : 'var(--color-base-300)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            border: photoSrc ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-base-300)',
          }}>
            {photoSrc
              ? <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <User size={14} strokeWidth={1.5} style={{ color: 'var(--color-base-content)', opacity: 0.4 }} />
            }
          </div>
        );
      },
    },
    {
      field: 'username', headerName: 'Username',
      width: 130, minWidth: 90,
    },
    {
      field: 'name', headerName: 'Name',
      flex: 1, minWidth: 130,
    },
    {
      field: 'emailId', headerName: 'Email',
      width: 210, minWidth: 150,
      valueFormatter: ({ value }) => (value as string | undefined) ?? '—',
    },
    {
      headerName: 'Role', width: 150, minWidth: 110,
      valueGetter: ({ data: d }) => d ? (d.role?.name ?? '—') : '',
    },
    {
      headerName: 'Status', width: 82, minWidth: 72, sortable: false,
      cellRenderer: ({ data: d }: { data: OperatorResponse }) => (
        d.deleted
          ? <span className="badge badge-soft badge-error badge-sm"   style={{ cursor: 'default' }}>Disabled</span>
          : <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
      ),
    },
    {
      headerName: 'Actions',
      width: 165, minWidth: 155,
      sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: OperatorResponse }) => {
        const targetClearance  = d.role?.permissionLevel ?? 1;
        const isSuperAdminRow  = targetClearance === SUPER_ADMIN_LEVEL;
        const isPeerOrHigher   = !isSuperAdmin && targetClearance >= callerClearance && d.id !== operator?.id;
        const restricted       = isSuperAdminRow || isPeerOrHigher;
        const canEdit          = can('UPDATE') && !restricted;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
            {canEdit && (
              <button className="btn btn-outline btn-xs gap-1"
                onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
                <Pencil size={14} strokeWidth={1.5} /> Edit
              </button>
            )}
            {!d.deleted && can('DELETE') && !restricted && (
              <button className="btn btn-outline btn-error btn-xs gap-1"
                onClick={(e) => { e.stopPropagation(); setConfirmState({ op: d, action: 'disable' }); }}>
                <Ban size={14} strokeWidth={1.5} /> Disable
              </button>
            )}
            {d.deleted && can('RESTORE') && !restricted && (
              <button className="btn btn-outline btn-info btn-xs gap-1"
                onClick={(e) => { e.stopPropagation(); setConfirmState({ op: d, action: 'restore' }); }}>
                <RefreshCw size={14} strokeWidth={1.5} /> Restore
              </button>
            )}
          </div>
        );
      },
    },
  ], [can]);

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
            value={filterRoleId} onChange={(e) => setFilterRoleId(e.target.value)}>
            <option value="">All Roles</option>
            {roles.filter((r) => !r.deleted).map((r) => (
              <option key={r.id} value={String(r.id)}>{r.name}</option>
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
            const tClearance = r.role?.permissionLevel ?? 1;
            const isSuperAdminTarget = tClearance === SUPER_ADMIN_LEVEL;
            const restricted = isSuperAdminTarget || (!isSuperAdmin && tClearance >= callerClearance && r.id !== operator?.id);
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
            justifyContent: 'space-between',
            padding: '0.45rem 0.875rem',
            borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-100)',
            flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : (
                  <>Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems}</>
                )}
              </span>
              <select
                className="select select-bordered select-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ fontSize: '0.72rem', height: '1.5rem', minHeight: '1.5rem', paddingBlock: 0 }}>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            </div>
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
            callerClearance={callerClearance}
            callerIsSuperAdmin={isSuperAdmin}
            roles={roles}
            isMobile={isMobile}
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
