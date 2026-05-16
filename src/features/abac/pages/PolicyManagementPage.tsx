import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useListPoliciesQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useTogglePolicyMutation,
  useDeletePolicyMutation,
  useEvaluatePolicyMutation,
  useReloadPolicyCacheMutation,
  useGetPolicyVersionsQuery,
} from '@/features/abac/api/abacApi';
import { useListRolesQuery } from '@/features/roles/api/rolesApi';
import { useListLocationsQuery } from '@/features/location/api/locationApi';
import type {
  PolicyResponse, PolicyRequest, PolicyListParams,
  EvaluateRequest, EvaluateResult, Role, LocationResponse,
} from '@/shared/types/api';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';
import { useToast } from '@/shared/components/ui/Toast';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import {
  ShieldCheck, ShieldX, Plus, Pencil, Trash2,
  RefreshCw, Search, History, Play, BookOpen, X,
  Power,
} from 'lucide-react';

const PAGE_SIZE = 20;
type Tab = 'all' | 'active' | 'inactive';

// ─── Form label ───────────────────────────────────────────────────────────────

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--color-base-content)', opacity: 0.65, userSelect: 'none',
    }}>
      {text}
    </span>
    {required && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1 }}>*</span>}
  </div>
);

// ─── Effect badge — DaisyUI badge-soft ───────────────────────────────────────

function EffectBadge({ effect }: { effect: 'PERMIT' | 'DENY' }) {
  const isPermit = effect === 'PERMIT';
  return (
    <span className={`badge badge-outline ${isPermit ? 'badge-success' : 'badge-error'} badge-sm`}
      style={{ cursor: 'default' }}>
      {effect}
    </span>
  );
}

// ─── Priority badge — neutral numbered badge ──────────────────────────────────
// No color encoding: priority is a plain rank number, lower = evaluated first.

function PriorityBadge({ value }: { value: number }) {
  const color = value <= 25 ? 'badge-error' : value <= 75 ? 'badge-warning' : 'badge-neutral';
  return (
    <span className={`badge badge-outline ${color} badge-sm`}
      style={{ cursor: 'default', fontVariantNumeric: 'tabular-nums', minWidth: '2rem', justifyContent: 'center' }}>
      {value}
    </span>
  );
}

// ─── Scope cell ───────────────────────────────────────────────────────────────
// Two-line stacked: resource type (primary) above action badge(s) (muted)

