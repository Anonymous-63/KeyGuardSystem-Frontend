import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { fetchMe } from '@/features/auth/store/authSlice';
import {
  useGetMeQuery,
  useUpdateMyProfileMutation,
  useChangeMyPasswordMutation,
  useListLocationsForOperatorQuery,
} from '@/features/operator/api/operatorApi';
import { useToast } from '@/shared/components/ui/Toast';
import {
  Camera, Eye, EyeOff, MapPin, Shield, User,
  Key, Lock, CheckCircle, Mail, Phone,
} from 'lucide-react';

type PhotoAction = { type: 'upload'; file: File } | { type: 'remove' } | null;


const CLEARANCE_COLOR: Record<number, string> = {
  1: '#6b7280', 2: '#2563eb', 3: '#7c3aed', 4: '#ea580c', 5: '#dc2626',
};

const MAX_LOCATIONS = 8;

// ─── FL label ─────────────────────────────────────────────────────────────────

function FL({ text, required }: { text: string; required?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.28rem' }}>
      <span style={{ fontSize: '0.67rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.5 }}>
        {text}
      </span>
      {required && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>*</span>}
    </div>
  );
}

// ─── Section divider with label ───────────────────────────────────────────────

function SectionDivider({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1.25rem 0 1rem' }}>
      <span style={{ color: 'var(--color-primary)', display: 'flex', opacity: 0.7 }}>{icon}</span>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', opacity: 0.45 }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--color-base-300)' }} />
    </div>
  );
}

// ─── Password input ───────────────────────────────────────────────────────────

