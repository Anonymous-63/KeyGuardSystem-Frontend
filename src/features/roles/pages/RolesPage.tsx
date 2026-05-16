import { useState } from 'react';
import {
  useListRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '@/features/roles/api/rolesApi';
import type { Role, RoleRequest } from '@/shared/types/api';
import { MAX_ROLES, SUPER_ADMIN_LEVEL } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import { Pencil, Trash2, ShieldAlert, Lock } from 'lucide-react';

// Gradient: low levels green, high levels red.
function levelColor(level: number): string {
  const ratio = (level - 1) / Math.max(MAX_ROLES - 1, 1);
  if (ratio < 0.2)  return '#10b981';
  if (ratio < 0.4)  return '#3b82f6';
  if (ratio < 0.6)  return '#8b5cf6';
  if (ratio < 0.8)  return '#f97316';
  return '#ef4444';
}

// ─── Form primitives ──────────────────────────────────────────────────────────

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.65,
    }}>
      {text}
    </span>
    {required && (
      <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1 }}>*</span>
    )}
  </div>
);

// ─── Role form ────────────────────────────────────────────────────────────────

function RoleForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: Role;
  onSave: (data: RoleRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const isEdit   = !!initial;
  const isSystem = isEdit && initial!.systemRole;

  const [name,        setName]        = useState(initial?.name        ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [level,       setLevel]       = useState<number>(initial?.permissionLevel ?? 1);

  const color = levelColor(level);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name: name.trim(), description: description.trim() || undefined, permissionLevel: level });
  };

  const levelOptions = Array.from({ length: MAX_ROLES }, (_, i) => i + 1).reverse();

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      <div>
        <FL text="Role Name" required />
        <input className="input input-bordered w-full"
          value={name} onChange={(e) => setName(e.target.value)}
          required minLength={2} maxLength={50}
          placeholder="e.g. Supervisor" />
      </div>

      <div>
        <FL text="Description" />
        <textarea className="textarea textarea-bordered w-full"
          value={description} onChange={(e) => setDescription(e.target.value)}
          maxLength={255} rows={2}
          placeholder="Brief description of this role's responsibilities" />
      </div>

      <div>
        <FL text="Permission Level" required />
        <select className="select select-bordered w-full"
          value={level} onChange={(e) => setLevel(Number(e.target.value))}
          disabled={isSystem}
          required>
          {levelOptions.map((l) => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>
        {isSystem ? (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Lock size={11} strokeWidth={2} />
            System role — permission level is locked
          </p>
        ) : (
          <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.18rem 0.55rem', borderRadius: '9999px',
              background: `${color}18`, border: `1px solid ${color}40`,
              fontSize: '0.72rem', fontWeight: 600, color,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
              Level {level} of {MAX_ROLES}
            </span>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
        borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem',
      }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '110px' }} disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          {isEdit ? 'Save Changes' : 'Create Role'}
        </button>
      </div>
    </form>
  );
}