function ScopeCell({ resource, action }: { resource?: string; action?: string }) {
  const actions = action ? action.split(',').map(a => a.trim()).filter(Boolean) : [];
  return (
    <div style={{ lineHeight: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '0.2rem' }}>
      <span style={{
        fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.03em',
        color: resource ? 'var(--color-primary)' : 'var(--sb-text-muted)',
        fontStyle: resource ? 'normal' : 'italic',
      }}>
        {resource ?? 'Any resource'}
      </span>
      {actions.length === 0 ? (
        <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--sb-text-muted)', fontStyle: 'italic' }}>
          any action
        </span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.18rem' }}>
          {actions.map(a => (
            <span key={a} className="badge badge-ghost badge-xs"
              style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0 0.3rem', cursor: 'default' }}>
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SpEL reference drawer ────────────────────────────────────────────────────

const SPEL_VARS = [
  { group: 'Subject', vars: [
    { name: 'subject.permissionLevel',   type: 'int — lower = more privileged', ex: '4' },
    { name: 'subject.accountStatus',     type: "String — ACTIVE | LOCKED | DISABLED", ex: "'ACTIVE'" },
    { name: 'subject.locationIds',       type: 'Set<Integer>',                  ex: '{1,2}' },
    { name: 'subject.selectedLocationId', type: 'int — active location',        ex: '1' },
    { name: 'subject.roleId',            type: 'long — role entity ID',         ex: '3' },
    { name: 'subject.operatorId',        type: 'String',                        ex: "'42'" },
  ]},
  { group: 'Resource', vars: [
    { name: 'resource.resourceType', type: 'String', ex: "'OPERATOR'" },
    { name: 'resource.resourceId',   type: 'String', ex: "'42'" },
    { name: 'resource.locationId',   type: 'int — 0 = global', ex: '1' },
  ]},
  { group: 'Environment', vars: [
    { name: 'env.clientIp',    type: 'String', ex: "'192.168.1.1'" },
    { name: 'env.requestTime', type: 'Instant', ex: 'env.requestTime.epochSecond' },
  ]},
  { group: 'Action', vars: [
    { name: 'action.name',               type: 'String',  ex: "'READ'" },
    { name: 'action.mutation',           type: 'boolean', ex: 'false' },
    { name: 'action.requiresElevated()', type: 'boolean', ex: 'true' },
  ]},
];

const SPEL_EXAMPLES = [
  'subject.permissionLevel >= 4',
  "subject.accountStatus == 'ACTIVE'",
  'subject.permissionLevel >= 2 and subject.locationIds.contains(1)',
  "subject.permissionLevel <= 3 and action.name == 'DELETE'",
  "subject.permissionLevel >= 2 and subject.accountStatus == 'ACTIVE'",
  "resource.locationId == subject.selectedLocationId",
  "action.mutation == true and subject.permissionLevel >= 3",
];

function SpelDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '420px', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>SpEL Variable Reference</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.1rem' }}>Spring Expression Language — condition engine</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {/* Examples section */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.5rem' }}>
              Common Examples
            </div>
            {SPEL_EXAMPLES.map((ex, i) => (
              <div key={i} style={{
                fontFamily: 'monospace', fontSize: '0.73rem', padding: '0.35rem 0.6rem',
                background: 'var(--color-base-200)', borderRadius: '0.25rem', marginBottom: '0.35rem',
                borderLeft: '3px solid var(--color-primary)', wordBreak: 'break-all',
              }}>
                {ex}
              </div>
            ))}
          </div>

          {/* Variable tables */}
          {SPEL_VARS.map(({ group, vars }) => (
            <div key={group} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.4rem' }}>
                {group}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-base-200)' }}>
                    <th style={{ padding: '0.25rem 0.5rem', textAlign: 'left', fontWeight: 600, fontSize: '0.68rem', opacity: 0.6 }}>Variable</th>
                    <th style={{ padding: '0.25rem 0.5rem', textAlign: 'left', fontWeight: 600, fontSize: '0.68rem', opacity: 0.6 }}>Type</th>
                    <th style={{ padding: '0.25rem 0.5rem', textAlign: 'left', fontWeight: 600, fontSize: '0.68rem', opacity: 0.6 }}>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {vars.map(v => (
                    <tr key={v.name} style={{ borderBottom: '1px solid var(--color-base-200)' }}>
                      <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'monospace', color: 'var(--color-primary)', fontSize: '0.76rem' }}>{v.name}</td>
                      <td style={{ padding: '0.3rem 0.5rem', opacity: 0.5, fontSize: '0.72rem' }}>{v.type}</td>
                      <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'monospace', opacity: 0.6, fontSize: '0.72rem' }}>{v.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Version history drawer ────────────────────────────────────────────────────

function VersionHistoryDrawer({ policy, onClose }: { policy: PolicyResponse; onClose: () => void }) {
  const { data: versions, isLoading } = useGetPolicyVersionsQuery(policy.id);
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '460px', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Version History</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.1rem' }}>{policy.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {isLoading && <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>Loading…</div>}
          {!isLoading && (!versions || versions.length === 0) && (
            <div style={{
              textAlign: 'center', padding: '3rem 1rem', opacity: 0.4,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
            }}>
              <History size={32} strokeWidth={1} />
              <div style={{ fontSize: '0.875rem' }}>No version history yet.</div>
              <div style={{ fontSize: '0.75rem' }}>Changes will appear here after the first edit.</div>
            </div>
          )}
          {versions?.map((v, i) => (
            <div key={v.id} style={{
              borderRadius: '0.375rem', border: '1px solid var(--color-base-300)',
              padding: '0.875rem', marginBottom: '0.625rem',
              borderLeft: `4px solid ${v.effect === 'PERMIT' ? '#16a34a' : '#dc2626'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontWeight: 700, fontSize: '0.85rem',
                    background: 'var(--color-base-200)', padding: '0.1rem 0.5rem', borderRadius: '0.25rem',
                  }}>
                    v{v.version}
                  </span>
                  {i === 0 && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.4rem',
                      background: '#dbeafe', color: '#1e40af', borderRadius: '0.25rem',
                    }}>LATEST</span>
                  )}
                </div>
                <EffectBadge effect={v.effect} />
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '0.73rem',
                background: 'var(--color-base-200)', padding: '0.4rem 0.6rem',
                borderRadius: '0.25rem', marginBottom: '0.5rem', wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {v.conditionExpr}
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', opacity: 0.55, flexWrap: 'wrap' }}>
                {v.changedBy    && <span><strong>By:</strong> {v.changedBy}</span>}
                {v.changeReason && <span><strong>Reason:</strong> {v.changeReason}</span>}
                <span style={{ marginLeft: 'auto' }}>{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Condition builder ─────────────────────────────────────────────────────────

type AttrType = 'int' | 'boolean' | 'String' | 'StringEnum' | 'SetInt' | 'RoleName';
type OpKey    = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'isTrue' | 'isFalse' | 'contains' | 'notContains';

interface AttrDef { path: string; label: string; group: string; type: AttrType; options?: string[]; valueKind?: 'location' | 'role'; spelPath?: string }
interface OpDef   { key: OpKey; label: string; hasValue: boolean }
interface CRow    { id: string; attr: string; op: OpKey; value: string; values?: string[] }
interface CGroup  { id: string; logic: 'and' | 'or'; rows: CRow[] }
interface BuilderState { groups: CGroup[]; groupLogic: 'and' | 'or' }

const ATTR_DEFS: AttrDef[] = [
  { path: 'subject.permissionLevel',    group: 'Subject',  label: 'Permission Level',   type: 'int' },
  { path: 'subject.accountStatus',      group: 'Subject',  label: 'Account Status',     type: 'StringEnum', options: ['ACTIVE', 'LOCKED', 'DISABLED'] },
  { path: 'subject.locationIds',        group: 'Subject',  label: 'Location IDs',       type: 'SetInt', valueKind: 'location' },
  { path: 'subject.selectedLocationId', group: 'Subject',  label: 'Selected Location',  type: 'int',    valueKind: 'location' },
  { path: 'subject.roleId',             group: 'Subject',  label: 'Role',               type: 'int',    valueKind: 'role' },
  { path: 'subject.operatorId',         group: 'Subject',  label: 'Operator ID',        type: 'String' },
  { path: 'resource.resourceType',      group: 'Resource', label: 'Resource Type',      type: 'StringEnum', options: ['OPERATOR', 'LOCATION', 'CABINET', 'ASSET', 'CABINET_USER', 'TRANSACTION', 'ASSET_GROUP', 'ABAC_POLICY', 'APP_CONFIG', 'AUDIT_TRAIL'] },
  { path: 'resource.resourceId',        group: 'Resource', label: 'Resource ID',        type: 'String' },
  { path: 'resource.locationId',        group: 'Resource', label: 'Location',           type: 'int',    valueKind: 'location' },
  { path: 'env.clientIp',               group: 'Env',      label: 'Client IP',          type: 'String' },
  { path: 'action.name',                group: 'Action',   label: 'Action Name',        type: 'StringEnum', options: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'PERMANENT_DELETE', 'RESTORE', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'ASSIGN', 'SWITCH_LOCATION', 'RESET_PASSWORD', 'MANAGE_CABINET'], spelPath: 'action.name()' },
  { path: 'action.mutation',            group: 'Action',   label: 'Is Mutation',        type: 'boolean' },
];

const INT_OPS: OpDef[] = [
  { key: 'gte', label: '≥ at least',    hasValue: true },
  { key: 'gt',  label: '> greater than', hasValue: true },
  { key: 'lte', label: '≤ at most',     hasValue: true },
  { key: 'lt',  label: '< less than',   hasValue: true },
  { key: 'eq',  label: '= equals',      hasValue: true },
  { key: 'ne',  label: '≠ not equals',  hasValue: true },
];
const OPS_FOR: Record<AttrType, OpDef[]> = {
  int:        INT_OPS,
  RoleName:   [{ key: 'eq', label: '= equals', hasValue: true }, { key: 'ne', label: '≠ not equals', hasValue: true }],
  boolean:    [{ key: 'isTrue', label: 'is true', hasValue: false }, { key: 'isFalse', label: 'is false', hasValue: false }],
  String:     [{ key: 'eq', label: '= equals', hasValue: true }, { key: 'ne', label: '≠ not equals', hasValue: true }],
  StringEnum: [{ key: 'eq', label: '= equals', hasValue: true }, { key: 'ne', label: '≠ not equals', hasValue: true }],
  SetInt:     [{ key: 'contains', label: 'contains', hasValue: true }, { key: 'notContains', label: 'not contains', hasValue: true }],
};
// RoleName kept in OPS_FOR for AttrType completeness but not used in ATTR_DEFS

function defaultOp(type: AttrType): OpKey {
  if (type === 'boolean')  return 'isTrue';
  if (type === 'SetInt')   return 'contains';
  if (type === 'int')      return 'gte';
  if (type === 'RoleName') return 'eq';
  return 'eq';
}
function defaultVal(a: AttrDef): string {
  if (a.valueKind)             return '';
  if (a.type === 'boolean')    return '';
  if (a.type === 'StringEnum') return a.options?.[0] ?? '';
  if (a.type === 'int')        return '1';
  if (a.type === 'SetInt')     return '1';
  if (a.type === 'RoleName')   return '';
  return '';
}

let _uid = 0;
const uid = () => `${++_uid}`;
function newRow(attrPath = 'subject.permissionLevel'): CRow {
  const a = ATTR_DEFS.find(x => x.path === attrPath) ?? ATTR_DEFS[0];
  return { id: uid(), attr: a.path, op: defaultOp(a.type), value: defaultVal(a) };
}
function newGroup(): CGroup { return { id: uid(), logic: 'and', rows: [newRow()] }; }

function compileRow(row: CRow): string {
  const a = ATTR_DEFS.find(x => x.path === row.attr);
  if (!a) return '';
  const opDef = OPS_FOR[a.type].find(o => o.key === row.op);
  const ref = a.spelPath ?? row.attr;

  // Multi-value: SetInt with valueKind (location checkbox list)
  if (a.type === 'SetInt' && a.valueKind && (row.op === 'contains' || row.op === 'notContains')) {
    const ids = (row.values ?? []).filter(Boolean);
    if (ids.length === 0) return '';
    if (row.op === 'contains') {
      const parts = ids.map(id => `${ref}.contains(${id})`);
      return parts.length === 1 ? parts[0] : `(${parts.join(' or ')})`;
    } else {
      const parts = ids.map(id => `!${ref}.contains(${id})`);
      return parts.length === 1 ? parts[0] : `(${parts.join(' and ')})`;
    }
  }

  if (opDef?.hasValue && !row.value) return '';
  switch (row.op) {
    case 'eq':  return (a.type === 'String' || a.type === 'StringEnum' || a.type === 'RoleName') ? `${ref} == '${row.value}'` : `${ref} == ${row.value}`;
    case 'ne':  return (a.type === 'String' || a.type === 'StringEnum' || a.type === 'RoleName') ? `${ref} != '${row.value}'` : `${ref} != ${row.value}`;
    case 'gt':  return `${ref} > ${row.value}`;
    case 'gte': return `${ref} >= ${row.value}`;
    case 'lt':  return `${ref} < ${row.value}`;
    case 'lte': return `${ref} <= ${row.value}`;
    case 'isTrue':      return `${ref} == true`;
    case 'isFalse':     return `${ref} == false`;
    case 'contains':    return `${ref}.contains(${row.value})`;
    case 'notContains': return `!${ref}.contains(${row.value})`;
    default: return '';
  }
}
function compileGroup(g: CGroup): string {
  const parts = g.rows.map(compileRow).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length === 1 ? parts[0] : `(${parts.join(` ${g.logic} `)})`;
}
function compileToSpel(s: BuilderState): string {
  const parts = s.groups.map(compileGroup).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length === 1 ? parts[0] : parts.join(` ${s.groupLogic} `);
}

const ATTR_GROUPS = ['Subject', 'Resource', 'Env', 'Action'] as const;

// ─── Location multi-select (chip + floating dropdown) ─────────────────────────

function LocMultiSelect({
  locations, values, onChange,
}: {
  locations: LocationResponse[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id: string) =>
    onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);

  const selected = locations.filter(l => values.includes(String(l.id)));

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
    background: 'var(--color-primary)', color: 'white',
    borderRadius: '0.25rem', padding: '0.1rem 0.3rem 0.1rem 0.45rem',
    fontSize: '0.68rem', lineHeight: 1.4, maxWidth: '90px',
    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
        style={{
          border: `1px solid var(--color-base-300)`,
          borderRadius: '0.375rem', padding: '0.25rem 0.375rem',
          minHeight: '2rem', cursor: 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center',
          background: 'var(--color-base-100)', outline: open ? '2px solid var(--color-primary)' : 'none',
          outlineOffset: '1px',
        }}
      >
        {selected.length === 0
          ? <span style={{ fontSize: '0.75rem', opacity: 0.4, userSelect: 'none' }}>Select locations…</span>
          : selected.map(loc => (
              <span key={loc.id} style={chipStyle} title={loc.name}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.name}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggle(String(loc.id)); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.1rem', opacity: 0.8, lineHeight: 1, color: 'inherit' }}
                >×</button>
              </span>
            ))
        }
      </div>

      {/* Floating dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, zIndex: 60,
          minWidth: '200px', maxWidth: '280px',
          border: '1px solid var(--color-base-300)', borderRadius: '0.5rem',
          background: 'var(--color-base-100)', boxShadow: '0 6px 20px rgba(0,0,0,0.13)',
          maxHeight: '12rem', overflowY: 'auto',
        }}>
          {locations.length === 0
            ? <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', opacity: 0.4 }}>No locations</div>
            : locations.map(loc => {
                const checked = values.includes(String(loc.id));
                return (
                  <label key={loc.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
                    background: checked ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                    borderBottom: '1px solid var(--color-base-200)',
                    transition: 'background 0.1s',
                  }}>
                    <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                      checked={checked} onChange={() => toggle(String(loc.id))} />
                    <span style={{ flex: 1 }}>{loc.name}</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.35, fontFamily: 'monospace' }}>#{loc.id}</span>
                  </label>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

function ConditionBuilder({ value, onChange, startRaw }: { value: string; onChange: (v: string) => void; startRaw: boolean }) {
  const [mode, setMode] = useState<'visual' | 'raw'>(startRaw ? 'raw' : 'visual');
  const [bs, setBs]     = useState<BuilderState>(() => ({ groups: [newGroup()], groupLogic: 'and' }));
  const [rawVal, setRawVal] = useState(value);

  const { data: cbLocData } = useListLocationsQuery({ size: 200, disabled: false });
  const { data: cbRolesRaw = [] } = useListRolesQuery();
  const cbLocations = (cbLocData?.content ?? []) as LocationResponse[];
  const cbRoles = (cbRolesRaw as Role[]).filter(r => !r.deleted).sort((a, b) => a.permissionLevel - b.permissionLevel);

  const applyBs = (next: BuilderState) => { setBs(next); onChange(compileToSpel(next)); };

  const patchRow = (gid: string, rid: string, patch: Partial<CRow>) =>
    applyBs({ ...bs, groups: bs.groups.map(g =>
      g.id !== gid ? g : { ...g, rows: g.rows.map(r => r.id !== rid ? r : { ...r, ...patch }) }) });

  const addRow = (gid: string) =>
    applyBs({ ...bs, groups: bs.groups.map(g =>
      g.id !== gid ? g : { ...g, rows: [...g.rows, newRow()] }) });

  const removeRow = (gid: string, rid: string) => {
    const g = bs.groups.find(x => x.id === gid)!;
    if (g.rows.length === 1) {
      if (bs.groups.length === 1) return;
      applyBs({ ...bs, groups: bs.groups.filter(x => x.id !== gid) });
    } else {
      applyBs({ ...bs, groups: bs.groups.map(x =>
        x.id !== gid ? x : { ...x, rows: x.rows.filter(r => r.id !== rid) }) });
    }
  };

  const setInnerLogic = (gid: string, l: 'and' | 'or') =>
    applyBs({ ...bs, groups: bs.groups.map(g => g.id !== gid ? g : { ...g, logic: l }) });

  const addGroup      = () => applyBs({ ...bs, groups: [...bs.groups, newGroup()] });
  const setOuterLogic = (l: 'and' | 'or') => applyBs({ ...bs, groupLogic: l });

  const switchToRaw = () => {
    const spel = compileToSpel(bs);
    setRawVal(spel);
    onChange(spel);
    setMode('raw');
  };
  const switchToVisual = () => {
    const init: BuilderState = { groups: [newGroup()], groupLogic: 'and' };
    setBs(init);
    onChange(compileToSpel(init));
    setMode('visual');
  };

  const col: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.2rem' };

  const logicBadge = (active: boolean): React.CSSProperties => ({
    padding: '0.12rem 0.55rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 700,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
    background: active ? 'var(--color-primary)' : 'var(--color-base-100)',
    color: active ? 'var(--color-primary-content)' : 'var(--sb-text-muted)',
    cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
  });

  const modePill = (active: boolean): React.CSSProperties => ({
    padding: '0.22rem 0.9rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? 'var(--color-primary-content)' : 'var(--color-base-content)',
    cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
  });

  const preview = mode === 'visual' ? compileToSpel(bs) : '';

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <button type="button" style={modePill(mode === 'visual')} onClick={mode === 'raw' ? switchToVisual : undefined}>
          Visual Builder
        </button>
        <button type="button" style={modePill(mode === 'raw')} onClick={mode === 'visual' ? switchToRaw : undefined}>
          Raw SpEL
        </button>
        {mode === 'raw' && startRaw && (
          <span style={{ fontSize: '0.68rem', opacity: 0.38, marginLeft: '0.25rem' }}>
            Visual Builder starts fresh — existing SpEL preserved in Raw mode
          </span>
        )}
      </div>

      {mode === 'raw' ? (
        <textarea
          className="textarea textarea-bordered w-full"
          rows={5}
          style={{ fontFamily: 'monospace', fontSize: '0.825rem', resize: 'vertical', lineHeight: 1.65 }}
          value={rawVal}
          placeholder="subject.permissionLevel >= 4 and subject.accountStatus == 'ACTIVE'"
          onChange={e => { setRawVal(e.target.value); onChange(e.target.value); }}
        />
      ) : (
        <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden', overflowX: 'auto' }}>
          {bs.groups.map((group, gi) => (
            <div key={group.id}>

              {/* Between-group connector bar */}
              {gi > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.3rem 1rem', background: 'var(--color-base-300)',
                }}>
                  <div style={{ height: '1px', flex: 1, background: 'var(--color-base-content)', opacity: 0.12 }} />
                  <span style={{ fontSize: '0.62rem', opacity: 0.45, letterSpacing: '0.06em', textTransform: 'uppercase' }}>group connector</span>
                  {(['and', 'or'] as const).map(l => (
                    <button key={l} type="button" style={logicBadge(bs.groupLogic === l)} onClick={() => setOuterLogic(l)}>{l}</button>
                  ))}
                  <div style={{ height: '1px', flex: 1, background: 'var(--color-base-content)', opacity: 0.12 }} />
                </div>
              )}

              {/* Group body */}
              <div style={{ padding: '0.875rem 1rem', background: gi % 2 === 0 ? 'var(--color-base-100)' : 'color-mix(in oklch, var(--color-base-200) 60%, var(--color-base-100))' }}>

                {/* Column headers — only on first group's first row */}
                {gi === 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 160px minmax(130px,180px) 32px', gap: '0.5rem', marginBottom: '0.25rem', minWidth: '480px' }}>
                    <div style={col}>Attribute</div>
                    <div style={col}>Operator</div>
                    <div style={col}>Value</div>
                    <div />
                  </div>
                )}

                {group.rows.map((row, ri) => {
                  const attrDef = ATTR_DEFS.find(a => a.path === row.attr) ?? ATTR_DEFS[2];
                  const ops     = OPS_FOR[attrDef.type];
                  const opDef   = ops.find(o => o.key === row.op) ?? ops[0];
                  return (
                    <div key={row.id}>
                      {/* Within-group logic connector */}
                      {ri > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0', minWidth: '480px' }}>
                          {(['and', 'or'] as const).map(l => (
                            <button key={l} type="button" style={logicBadge(group.logic === l)} onClick={() => setInnerLogic(group.id, l)}>{l}</button>
                          ))}
                          <div style={{ height: '1px', flex: 1, background: 'var(--color-base-content)', opacity: 0.08 }} />
                        </div>
                      )}

                      {/* Condition row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 160px minmax(130px,180px) 32px', gap: '0.5rem', alignItems: 'start', minWidth: '480px' }}>
                        {/* Attribute */}
                        <select className="select select-bordered select-sm"
                          style={{ fontFamily: 'monospace', fontSize: '0.77rem', width: '100%' }}
                          value={row.attr}
                          onChange={e => {
                            const nd   = ATTR_DEFS.find(a => a.path === e.target.value) ?? ATTR_DEFS[2];
                            const ops2 = OPS_FOR[nd.type];
                            const validOp = ops2.find(o => o.key === row.op) ? row.op : defaultOp(nd.type);
                            patchRow(group.id, row.id, { attr: e.target.value, op: validOp, value: defaultVal(nd) });
                          }}>
                          {ATTR_GROUPS.map(grp => (
                            <optgroup key={grp} label={grp}>
                              {ATTR_DEFS.filter(a => a.group === grp).map(a => (
                                <option key={a.path} value={a.path}>{a.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {/* Operator */}
                        <select className="select select-bordered select-sm"
                          style={{ fontSize: '0.77rem', width: '100%' }}
                          value={row.op}
                          onChange={e => patchRow(group.id, row.id, { op: e.target.value as OpKey })}>
                          {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>

                        {/* Value */}
                        {opDef.hasValue ? (
                          // SetInt + location → chip multi-select
                          attrDef.valueKind === 'location' && attrDef.type === 'SetInt' ? (
                            <LocMultiSelect
                              locations={cbLocations}
                              values={row.values ?? []}
                              onChange={vals => patchRow(group.id, row.id, { values: vals })}
                            />
                          // int + location → single dropdown
                          ) : attrDef.valueKind === 'location' ? (
                            <select className="select select-bordered select-sm"
                              style={{ fontSize: '0.77rem', width: '100%' }}
                              value={row.value}
                              onChange={e => patchRow(group.id, row.id, { value: e.target.value })}>
                              <option value="">— location —</option>
                              {cbLocations.map(loc => (
                                <option key={loc.id} value={String(loc.id)}>{loc.name}</option>
                              ))}
                            </select>
                          ) : attrDef.valueKind === 'role' ? (
                            <select className="select select-bordered select-sm"
                              style={{ fontSize: '0.77rem', width: '100%' }}
                              value={row.value}
                              onChange={e => patchRow(group.id, row.id, { value: e.target.value })}>
                              <option value="">— role —</option>
                              {cbRoles.map(r => (
                                <option key={r.id} value={String(r.id)}>{r.name} (L{r.permissionLevel})</option>
                              ))}
                            </select>
                          ) : attrDef.type === 'StringEnum' ? (
                            <select className="select select-bordered select-sm"
                              style={{ fontSize: '0.77rem', width: '100%' }}
                              value={row.value}
                              onChange={e => patchRow(group.id, row.id, { value: e.target.value })}>
                              {(attrDef.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input className="input input-bordered input-sm"
                              style={{ fontFamily: 'monospace', fontSize: '0.77rem', width: '100%' }}
                              type={attrDef.type === 'int' || attrDef.type === 'SetInt' ? 'number' : 'text'}
                              value={row.value}
                              onChange={e => patchRow(group.id, row.id, { value: e.target.value })} />
                          )
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '2rem', borderRadius: '0.375rem',
                            background: 'var(--color-base-200)', fontSize: '0.7rem', opacity: 0.4,
                          }}>
                            —
                          </div>
                        )}

                        {/* Remove */}
                        <button type="button" className="btn btn-ghost btn-sm btn-square text-error"
                          style={{ opacity: bs.groups.length === 1 && group.rows.length === 1 ? 0.25 : 0.65 }}
                          disabled={bs.groups.length === 1 && group.rows.length === 1}
                          onClick={() => removeRow(group.id, row.id)}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add condition */}
                <button type="button" className="btn btn-ghost btn-sm gap-1.5"
                  style={{ marginTop: '0.625rem', fontSize: '0.78rem', opacity: 0.7 }}
                  onClick={() => addRow(group.id)}>
                  <Plus size={13} /> Add Condition
                </button>
              </div>
            </div>
          ))}

          {/* Add group */}
          <div style={{ borderTop: '1px solid var(--color-base-300)', padding: '0.5rem 1rem', background: 'var(--color-base-200)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline btn-sm gap-1.5" style={{ fontSize: '0.78rem' }} onClick={addGroup}>
              <Plus size={13} /> Add Condition Group
            </button>
            <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>Groups allow complex nested AND/OR logic</span>
          </div>
        </div>
      )}

      {/* SpEL preview */}
      {mode === 'visual' && preview && (
        <div style={{
          marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.72rem',
          padding: '0.4rem 0.7rem', background: 'var(--color-base-200)',
          borderRadius: '0.375rem', borderLeft: '3px solid var(--color-primary)',
          wordBreak: 'break-all', opacity: 0.7, lineHeight: 1.5,
          display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
        }}>
          <span style={{ opacity: 0.45, flexShrink: 0, fontSize: '0.65rem', paddingTop: '0.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SpEL</span>
          <span>{preview}</span>
        </div>
      )}
    </div>
  );
}

// ─── Policy form modal ─────────────────────────────────────────────────────────

const emptyForm = (): PolicyRequest => ({
  name: '', description: '', resourceType: '', action: '',
  effect: 'PERMIT', priority: 100, conditionExpr: '', changeReason: '',
});

const ALL_ACTIONS = ['READ','CREATE','UPDATE','DELETE','PERMANENT_DELETE','RESTORE','EXPORT','IMPORT','APPROVE','REJECT','ASSIGN','SWITCH_LOCATION','RESET_PASSWORD','MANAGE_CABINET'];

// ─── Action dropdown — mirrors LocationDropdown pattern ────────────────────────

function ActionDropdown({ available, onAdd, autoClose = false }: { available: string[]; onAdd: (a: string) => void; autoClose?: boolean }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          width: '100%', padding: '0.38rem 0.625rem',
          fontSize: '0.82rem', color: 'var(--color-base-content)',
          background: 'var(--color-base-100)',
          border: '1px dashed var(--color-base-300)',
          borderRadius: '0.375rem', cursor: 'pointer',
        }}>
        <Plus size={13} strokeWidth={2} style={{ opacity: 0.45 }} />
        <span style={{ flex: 1, textAlign: 'left', opacity: 0.5 }}>Add action…</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{available.length} available</span>
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.375rem', background: 'var(--color-base-100)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-base-300)' }}>
        <span style={{ paddingLeft: '0.6rem', opacity: 0.35, display: 'flex' }}>
          <Search size={12} strokeWidth={1.5} />
        </span>
        <span style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem', opacity: 0.5 }}>Pick an action</span>
        <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={() => setOpen(false)}>
          <X size={13} strokeWidth={2} />
        </button>
      </div>
      {available.map(a => (
        <button key={a} type="button"
          onClick={() => { onAdd(a); if (autoClose) setOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            width: '100%', padding: '0.35rem 0.625rem',
            fontSize: '0.82rem', textAlign: 'left',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-base-content)', borderBottom: '1px solid var(--color-base-200)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-base-200)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
          <Play size={11} strokeWidth={1.5} style={{ opacity: 0.35, flexShrink: 0 }} />
          {a}
        </button>
      ))}
    </div>
  );
}

function PolicyFormModal({ policy, onClose }: { policy: PolicyResponse | null; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<PolicyRequest>(() =>
    policy ? {
      name: policy.name, description: policy.description ?? '',
      resourceType: policy.resourceType ?? '', action: policy.action ?? '',
      effect: policy.effect, priority: policy.priority,
      conditionExpr: policy.conditionExpr, changeReason: '',
    } : emptyForm()
  );
  const [selectedActions, setSelectedActions] = useState<string[]>(() =>
    policy?.action ? policy.action.split(',').map(a => a.trim()).filter(Boolean) : []
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PolicyRequest, string>>>({});
  const [createPolicy, { isLoading: creating }] = useCreatePolicyMutation();
  const [updatePolicy, { isLoading: updating }] = useUpdatePolicyMutation();
  const isEdit = policy != null;
  const busy = creating || updating;

  const set = (k: keyof PolicyRequest, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const addAction = (a: string) => {
    if (a && !selectedActions.includes(a)) setSelectedActions(prev => [...prev, a]);
  };
  const removeAction = (a: string) => setSelectedActions(prev => prev.filter(x => x !== a));

  const validate = () => {
    const e: Partial<Record<keyof PolicyRequest, string>> = {};
    if (!form.name.trim())          e.name = 'Name is required';
    if (!form.conditionExpr.trim()) e.conditionExpr = 'Condition expression is required';
    if (form.priority < 1 || form.priority > 9999) e.priority = 'Priority must be 1–9999';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const body: PolicyRequest = {
      ...form,
      resourceType: form.resourceType?.trim()              || undefined,
      action:       selectedActions.length > 0 ? selectedActions.join(',') : undefined,
      description:  form.description?.trim()               || undefined,
      changeReason: form.changeReason?.trim()              || undefined,
    };
    try {
      if (isEdit) {
        await updatePolicy({ id: policy!.id, body }).unwrap();
        toast.addToast({ type: 'success', message: 'Policy updated' });
      } else {
        await createPolicy(body).unwrap();
        toast.addToast({ type: 'success', message: 'Policy created' });
      }
      onClose();
    } catch {
      toast.addToast({ type: 'error', message: isEdit ? 'Failed to update policy' : 'Failed to create policy' });
    }
  };

  const hint: React.CSSProperties = { fontSize: '0.7rem', opacity: 0.45, marginTop: '0.25rem' };
  const err:  React.CSSProperties = { color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.2rem' };

  return (
    <Modal open title={isEdit ? `Edit — ${policy!.name}` : 'New Policy'} onClose={onClose} size="xl"
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : isEdit ? 'Save Changes' : 'Create Policy'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

        {/* Name + Description row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <FL text="Name" required />
            <input className={`input input-bordered w-full${errors.name ? ' input-error' : ''}`}
              value={form.name} placeholder="e.g. account_status_gate"
              onChange={e => set('name', e.target.value)} />
            {errors.name ? <p style={err}>{errors.name}</p> : <p style={hint}>Unique identifier for this policy</p>}
          </div>
          <div>
            <FL text="Description" />
            <input className="input input-bordered w-full" value={form.description ?? ''}
              placeholder="Human-readable description"
              onChange={e => set('description', e.target.value)} />
            <p style={hint}>Optional. Shown in the policy list.</p>
          </div>
        </div>

        {/* Effect selector — radio */}
        <div>
          <FL text="Effect" required />
          <div style={{ display: 'flex', gap: '2.5rem' }}>
            {(['PERMIT', 'DENY'] as const).map(eff => {
              const selected = form.effect === eff;
              const isPermit = eff === 'PERMIT';
              return (
                <label key={eff} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    className={`radio radio-sm ${isPermit ? 'radio-success' : 'radio-error'}`}
                    checked={selected}
                    onChange={() => set('effect', eff)}
                    style={{ marginTop: '0.2rem', flexShrink: 0 }}
                  />
                  <div>
                    <span className={`badge badge-outline ${isPermit ? 'badge-success' : 'badge-error'} gap-1`}>
                      {isPermit ? <ShieldCheck size={11} strokeWidth={2.5} /> : <ShieldX size={11} strokeWidth={2.5} />}
                      {eff}
                    </span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sb-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {isPermit
                        ? 'Allow access when this condition matches.'
                        : 'Block access. A DENY always wins over any PERMIT.'}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Priority + Resource Type — 2 cols */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <FL text="Priority" required />
            <input className={`input input-bordered w-full${errors.priority ? ' input-error' : ''}`}
              type="number" min={1} max={9999}
              value={form.priority} onChange={e => set('priority', Number(e.target.value))} />
            {errors.priority
              ? <p style={err}>{errors.priority}</p>
              : <p style={hint}>Lower = first. DENY wins at same level.</p>}
          </div>
          <div>
            <FL text="Resource Type" />
            <select className="select select-bordered w-full"
              value={form.resourceType ?? ''}
              onChange={e => set('resourceType', e.target.value)}>
              <option value="">Any resource type</option>
              {['OPERATOR','LOCATION','CABINET','ASSET','CABINET_USER','TRANSACTION','ASSET_GROUP'].map(r =>
                <option key={r} value={r}>{r}</option>)}
            </select>
            <p style={hint}>Leave blank to match any resource type.</p>
          </div>
        </div>

        {/* Actions — full width, assign-location panel style */}
        <div>
          <FL text="Actions" />
          <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {/* Selected action badges */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '0.35rem',
              padding: selectedActions.length > 0 ? '0.5rem 0.625rem' : '0.65rem 0.75rem',
              minHeight: '2.5rem', alignItems: 'center',
            }}>
              {selectedActions.length === 0 ? (
                <span style={{ fontSize: '0.78rem', opacity: 0.35, fontStyle: 'italic' }}>
                  No actions selected — policy applies to any action
                </span>
              ) : selectedActions.map(a => (
                <span key={a} className="badge badge-soft badge-primary"
                  style={{ fontSize: '0.75rem', fontWeight: 600, gap: '0.25rem', paddingRight: '0.3rem' }}>
                  {a}
                  <button type="button"
                    style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.6 }}
                    onClick={() => removeAction(a)}>
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
            {/* Add action picker */}
            {ALL_ACTIONS.filter(a => !selectedActions.includes(a)).length > 0 && (
              <div style={{ borderTop: selectedActions.length > 0 ? '1px solid var(--color-base-300)' : 'none', background: 'var(--color-base-200)', padding: '0.4rem 0.625rem' }}>
                <ActionDropdown
                  available={ALL_ACTIONS.filter(a => !selectedActions.includes(a))}
                  onAdd={addAction}
                  autoClose={ALL_ACTIONS.filter(a => !selectedActions.includes(a)).length === 1}
                />
              </div>
            )}
            {/* Count footer */}
            <div style={{
              display: 'flex', gap: '0.5rem', alignItems: 'center',
              padding: '0.2rem 0.75rem',
              borderTop: '1px solid var(--color-base-300)',
              background: 'var(--color-base-100)',
              fontSize: '0.72rem', color: 'var(--sb-text-muted)',
            }}>
              <span style={{ fontWeight: 600 }}>{selectedActions.length}</span>
              <span style={{ opacity: 0.6 }}>action{selectedActions.length !== 1 ? 's' : ''} selected</span>
              {selectedActions.length > 0 && (
                <button type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--color-error)', opacity: 0.7 }}
                  onClick={() => setSelectedActions([])}>
                  Clear all
                </button>
              )}
            </div>
          </div>
          <p style={hint}>Leave empty to match any action.</p>
        </div>

        {/* Condition expression */}
        <div>
          <FL text="Condition Expression" required />
          <ConditionBuilder
            value={form.conditionExpr}
            onChange={v => set('conditionExpr', v)}
            startRaw={isEdit}
          />
          {errors.conditionExpr && <p style={err}>{errors.conditionExpr}</p>}
        </div>

        {/* Change reason (edit only) */}
        {isEdit && (
          <div>
            <FL text="Change Reason" />
            <input className="input input-bordered w-full" value={form.changeReason ?? ''}
              placeholder="Why are you making this change? (saved in version history)"
              onChange={e => set('changeReason', e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Evaluate modal ────────────────────────────────────────────────────────────

const ACCOUNT_STATUSES = ['ACTIVE', 'LOCKED', 'DISABLED'];
const ACTIONS_LIST     = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'PERMANENT_DELETE', 'RESTORE', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'ASSIGN', 'SWITCH_LOCATION', 'RESET_PASSWORD', 'MANAGE_CABINET'];
const RESOURCE_TYPES   = ['OPERATOR', 'LOCATION', 'CABINET', 'ASSET', 'CABINET_USER', 'TRANSACTION', 'ASSET_GROUP', 'ABAC_POLICY', 'APP_CONFIG', 'AUDIT_TRAIL'];

function EvaluateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [evaluate, { isLoading }] = useEvaluatePolicyMutation();
  const [result, setResult] = useState<EvaluateResult | null>(null);

  const { data: rolesData = [] } = useListRolesQuery();
  const { data: locData }        = useListLocationsQuery({ size: 200, disabled: false });

  const activeRoles = rolesData.filter((r: Role) => !r.deleted).sort((a: Role, b: Role) => a.permissionLevel - b.permissionLevel);
  const locations   = (locData?.content ?? []) as LocationResponse[];

  const [form, setForm] = useState<EvaluateRequest>({
    resourceType: 'OPERATOR', action: 'READ',
    subjectPermissionLevel: 4, subjectAccountStatus: 'ACTIVE',
  });

  // Role selection → drives subjectPermissionLevel display
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  // Location multi-select for subjectLocationIds
  const [selectedLocIds, setSelectedLocIds] = useState<Set<number>>(new Set());

  const set = (k: keyof EvaluateRequest, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleRoleChange = (val: string) => {
    const id = val === '' ? '' : Number(val);
    setSelectedRoleId(id);
    if (id !== '') {
      const role = activeRoles.find((r: Role) => r.id === id);
      if (role) set('subjectPermissionLevel', role.permissionLevel);
    }
  };

  const toggleLocId = (id: number) =>
    setSelectedLocIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });



  const run = async () => {
    const payload: EvaluateRequest = {
      ...form,
      subjectLocationIds: selectedLocIds.size > 0 ? Array.from(selectedLocIds) : undefined,
    };
    try { setResult(await evaluate(payload).unwrap()); }
    catch { toast.addToast({ type: 'error', message: 'Evaluation failed' }); }
  };

  const sL: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.5rem', display: 'block',
  };
  const hint: React.CSSProperties = { fontSize: '0.68rem', opacity: 0.4, marginTop: '0.2rem' };

  const locBoxStyle: React.CSSProperties = {
    border: '1px solid var(--color-base-300)', borderRadius: '0.375rem',
    maxHeight: '7.5rem', overflowY: 'auto', background: 'var(--color-base-100)',
  };

  return (
    <Modal open onClose={onClose} title="Simulate Policy Decision" size="xl"
      footer={
        <button className="btn btn-sm btn-primary gap-1" onClick={run} disabled={isLoading}>
          {isLoading ? <span className="loading loading-spinner loading-xs" /> : <Play size={13} />}
          Run Simulation
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Subject */}
          <div>
            <span style={sL}>Subject — who is accessing</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>

              {/* Role dropdown → auto-fills permissionLevel */}
              <div>
                <FL text="Role" />
                <select className="select select-bordered select-sm w-full"
                  value={selectedRoleId}
                  onChange={e => handleRoleChange(e.target.value)}>
                  <option value="">— custom level —</option>
                  {activeRoles.map((r: Role) => (
                    <option key={r.id} value={r.id}>{r.name} (L{r.permissionLevel})</option>
                  ))}
                </select>
                <p style={hint}>Sets permission level</p>
              </div>

              {/* Permission Level — editable, clears role selection */}
              <div>
                <FL text="Permission Level" />
                <input className="input input-bordered input-sm w-full" type="number" min={0} max={20}
                  value={form.subjectPermissionLevel ?? ''}
                  onChange={e => { setSelectedRoleId(''); set('subjectPermissionLevel', Number(e.target.value)); }} />
                <p style={hint}>subject.permissionLevel</p>
              </div>

              {/* Account Status */}
              <div style={{ gridColumn: '1 / -1' }}>
                <FL text="Account Status" />
                <select className="select select-bordered select-sm w-full"
                  value={form.subjectAccountStatus ?? ''} onChange={e => set('subjectAccountStatus', e.target.value)}>
                  {ACCOUNT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <p style={hint}>subject.accountStatus</p>
              </div>

              {/* Assigned Locations — checkbox list */}
              <div style={{ gridColumn: '1 / -1' }}>
                <FL text="Assigned Locations" />
                <div style={locBoxStyle}>
                  {locations.length === 0
                    ? <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', opacity: 0.4 }}>No locations found</div>
                    : locations.map((loc: LocationResponse) => (
                        <label key={loc.id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.25rem 0.75rem', cursor: 'pointer',
                          borderBottom: '1px solid var(--color-base-200)',
                        }}>
                          <input type="checkbox" className="checkbox checkbox-xs"
                            checked={selectedLocIds.has(loc.id)}
                            onChange={() => toggleLocId(loc.id)} />
                          <span style={{ fontSize: '0.8rem', flex: 1 }}>{loc.name}</span>
                          <span style={{ fontSize: '0.68rem', opacity: 0.35, fontFamily: 'monospace' }}>#{loc.id}</span>
                        </label>
                      ))
                  }
                </div>
                {selectedLocIds.size > 0 && (
                  <p style={hint}>
                    {selectedLocIds.size} selected · IDs: [{Array.from(selectedLocIds).sort((a, b) => a - b).join(', ')}]
                  </p>
                )}
                <p style={{ ...hint, marginTop: selectedLocIds.size > 0 ? 0 : '0.2rem' }}>subject.locationIds</p>
              </div>
            </div>
          </div>

          {/* Resource + Action */}
          <div>
            <span style={sL}>Resource &amp; Action — what is being accessed</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <FL text="Resource Type" required />
                <select className="select select-bordered select-sm w-full"
                  value={form.resourceType} onChange={e => set('resourceType', e.target.value)}>
                  {RESOURCE_TYPES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <FL text="Action" required />
                <select className="select select-bordered select-sm w-full"
                  value={form.action} onChange={e => set('action', e.target.value)}>
                  {ACTIONS_LIST.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <FL text="Resource ID" />
                <input className="input input-bordered input-sm w-full"
                  value={form.resourceId ?? ''} placeholder="optional"
                  onChange={e => set('resourceId', e.target.value || undefined)} />
                <p style={hint}>resource.resourceId</p>
              </div>

              {/* Resource Location — dropdown */}
              <div>
                <FL text="Location Scope" />
                <select className="select select-bordered select-sm w-full"
                  value={form.resourceLocationId ?? 0}
                  onChange={e => set('resourceLocationId', Number(e.target.value))}>
                  <option value={0}>None — no scope</option>
                  {locations.map((loc: LocationResponse) => (
                    <option key={loc.id} value={loc.id}>{loc.name} (#{loc.id})</option>
                  ))}
                </select>
                <p style={hint}>resource.locationId</p>
              </div>
            </div>
          </div>

        </div>

        {/* Result panel */}
        <div style={{
          background: 'var(--color-base-200)', borderRadius: '0.5rem',
          padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          <span style={sL}>Decision Result</span>

          {!result && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.35, minHeight: '160px', gap: '0.5rem' }}>
              <Play size={28} strokeWidth={1} />
              <div style={{ fontSize: '0.8rem' }}>Run simulation to see decision</div>
            </div>
          )}

          {result && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem',
                borderRadius: '0.5rem',
                background: result.isDeny ? '#fef2f2' : result.decision === 'PERMIT' ? '#f0fdf4' : '#fefce8',
                border: `2px solid ${result.isDeny ? '#fca5a5' : result.decision === 'PERMIT' ? '#86efac' : '#fde047'}`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  {result.isDeny
                    ? <ShieldX size={28} strokeWidth={2} style={{ color: '#dc2626' }} />
                    : <ShieldCheck size={28} strokeWidth={2} style={{ color: '#16a34a' }} />}
                  <span style={{
                    fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em',
                    color: result.isDeny ? '#991b1b' : result.decision === 'PERMIT' ? '#166534' : '#854d0e',
                  }}>
                    {result.decision}
                  </span>
                </div>
              </div>

              {[
                ['Matched Policy', result.matchedPolicy ?? 'None (no match)'],
                ['Reason',         result.reason ?? '—'],
                ['Resource',       result.resourceType],
                ['Action',         result.action],
                ['Effective Permission', `Level ${result.effectivePermissionLevel ?? '—'}`],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', gap: '0.5rem',
                  background: 'var(--color-base-100)', padding: '0.4rem 0.65rem',
                  borderRadius: '0.375rem', fontSize: '0.8rem',
                }}>
                  <span style={{ opacity: 0.5, flexShrink: 0, minWidth: '7rem' }}>{label}</span>
                  <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

// Known resource types from seed + CLAUDE.md — used as filter chips
const RESOURCE_CHIPS = ['OPERATOR', 'LOCATION', 'CABINET', 'ASSET', 'CABINET_USER', 'TRANSACTION'];

export default function PolicyManagementPage() {
  const toast = useToast();
  const { canAccess } = usePermissions();
  const can = (action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE') => canAccess('ABAC_POLICY', action);

  const [activeTab,       setActiveTab]       = useState<Tab>('all');
  const [currentPage,     setCurrentPage]     = useState(0);
  const [filterName,      setFilterName]      = useState('');
  const [filterEffect,    setFilterEffect]    = useState('');
  const [filterResource,  setFilterResource]  = useState('');

  const [showForm,     setShowForm]     = useState(false);
  const [editPolicy,   setEditPolicy]   = useState<PolicyResponse | null>(null);
  const [showSpel,     setShowSpel]     = useState(false);
  const [showEval,     setShowEval]     = useState(false);
  const [historyPol,   setHistoryPol]   = useState<PolicyResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PolicyResponse | null>(null);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  const activeParam: boolean | undefined =
    activeTab === 'active' ? true : activeTab === 'inactive' ? false : undefined;

  const serverParams: PolicyListParams = {
    effect:       filterEffect   || undefined,
    resourceType: filterResource || undefined,
    active:       activeParam,
    page:         currentPage,
    size:         PAGE_SIZE,
  };

  const { data, isLoading }         = useListPoliciesQuery(serverParams, { skip: !can('READ') });
  const { data: cntAll }            = useListPoliciesQuery({ effect: filterEffect || undefined, resourceType: filterResource || undefined, page: 0, size: 1 }, { skip: !can('READ') });
  const { data: cntActive }         = useListPoliciesQuery({ effect: filterEffect || undefined, resourceType: filterResource || undefined, active: true,  page: 0, size: 1 }, { skip: !can('READ') });
  const { data: cntInactive }       = useListPoliciesQuery({ effect: filterEffect || undefined, resourceType: filterResource || undefined, active: false, page: 0, size: 1 }, { skip: !can('READ') });

  const counts = { all: cntAll?.totalElements ?? 0, active: cntActive?.totalElements ?? 0, inactive: cntInactive?.totalElements ?? 0 };

  const [togglePolicy, { isLoading: toggling }] = useTogglePolicyMutation();
  const [deletePolicy, { isLoading: deleting }] = useDeletePolicyMutation();
  const [reloadCache]                           = useReloadPolicyCacheMutation();

  const rows       = data?.content       ?? [];
  const totalItems = data?.totalElements ?? 0;
  const totalPages = data?.totalPages    ?? 1;

  // client-side name filter (server doesn't expose name search)
  const displayed = filterName.trim()
    ? rows.filter(p =>
        p.name.toLowerCase().includes(filterName.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(filterName.toLowerCase()))
    : rows;

  const hasFilters = !!(filterName || filterEffect || filterResource);

  const clearFilters = () => { setFilterName(''); setFilterEffect(''); setFilterResource(''); setCurrentPage(0); };

  const handleToggle = async (p: PolicyResponse) => {
    try {
      await togglePolicy(p.id).unwrap();
      toast.addToast({ type: 'success', message: `Policy ${p.active ? 'deactivated' : 'activated'}` });
    } catch { toast.addToast({ type: 'error', message: 'Failed to toggle policy' }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePolicy(deleteTarget.id).unwrap();
      toast.addToast({ type: 'success', message: 'Policy deleted' });
      setDeleteTarget(null);
    } catch { toast.addToast({ type: 'error', message: 'Failed to delete policy' }); }
  };

  const handleReload = async () => {
    try { await reloadCache().unwrap(); toast.addToast({ type: 'success', message: 'Policy cache reloaded' }); }
    catch { toast.addToast({ type: 'error', message: 'Failed to reload cache' }); }
  };

  const cols = useMemo<ColDef<PolicyResponse>[]>(() => [
    {
      headerName: 'Priority', field: 'priority', width: 90, sortable: true,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <PriorityBadge value={d.priority} /> : null,
    },
    {
      headerName: 'Policy Name', field: 'name', flex: 2, minWidth: 180,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <div style={{ lineHeight: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d?.name}
          </div>
          {d?.description && (
            <div style={{ fontSize: '0.71rem', color: 'var(--sb-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
              {d.description}
            </div>
          )}
        </div>
      ),
    },
    {
      headerName: 'Effect', field: 'effect', width: 115, sortable: true,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <EffectBadge effect={d.effect} /> : null,
    },
    {
      headerName: 'Scope', width: 170,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <ScopeCell resource={d.resourceType ?? undefined} action={d.action ?? undefined} /> : null,
    },
    {
      headerName: 'Condition', flex: 1, minWidth: 150,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem',
          color: 'var(--sb-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
          lineHeight: 1.4,
        }}>
          {d?.conditionExpr}
        </span>
      ),
    },
    {
      headerName: 'Status', field: 'active', width: 90,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d?.active
          ? <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
          : <span className="badge badge-soft badge-error badge-sm"   style={{ cursor: 'default' }}>Inactive</span>,
    },
    {
      headerName: 'Actions', width: 148, sortable: false, resizable: false,
      suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => {
        if (!d) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
            {/* History — neutral */}
            <button
              className="btn btn-xs btn-outline gap-1"
              title="Version history"
              onClick={e => { e.stopPropagation(); setHistoryPol(d); }}>
              <History size={12} strokeWidth={1.5} />
            </button>
            {/* Edit — primary */}
            {can('UPDATE') && (
              <button
                className="btn btn-xs btn-outline btn-primary gap-1"
                title="Edit policy"
                onClick={e => { e.stopPropagation(); setEditPolicy(d); setShowForm(true); }}>
                <Pencil size={12} strokeWidth={1.5} />
              </button>
            )}
            {/* Toggle — warning (deactivate) or success (activate) */}
            {can('UPDATE') && (
              <button
                className={`btn btn-xs btn-outline gap-1 ${d.active ? 'btn-warning' : 'btn-success'}`}
                title={d.active ? 'Deactivate' : 'Activate'}
                onClick={e => { e.stopPropagation(); handleToggle(d); }}
                disabled={toggling}>
                <Power size={12} strokeWidth={1.5} />
              </button>
            )}
            {/* Delete — error */}
            {can('DELETE') && (
              <button
                className="btn btn-xs btn-outline btn-error gap-1"
                title="Delete policy"
                onClick={e => { e.stopPropagation(); setDeleteTarget(d); }}>
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canAccess, toggling]);

  if (!can('READ')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', opacity: 0.5 }}>
        <ShieldX size={36} strokeWidth={1} />
        <div>You do not have permission to view access policies.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)', margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Access Policies
        </h1>
        {!isMobile && (
          <button className="btn btn-sm btn-ghost gap-1" onClick={() => setShowSpel(true)}>
            <BookOpen size={14} strokeWidth={1.5} /> SpEL Ref
          </button>
        )}
        {can('READ') && (
          <button className="btn btn-sm btn-outline gap-1" onClick={() => setShowEval(true)}>
            <Play size={14} strokeWidth={1.5} />{!isMobile && ' Simulate'}
          </button>
        )}
        {can('UPDATE') && (
          <button className="btn btn-sm btn-ghost btn-square" onClick={handleReload} title="Reload Cache">
            <RefreshCw size={14} strokeWidth={1.5} />
          </button>
        )}
        {can('CREATE') && (
          <button className="btn btn-sm btn-primary gap-1"
            onClick={() => { setEditPolicy(null); setShowForm(true); }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span>{!isMobile && ' New Policy'}
          </button>
        )}
      </div>

      {/* Card */}
      <div className="bg-base-100 shadow-sm"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '0.5rem', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flex: 1, paddingLeft: '0.25rem' }}>
            {(['all', 'active', 'inactive'] as Tab[]).map(tab => {
              const isActive = activeTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'active' ? 'Active' : 'Inactive';
              return (
                <button key={tab} onClick={() => { setActiveTab(tab); setCurrentPage(0); }}
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
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--sb-border)', padding: '0 0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {isLoading ? '…' : `${totalItems} polic${totalItems !== 1 ? 'ies' : 'y'}`}
            </span>
          </div>
        </div>

        {/* Filter strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
          padding: '0.5rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
          background: 'var(--color-base-200)', flexShrink: 0,
        }}>
          {/* Search */}
          <label style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: isMobile ? '1 1 100%' : undefined }}>
            <span style={{ position: 'absolute', left: '0.6rem', display: 'flex', pointerEvents: 'none', color: 'var(--sb-text-muted)' }}>
              <Search size={13} strokeWidth={1.5} />
            </span>
            <input className="input input-bordered input-sm"
              style={{ paddingLeft: '1.85rem', width: isMobile ? '100%' : '200px' }}
              placeholder="Search policies…"
              value={filterName}
              onChange={e => { setFilterName(e.target.value); setCurrentPage(0); }} />
          </label>

          {/* Divider — hidden on mobile */}
          {!isMobile && <div style={{ width: '1px', height: '20px', background: 'var(--color-base-300)', flexShrink: 0 }} />}

          {/* Effect pill toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: isMobile ? '1 1 auto' : undefined }}>
            {(['', 'PERMIT', 'DENY'] as const).map(eff => {
              const active = filterEffect === eff;
              const isPermit = eff === 'PERMIT';
              const isDeny   = eff === 'DENY';
              return (
                <button key={eff}
                  onClick={() => { setFilterEffect(eff); setCurrentPage(0); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.65rem', borderRadius: '9999px',
                    fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    border: active
                      ? `1px solid ${isPermit ? '#86efac' : isDeny ? '#fca5a5' : 'var(--color-primary)'}`
                      : '1px solid var(--color-base-300)',
                    background: active
                      ? (isPermit ? '#dcfce7' : isDeny ? '#fee2e2' : 'var(--color-primary)')
                      : 'var(--color-base-100)',
                    color: active
                      ? (isPermit ? '#166534' : isDeny ? '#991b1b' : 'var(--color-primary-content)')
                      : 'var(--sb-text-muted)',
                  }}>
                  {isPermit && <ShieldCheck size={11} strokeWidth={2.5} />}
                  {isDeny   && <ShieldX    size={11} strokeWidth={2.5} />}
                  {eff === '' ? 'All' : eff}
                </button>
              );
            })}
          </div>

          {/* Divider — hidden on mobile */}
          {!isMobile && <div style={{ width: '1px', height: '20px', background: 'var(--color-base-300)', flexShrink: 0 }} />}

          {/* Resource type — DaisyUI select */}
          <select className="select select-bordered select-sm"
            style={{ flex: isMobile ? '1 1 auto' : undefined }}
            value={filterResource}
            onChange={e => { setFilterResource(e.target.value); setCurrentPage(0); }}>
            <option value="">All Resources</option>
            {RESOURCE_CHIPS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {hasFilters && (
            <button className="btn btn-xs btn-ghost gap-1" onClick={clearFilters} style={{ marginLeft: 'auto', color: 'var(--color-error)' }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Grid */}
        <DataGrid
          columnDefs={cols}
          rowData={displayed}
          loading={isLoading}
          getRowId={r => r.id}
          onRowDoubleClicked={r => { if (can('UPDATE')) { setEditPolicy(r); setShowForm(true); } }}
          height="100%"
          hideToolbar
        />

        {/* Pagination footer */}
        {totalItems > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: totalPages > 1 ? 'space-between' : 'flex-end',
            padding: '0.45rem 0.875rem', borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-100)', flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {isLoading ? '…' : <>Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalItems)} of {totalItems}</>}
            </span>
            {totalPages > 1 && (
              <div className="join">
                <button className="join-item btn btn-sm" disabled={currentPage === 0} onClick={() => setCurrentPage(0)}>«</button>
                <button className="join-item btn btn-sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === '...'
                    ? <button key={`e${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                    : <button key={p} onClick={() => setCurrentPage(p as number)}
                        className={`join-item btn btn-sm${p === currentPage ? ' btn-active' : ''}`}>
                        {(p as number) + 1}
                      </button>
                )}
                <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>›</button>
                <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)}>»</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawers + modals */}
      {showSpel  && <SpelDrawer onClose={() => setShowSpel(false)} />}
      {showEval  && <EvaluateModal onClose={() => setShowEval(false)} />}
      {showForm  && (
        <PolicyFormModal
          key={editPolicy?.id ?? 'new'}
          policy={editPolicy}
          onClose={() => { setShowForm(false); setEditPolicy(null); }}
        />
      )}
      {historyPol && <VersionHistoryDrawer policy={historyPol} onClose={() => setHistoryPol(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Policy"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