function PwInput({ value, onChange, show, setShow, placeholder, error }: {
  value: string; onChange: (v: string) => void;
  show: boolean; setShow: (v: boolean) => void;
  placeholder?: string; error?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input input-bordered w-full"
        style={{ paddingRight: '2.5rem', fontSize: '0.85rem' }}
        autoComplete="off"
      />
      <button type="button" onClick={() => setShow(!show)} style={{
        position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-base-content)', opacity: 0.35, display: 'flex', padding: '0.25rem',
      }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {error && <p style={{ fontSize: '0.68rem', color: 'var(--color-error)', marginTop: '0.2rem', margin: '0.15rem 0 0' }}>{error}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const dispatch     = useAppDispatch();
  const { addToast } = useToast();
  const authOp       = useAppSelector((s) => s.auth.operator);

  const { data: freshOp, refetch } = useGetMeQuery(undefined, {
    skip: !authOp, refetchOnMountOrArgChange: true,
  });
  const op = authOp?.id === freshOp?.id ? (freshOp ?? authOp) : authOp;
  const { data: locations } = useListLocationsForOperatorQuery(op?.id ?? 0, { skip: !op });
  const [updateMe, { isLoading: saving }] = useUpdateMyProfileMutation();

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = windowWidth < 768;

  // Locations expand
  const [showAllLocs, setShowAllLocs] = useState(false);

  // Photo
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto,  setPendingPhoto]  = useState<PhotoAction>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [photoHover,    setPhotoHover]    = useState(false);
  useEffect(() => () => { if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl); }, [localPhotoUrl]);

  // Profile form
  const [name,   setName]   = useState('');
  const [email,  setEmail]  = useState('');
  const [mobile, setMobile] = useState('');
  const [dirty,  setDirty]  = useState(false);

  // Password form
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew,     setPwNew]     = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showCnf,   setShowCnf]   = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [changePassword] = useChangeMyPasswordMutation();

  useEffect(() => {
    if (!op) return;
    setName(op.name ?? '');
    setEmail(op.emailId ?? '');
    setMobile(op.mobileNo ?? '');
    setPendingPhoto(null);
    setLocalPhotoUrl(null);
    setDirty(false);
  }, [op?.id]);

  const currentPhotoSrc = pendingPhoto?.type === 'remove'
    ? null
    : (localPhotoUrl ?? (op?.photoPath ? `/api/v1/operators/${op.id}/photo?v=${encodeURIComponent(op.photoPath)}` : null));
  const savedPhotoSrc = op?.photoPath
    ? `/api/v1/operators/${op.id}/photo?v=${encodeURIComponent(op.photoPath)}`
    : null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(png|jpg|jpeg)$/i.test(file.name)) { e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { e.target.value = ''; return; }
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    setLocalPhotoUrl(URL.createObjectURL(file));
    setPendingPhoto({ type: 'upload', file });
    setDirty(true);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (localPhotoUrl) { URL.revokeObjectURL(localPhotoUrl); setLocalPhotoUrl(null); }
    setPendingPhoto({ type: 'remove' });
    setDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!op) return;
    try {
      await updateMe({
        body: { name: name.trim(), emailId: email.trim() || undefined, mobileNo: mobile.trim() || undefined },
        photo:       pendingPhoto?.type === 'upload' ? pendingPhoto.file : undefined,
        removePhoto: pendingPhoto?.type === 'remove' ? true              : undefined,
      }).unwrap();
      addToast({ type: 'success', message: 'Profile updated' });
      setPendingPhoto(null);
      setDirty(false);
      refetch();
      dispatch(fetchMe());
    } catch (err: unknown) {
      const ex = err as { data?: { message?: string } };
      addToast({ type: 'error', message: ex?.data?.message ?? 'Failed to update profile' });
    }
  };

  const handleDiscard = () => {
    if (!op) return;
    setName(op.name ?? '');
    setEmail(op.emailId ?? '');
    setMobile(op.mobileNo ?? '');
    if (localPhotoUrl) { URL.revokeObjectURL(localPhotoUrl); setLocalPhotoUrl(null); }
    setPendingPhoto(null);
    setDirty(false);
  };

  const pwMismatch = pwConfirm.length > 0 && pwConfirm !== pwNew;
  const pwTooShort = pwNew.length > 0 && pwNew.length < 6;
  const pwCanSubmit = !!(pwCurrent && pwNew && pwConfirm && pwNew === pwConfirm && pwNew.length >= 6);

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwCanSubmit) return;
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: pwCurrent, newPassword: pwNew }).unwrap();
      addToast({ type: 'success', message: 'Password changed successfully' });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err: unknown) {
      const ex = err as { data?: { message?: string } };
      addToast({ type: 'error', message: ex?.data?.message ?? 'Failed to change password' });
    } finally {
      setPwLoading(false);
    }
  };

  if (!op) return null;

  const clearance      = op.role?.permissionLevel ?? 1;
  const clearanceColor = CLEARANCE_COLOR[clearance] ?? '#6b7280';
  const roleName       = op.role?.name ?? 'Unknown Role';
  const initials       = op.name?.slice(0, 2).toUpperCase() ?? '??';
  const allLocs        = locations ?? [];
  const visibleLocs    = showAllLocs ? allLocs : allLocs.slice(0, MAX_LOCATIONS);
  const extraLocCount  = allLocs.length - MAX_LOCATIONS;

  const AVATAR_LG = 120;
  const AVATAR_SM = 72;

  const card: React.CSSProperties = {
    background:   'var(--color-base-100)',
    border:       '1px solid var(--color-base-300)',
    borderRadius: '0.875rem',
    padding:      '1.25rem',
  };

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
    padding: '0.18rem 0.45rem', borderRadius: '9999px',
    fontSize: '0.65rem', fontWeight: 600,
    background: 'color-mix(in oklch, var(--color-primary) 10%, transparent)',
    color: 'var(--color-primary)',
    border: '1px solid color-mix(in oklch, var(--color-primary) 25%, transparent)',
  };

  // ── Left panel — Virink-inspired profile card ─────────────────────────────
  const leftPanel = (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>

      {/* Centered avatar + identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '1rem' }}>
        <div style={{ position: 'relative', width: AVATAR_LG, height: AVATAR_LG, borderRadius: '50%', marginBottom: '0.875rem', border: '3px solid var(--color-primary)', overflow: 'hidden', flexShrink: 0 }}>
          {savedPhotoSrc
            ? <img src={savedPhotoSrc} alt={op.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--color-primary)', color: 'var(--color-primary-content)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: AVATAR_LG * 0.33, fontWeight: 700 }}>{initials}</div>
          }
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>{op.name}</div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', opacity: 0.38, marginTop: '0.2rem' }}>{op.id}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.3rem', marginTop: '0.5rem' }}>
          <span className="badge badge-primary badge-sm" style={{ fontSize: '0.61rem' }}>{roleName}</span>
          <span className="badge badge-sm" style={{ fontSize: '0.61rem', background: `color-mix(in oklch, ${clearanceColor} 15%, transparent)`, color: clearanceColor, border: `1px solid ${clearanceColor}` }}>
            Clearance {clearance}/5
          </span>
        </div>
      </div>

      {/* Email + mobile icon rows */}
      {(op.emailId || op.mobileNo) && (
        <>
          <div style={{ height: '1px', background: 'var(--color-base-200)', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {op.emailId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.78rem' }}>
                <Mail size={13} style={{ opacity: 0.35, flexShrink: 0 }} />
                <span style={{ opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.emailId}</span>
              </div>
            )}
            {op.mobileNo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.78rem' }}>
                <Phone size={13} style={{ opacity: 0.35, flexShrink: 0 }} />
                <span style={{ opacity: 0.65 }}>{op.mobileNo}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Stats: Since | Clearance | Status — Virink style */}
      <div style={{ height: '1px', background: 'var(--color-base-200)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '0.75rem 0' }}>
        {[
          { label: 'Since', value: new Date(op.createdAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) },
          { label: 'Clearance', value: `L${clearance}/5` },
          { label: 'Status', value: op.deleted ? 'Disabled' : 'Active', color: op.deleted ? 'var(--color-error)' : 'var(--color-success)' },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--color-base-200)' : 'none' }}>
            <div style={{ fontSize: '0.62rem', opacity: 0.4, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: color ?? 'inherit' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ height: '1px', background: 'var(--color-base-200)' }} />

      {/* Assigned locations */}
      {visibleLocs.length > 0 && (
        <div style={{ marginTop: '0.875rem' }}>
          <div style={{ fontSize: '0.61rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', opacity: 0.35, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MapPin size={10} strokeWidth={2.5} /> Locations
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {visibleLocs.map((loc) => (
              <span key={loc.locationId} style={pillStyle}>
                <MapPin size={8} strokeWidth={2.5} />
                {loc.locationName ?? `Location #${loc.locationId}`}
              </span>
            ))}
            {!showAllLocs && extraLocCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllLocs(true)}
                style={{ ...pillStyle, background: 'var(--color-base-200)', color: 'var(--color-base-content)', border: '1px solid var(--color-base-300)', cursor: 'pointer', opacity: 0.7 }}
              >
                +{extraLocCount} more
              </button>
            )}
            {showAllLocs && allLocs.length > MAX_LOCATIONS && (
              <button
                type="button"
                onClick={() => setShowAllLocs(false)}
                style={{ ...pillStyle, background: 'var(--color-base-200)', color: 'var(--color-base-content)', border: '1px solid var(--color-base-300)', cursor: 'pointer', opacity: 0.7 }}
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Right panel — edit form + password form, no tabs ──────────────────────
  //
  // Space savings that make both fit without scroll:
  //   • Email + Mobile    → side by side (saves ~55px)
  //   • New + Confirm pw  → side by side (saves ~55px)
  // Total right-card height ≈ 530px, available ≈ 640px → no scroll.
  //
  const rightPanel = (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>

      {/* ── Edit Profile ─────────────────────────────────────────────────── */}
      <SectionDivider icon={<User size={13} strokeWidth={2} />} label="Edit Profile" />

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Photo widget */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem 0.75rem', background: 'var(--color-base-200)', borderRadius: '0.5rem' }}>
          <input ref={photoFileRef} type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handlePhotoSelect} />
          <div
            style={{ position: 'relative', width: AVATAR_SM, height: AVATAR_SM, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, overflow: 'hidden', border: '2px solid var(--color-primary)' }}
            onMouseEnter={() => setPhotoHover(true)}
            onMouseLeave={() => setPhotoHover(false)}
            onClick={() => photoFileRef.current?.click()}
          >
            {(currentPhotoSrc)
              ? <img src={currentPhotoSrc} alt={op.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', background: 'var(--color-primary)', color: 'var(--color-primary-content)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: AVATAR_SM * 0.33, fontWeight: 700 }}>{initials}</div>
            }
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: photoHover ? 1 : 0, transition: 'opacity 0.15s' }}>
              <Camera size={AVATAR_SM * 0.32} color="white" strokeWidth={1.5} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Profile Photo</div>
            <div style={{ fontSize: '0.67rem', opacity: 0.38, marginTop: '0.1rem', marginBottom: '0.4rem' }}>PNG or JPG · max 5 MB</div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => photoFileRef.current?.click()} className="btn btn-xs btn-outline" style={{ fontSize: '0.68rem' }}>
                <Camera size={10} strokeWidth={2} /> Upload
              </button>
              {pendingPhoto?.type === 'remove' ? (
                <button type="button" onClick={() => { setPendingPhoto(null); setLocalPhotoUrl(null); setDirty(true); }} className="btn btn-xs btn-ghost" style={{ fontSize: '0.68rem' }}>Undo</button>
              ) : (currentPhotoSrc || pendingPhoto?.type === 'upload') ? (
                <button type="button" onClick={handleRemovePhoto} className="btn btn-xs btn-ghost" style={{ fontSize: '0.68rem', color: 'var(--color-error)' }}>Remove</button>
              ) : null}
              {pendingPhoto?.type === 'remove' && <span style={{ fontSize: '0.63rem', color: 'var(--color-error)', opacity: 0.8 }}>Will remove on save</span>}
              {pendingPhoto?.type === 'upload' && <span style={{ fontSize: '0.63rem', color: 'var(--color-success)', opacity: 0.8 }}>Ready · save to apply</span>}
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <FL text="Full Name" required />
          <input
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            style={{ fontSize: '0.85rem' }}
            minLength={3} maxLength={30}
          />
        </div>

        {/* Email + Mobile side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <div>
            <FL text="Email Address" />
            <input
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setDirty(true); }}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <FL text="Mobile Number" />
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input
                type="tel"
                className="input input-bordered w-full"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '')); setDirty(true); }}
                style={{ fontSize: '0.85rem' }}
                maxLength={15}
                placeholder="Number"
              />
            </div>
          </div>
        </div>

        {/* Shield notice */}
        <div style={{ fontSize: '0.67rem', opacity: 0.35, padding: '0.35rem 0.6rem', background: 'var(--color-base-200)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Shield size={11} strokeWidth={2} />
          Operator ID, role, and clearance level are managed by an administrator.
        </div>

        {/* Save / Discard */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!dirty || saving || !name.trim() || name.trim().length < 3}
            style={{ gap: '0.35rem' }}
          >
            {saving ? <span className="loading loading-spinner loading-xs" /> : <CheckCircle size={13} strokeWidth={2} />}
            Save Changes
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleDiscard} disabled={!dirty || saving}>
            Discard
          </button>
        </div>
      </form>

      {/* ── Change Password ───────────────────────────────────────────────── */}
      <SectionDivider icon={<Key size={13} strokeWidth={2} />} label="Change Password" />

      <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Current password — full width */}
        <div>
          <FL text="Current Password" required />
          <PwInput value={pwCurrent} onChange={setPwCurrent} show={showCur} setShow={setShowCur} />
        </div>

        {/* New + Confirm side by side — saves ~55px vs stacking */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <div>
            <FL text="New Password" required />
            <PwInput value={pwNew} onChange={setPwNew} show={showNew} setShow={setShowNew} error={pwTooShort ? 'Min 6 chars' : undefined} />
          </div>
          <div>
            <FL text="Confirm Password" required />
            <PwInput value={pwConfirm} onChange={setPwConfirm} show={showCnf} setShow={setShowCnf} error={pwMismatch ? 'Does not match' : undefined} />
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="btn btn-outline btn-sm"
            disabled={!pwCanSubmit || pwLoading}
            style={{ gap: '0.35rem' }}
          >
            {pwLoading ? <span className="loading loading-spinner loading-xs" /> : <Lock size={13} strokeWidth={2} />}
            Change Password
          </button>
        </div>
      </form>
    </div>
  );

  // ── Mobile: stacked, main scrolls ────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: '0.72rem', opacity: 0.4, marginTop: '0.1rem' }}>View and update your personal details</p>
        </div>
        {leftPanel}
        {rightPanel}
      </div>
    );
  }

  /*
   * Desktop — scroll-free layout:
   *
   * position:relative outer + position:absolute inset:0 inner gives the
   * inner div a DEFINITE height regardless of content, breaking the cycle
   * that causes <main> (overflowY:auto) to scroll.
   *
   * 2-column grid — 310px left | 1fr right:
   *   Left  (310px): Virink-style profile card, all fits in viewport height.
   *   Right (1fr):   Single card, edit form + password form, no tabs.
   *                  Email+Mobile side-by-side and New+Confirm side-by-side
   *                  save ~110px so combined height ≈ 530px < 640px available.
   */
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ flexShrink: 0, marginBottom: '0.875rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: '0.72rem', opacity: 0.4, marginTop: '0.1rem' }}>View and update your personal details</p>
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '310px 1fr',
          gridTemplateRows: '1fr',
          gap: '0.875rem',
          overflow: 'hidden',
        }}>
          {/* Left */}
          <div style={{ overflowY: 'auto', minHeight: 0, paddingBottom: '0.5rem' }}>
            {leftPanel}
          </div>
          {/* Right */}
          <div style={{ overflowY: 'auto', minHeight: 0, paddingBottom: '0.5rem' }}>
            {rightPanel}
          </div>
        </div>

      </div>
    </div>
  );
}
