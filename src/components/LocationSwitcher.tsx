import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setSelectedLocation, clearSelectedLocation, selectSelectedLocation } from '../features/location/locationSlice';

// Only types 3/4/5 get a location filter — Super Admin and DB Admin see all data.
const LOCATION_SWITCH_MIN_TYPE = 3;

export default function LocationSwitcher() {
  const dispatch   = useAppDispatch();
  const operator   = useAppSelector((s) => s.auth.operator);
  const selected   = useAppSelector(selectSelectedLocation);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!operator || operator.type < LOCATION_SWITCH_MIN_TYPE) return null;

  const locations     = operator.assignedLocations ?? [];
  const showAllOption = operator.type === 3; // All-Loc Admin only
  const label         = selected?.name ?? 'All Locations';

  const handleSelect = (id: number | null, name: string | null) => {
    if (id !== null && name !== null) dispatch(setSelectedLocation({ id, name }));
    else dispatch(clearSelectedLocation());
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          background: selected ? 'var(--color-primary-content, #e0f2fe)' : 'var(--color-base-200)',
          border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
          borderRadius: '2rem',
          padding: '0.275rem 0.6rem 0.275rem 0.45rem',
          fontSize: '0.7875rem',
          color: selected ? 'var(--color-primary)' : 'var(--color-base-content)',
          cursor: 'pointer',
          fontWeight: selected ? 600 : 500,
          maxWidth: '200px',
        }}
      >
        <MapPin
          size={13} strokeWidth={2}
          style={{ color: selected ? 'var(--color-primary)' : 'var(--sb-text-muted)', flexShrink: 0 }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {label}
        </span>
        <ChevronDown size={11} strokeWidth={2.5} style={{ flexShrink: 0, opacity: 0.55 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 0.35rem)', left: 0, zIndex: 200,
          background: 'var(--color-base-100)',
          border: '1px solid var(--color-base-300)',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: '180px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.35rem 0.875rem 0.2rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06rem', color: 'var(--sb-text-muted)' }}>
            Switch Location
          </div>

          {showAllOption && (
            <LocOption
              label="All Locations"
              active={selected === null}
              onClick={() => handleSelect(null, null)}
            />
          )}

          {locations.length === 0 && (
            <p style={{ padding: '0.6rem 0.875rem', fontSize: '0.8rem', color: 'var(--sb-text-muted)', margin: 0 }}>
              No locations assigned
            </p>
          )}

          {locations.map((loc) => (
            <LocOption
              key={loc.id}
              label={loc.name}
              active={selected?.id === loc.id}
              onClick={() => handleSelect(loc.id, loc.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LocOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '0.5rem', padding: '0.5rem 0.875rem',
        background: active || hover ? 'var(--color-base-200)' : 'none',
        border: 'none', cursor: 'pointer',
        fontSize: '0.8125rem', color: active ? 'var(--color-primary)' : 'var(--color-base-content)',
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {active && <Check size={13} strokeWidth={2.5} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
    </button>
  );
}