// ─── Level badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: number }) {
  if (level === SUPER_ADMIN_LEVEL) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
        padding: '0.16rem 0.5rem', borderRadius: '9999px',
        background: '#7c3aed18', border: '1px solid #7c3aed35',
        fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
        Super Admin
      </span>
    );
  }
  const color = levelColor(level);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
      padding: '0.16rem 0.5rem', borderRadius: '9999px',
      background: `${color}18`, border: `1px solid ${color}35`,
      fontSize: '0.68rem', fontWeight: 600, color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      Level {level}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { addToast } = useToast();
  const { isSuperAdmin } = usePermissions();

  const { data: roles = [], isLoading } = useListRolesQuery();
  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteRoleMutation();

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (r: Role) => { setEditing(r); setModalOpen(true); };

  const handleSave = async (body: RoleRequest) => {
    try {
      if (editing) {
        await updateRole({ id: editing.id, body }).unwrap();
        addToast({ type: 'success', message: 'Role updated' });
      } else {
        await createRole(body).unwrap();
        addToast({ type: 'success', message: 'Role created' });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Failed to save role' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id).unwrap();
      addToast({ type: 'success', message: `Role "${deleteTarget.name}" deleted` });
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Failed to delete role' });
    }
    setDeleteTarget(null);
  };

  const modalTitle = editing ? `Edit Role — ${editing.name}` : 'Create Role';

  // Super Admin role (level 0) is fixed and hidden — not shown or editable
  const sorted = [...roles]
    .filter((r) => r.permissionLevel !== SUPER_ADMIN_LEVEL)
    .sort((a, b) => b.permissionLevel - a.permissionLevel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)', margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Roles
        </h1>
        <span style={{ fontSize: '0.72rem', opacity: 0.4 }}>
          {sorted.length} / {MAX_ROLES} roles
        </span>
        {isSuperAdmin && sorted.length < MAX_ROLES - 1 && (
          <button className="btn btn-sm btn-primary gap-1" onClick={openCreate}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span> Add Role
          </button>
        )}
      </div>

      {/* Roles card */}
      <div className="bg-base-100 shadow-sm"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '0.5rem', overflow: 'hidden' }}>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 2fr 100px 90px 120px',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid var(--color-base-300)',
          background: 'var(--color-base-200)',
        }}>
          {['Role Name', 'Description', 'Level', 'Status', 'Actions'].map((h) => (
            <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.5 }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
              <span className="loading loading-spinner loading-sm" />
              <span style={{ fontSize: '0.85rem', opacity: 0.45 }}>Loading roles…</span>
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.4, fontSize: '0.875rem' }}>
              No roles found
            </div>
          ) : sorted.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              isSuperAdmin={isSuperAdmin}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>

        {/* Footer summary */}
        {!isLoading && sorted.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.4rem 1rem',
            borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-200)',
          }}>
            <span style={{ fontSize: '0.72rem', opacity: 0.5 }}>
              <span style={{ fontWeight: 600, opacity: 1 }}>{sorted.length}</span> roles total
              {' · '}
              <span style={{ fontWeight: 600, opacity: 1 }}>
                {sorted.filter((r) => r.systemRole).length}
              </span> system
              {' · '}
              <span style={{ fontWeight: 600, opacity: 1 }}>
                {sorted.filter((r) => !r.systemRole).length}
              </span> custom
              {' · '}
              max level <span style={{ fontWeight: 600, opacity: 1 }}>{MAX_ROLES}</span>
            </span>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)} size="md">
        <RoleForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
          loading={creating || updating}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone. Operators assigned this role must be reassigned first.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Role row ─────────────────────────────────────────────────────────────────

function RoleRow({
  role, isSuperAdmin, onEdit, onDelete,
}: {
  role: Role;
  isSuperAdmin: boolean;
  onEdit: (r: Role) => void;
  onDelete: (r: Role) => void;
}) {
  const color = levelColor(role.permissionLevel);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 2fr 100px 90px 120px',
      alignItems: 'center',
      padding: '0.625rem 1rem',
      borderBottom: '1px solid var(--color-base-200)',
      transition: 'background 0.1s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-base-50, color-mix(in oklch, var(--color-base-100) 50%, transparent))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
    >
      {/* Name + system badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: color, flexShrink: 0,
          boxShadow: `0 0 0 3px ${color}25`,
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-base-content)' }}>
              {role.name}
            </span>
            {role.systemRole && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                padding: '0.08rem 0.4rem', borderRadius: '9999px',
                background: 'color-mix(in oklch, var(--color-warning) 12%, transparent)',
                border: '1px solid color-mix(in oklch, var(--color-warning) 30%, transparent)',
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em',
                color: 'color-mix(in oklch, var(--color-warning) 80%, var(--color-base-content))',
              }}>
                <Lock size={8} strokeWidth={2.5} />
                SYSTEM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <span style={{
        fontSize: '0.8rem', opacity: 0.5,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        paddingRight: '0.5rem',
      }}>
        {role.description ?? '—'}
      </span>

      {/* Level badge */}
      <div><LevelBadge level={role.permissionLevel} /></div>

      {/* Status */}
      <div>
        {role.deleted
          ? <span className="badge badge-soft badge-error badge-sm" style={{ cursor: 'default' }}>Disabled</span>
          : <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
        }
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {isSuperAdmin && role.permissionLevel !== SUPER_ADMIN_LEVEL && (
          <button className="btn btn-outline btn-xs gap-1"
            onClick={() => onEdit(role)}>
            <Pencil size={12} strokeWidth={1.5} /> Edit
          </button>
        )}
        {isSuperAdmin && !role.systemRole ? (
          <button className="btn btn-outline btn-error btn-xs gap-1"
            onClick={() => onDelete(role)}>
            <Trash2 size={12} strokeWidth={1.5} /> Delete
          </button>
        ) : isSuperAdmin && role.systemRole ? (
          <span title="System roles cannot be deleted"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', opacity: 0.35, padding: '0 0.25rem' }}>
            <ShieldAlert size={12} strokeWidth={1.5} /> Protected
          </span>
        ) : null}
      </div>
    </div>
  );
}
