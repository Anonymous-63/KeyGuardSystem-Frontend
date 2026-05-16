import type { CSSProperties, ReactNode } from 'react';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import type { ResourceType } from '@/features/auth/utils/permissions';

const Ico = ({ d, size = '1.35rem' }: { d: string | string[]; size?: string }) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    style={{ width: size, height: size, flexShrink: 0 }}
  >
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />
    ))}
  </svg>
);

export interface PageHeaderProps {
  icon: string | string[];
  title: string;
  resource: ResourceType;
  onAdd?: () => void;
  onUpdate?: () => void;
  onRestore?: () => void;
  onDisable?: () => void;
  addDisabled?: boolean;
  /** true when no row selected */
  updateDisabled?: boolean;
  /** true when selected row is not disabled */
  restoreDisabled?: boolean;
  /** true when selected row is already disabled */
  disableDisabled?: boolean;
  /** page-specific extras rendered between title and buttons (e.g. show-disabled toggle) */
  extra?: ReactNode;
}

// Negative margins cancel out Layout's <main> padding (1rem top/bottom, 1.5rem sides)
// so PageHeader spans the full width of the content area.
const BLEED: CSSProperties = { margin: '-1rem -1.5rem 1rem -1.5rem' };

export default function PageHeader({
  icon,
  title,
  resource,
  onAdd,
  onUpdate,
  onRestore,
  onDisable,
  addDisabled = false,
  updateDisabled = false,
  restoreDisabled = false,
  disableDisabled = false,
  extra,
}: PageHeaderProps) {
  const { canAccess } = usePermissions();

  const can = (action: 'CREATE' | 'UPDATE' | 'RESTORE' | 'DELETE') =>
    canAccess(resource, action);

  const showAdd     = onAdd     != null && can('CREATE');
  const showUpdate  = onUpdate  != null && can('UPDATE');
  const showRestore = onRestore != null && can('RESTORE');
  const showDisable = onDisable != null && can('DELETE');

  return (
    <div style={BLEED}>
      <div
        style={{
          background: 'var(--color-base-100)',
          borderBottom: '1px solid var(--sb-border)',
          padding: '0.625rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-base-content)' }}>
          <Ico d={icon} />
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{title}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Slot for page-specific extras (e.g. show-disabled toggle) */}
        {extra}

        {/* CRUD action buttons */}
        {(showAdd || showUpdate || showRestore || showDisable) && (
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            {showAdd && (
              <button className="btn btn-primary btn-sm gap-1" onClick={onAdd} disabled={addDisabled}>
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add
              </button>
            )}
            {showUpdate && (
              <button
                className="btn btn-warning btn-sm"
                onClick={onUpdate}
                disabled={updateDisabled}
                title={updateDisabled ? 'Select a row first' : undefined}
              >
                Update
              </button>
            )}
            {showRestore && (
              <button
                className="btn btn-info btn-sm"
                onClick={onRestore}
                disabled={restoreDisabled}
                title={restoreDisabled ? 'Select a disabled row first' : undefined}
              >
                Restore
              </button>
            )}
            {showDisable && (
              <button
                className="btn btn-error btn-sm"
                onClick={onDisable}
                disabled={disableDisabled}
                title={disableDisabled ? 'Select an active row first' : undefined}
              >
                Disable
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
