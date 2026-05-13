import { useMemo, useState } from 'react';
import {
  useListPoliciesQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useTogglePolicyMutation,
  useDeletePolicyMutation,
  useEvaluatePolicyMutation,
  useReloadPolicyCacheMutation,
  useGetPolicyVersionsQuery,
} from '../features/abac/abacApi';
import type {
  PolicyResponse, PolicyRequest, PolicyListParams,
  EvaluateRequest, EvaluateResult,
} from '../types/api';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';
import { useToast } from '../components/shared/Toast';
import { useAppSelector } from '../app/hooks';
import { hasPermission } from '../features/auth/permissions';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
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

// ─── Effect badge — solid, high contrast ──────────────────────────────────────
// Permit DENY get solid colored backgrounds, not washed-out pastels

function EffectBadge({ effect, size = 'sm' }: { effect: 'PERMIT' | 'DENY'; size?: 'sm' | 'md' }) {
  const isPermit = effect === 'PERMIT';
  const iconSize = size === 'md' ? 13 : 11;
  const fontSize = size === 'md' ? '0.8rem' : '0.7rem';
  const pad      = size === 'md' ? '0.25rem 0.65rem' : '0.18rem 0.55rem';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: pad, borderRadius: '0.25rem', fontSize, fontWeight: 700,
      letterSpacing: '0.03em',
      background: isPermit ? '#16a34a' : '#dc2626',
      color: '#fff',
      flexShrink: 0,
    }}>
      {isPermit
        ? <ShieldCheck size={iconSize} strokeWidth={2.5} />
        : <ShieldX    size={iconSize} strokeWidth={2.5} />}
      {effect}
    </span>
  );
}

// ─── Priority chip ────────────────────────────────────────────────────────────
// Shows numeric rank with color gradient: low priority (1–25) = urgent red, high = grey

function PriorityChip({ value }: { value: number }) {
  const color =
    value <= 25  ? { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' } :
    value <= 75  ? { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' } :
                   { bg: 'var(--color-base-200)', text: 'var(--color-base-content)', border: 'var(--color-base-300)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '2.25rem', padding: '0.15rem 0.5rem',
      borderRadius: '0.25rem', fontSize: '0.78rem', fontWeight: 700,
      background: color.bg, color: color.text, border: `1px solid ${color.border}`,
    }}>
      {value}
    </span>
  );
}

// ─── Resource / Action chip ───────────────────────────────────────────────────

function ResourceChip({ resource, action }: { resource?: string; action?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
      <span style={{
        padding: '0.1rem 0.35rem', borderRadius: '0.2rem', fontSize: '0.72rem', fontWeight: 600,
        background: 'color-mix(in oklch, var(--color-primary) 10%, transparent)',
        color: 'var(--color-primary)',
      }}>
        {resource ?? '*'}
      </span>
      <span style={{ opacity: 0.35 }}>/</span>
      <span style={{
        padding: '0.1rem 0.35rem', borderRadius: '0.2rem', fontSize: '0.72rem', fontWeight: 600,
        background: 'var(--color-base-200)', color: 'var(--color-base-content)', opacity: 0.75,
      }}>
        {action ?? '*'}
      </span>
    </span>
  );
}

// ─── SpEL reference drawer ────────────────────────────────────────────────────

const SPEL_VARS = [
  { group: 'Subject', vars: [
    { name: 'subject.operatorId',       type: 'String',       ex: "'superadmin'" },
    { name: 'subject.operatorType',     type: 'int (1–5)',    ex: '1' },
    { name: 'subject.clearanceLevel',   type: 'int (1–5)',    ex: '5' },
    { name: 'subject.locationIds',      type: 'Set<Integer>', ex: '{1,2}' },
    { name: 'subject.accountStatus',    type: 'String',       ex: "'ACTIVE'" },
    { name: 'subject.mfaVerified',      type: 'boolean',      ex: 'true' },
    { name: 'subject.employmentType',   type: 'String',       ex: "'FULL_TIME'" },
    { name: 'subject.riskCategory',     type: 'String',       ex: "'LOW'" },
    { name: 'subject.passwordExpired',  type: 'boolean',      ex: 'false' },
  ]},
  { group: 'Resource', vars: [
    { name: 'resource.resourceType',    type: 'String',  ex: "'OPERATOR'" },
    { name: 'resource.resourceId',      type: 'String',  ex: "'op-001'" },
    { name: 'resource.locationId',      type: 'int',     ex: '1' },
    { name: 'resource.isGlobal',        type: 'boolean', ex: 'false' },
    { name: 'resource.sensitivityLevel',type: 'int',     ex: '2' },
    { name: 'resource.ownerType',       type: 'int',     ex: '3' },
  ]},
  { group: 'Environment', vars: [
    { name: 'env.riskScore',     type: 'int (0–100)', ex: '25' },
    { name: 'env.businessHours', type: 'boolean',     ex: 'true' },
    { name: 'env.clientIp',      type: 'String',      ex: "'192.168.1.1'" },
  ]},
  { group: 'Action', vars: [
    { name: 'action.name',     type: 'String',  ex: "'READ'" },
    { name: 'action.mutation', type: 'boolean', ex: 'false' },
  ]},
];

const SPEL_EXAMPLES = [
  'subject.clearanceLevel >= 4',
  "subject.accountStatus == 'ACTIVE' and subject.mfaVerified == true",
  'resource.sensitivityLevel >= 3 and subject.clearanceLevel < 4',
  'env.riskScore > 75 and action.mutation == true',
  "subject.employmentType == 'CONTRACTOR' and action.name == 'DELETE'",
  "resource.isGlobal == false and !subject.locationIds.contains(resource.locationId)",
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

type AttrType = 'int' | 'boolean' | 'String' | 'StringEnum' | 'SetInt';
type OpKey    = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'isTrue' | 'isFalse' | 'contains' | 'notContains';

interface AttrDef { path: string; label: string; group: string; type: AttrType; options?: string[] }
interface OpDef   { key: OpKey; label: string; hasValue: boolean }
interface CRow    { id: string; attr: string; op: OpKey; value: string }
interface CGroup  { id: string; logic: 'and' | 'or'; rows: CRow[] }
interface BuilderState { groups: CGroup[]; groupLogic: 'and' | 'or' }

const ATTR_DEFS: AttrDef[] = [
  { path: 'subject.operatorId',        group: 'Subject',  label: 'subject.operatorId',        type: 'String' },
  { path: 'subject.operatorType',      group: 'Subject',  label: 'subject.operatorType',      type: 'int' },
  { path: 'subject.clearanceLevel',    group: 'Subject',  label: 'subject.clearanceLevel',    type: 'int' },
  { path: 'subject.locationIds',       group: 'Subject',  label: 'subject.locationIds',       type: 'SetInt' },
  { path: 'subject.accountStatus',     group: 'Subject',  label: 'subject.accountStatus',     type: 'StringEnum', options: ['ACTIVE', 'DISABLED', 'LOCKED'] },
  { path: 'subject.mfaVerified',       group: 'Subject',  label: 'subject.mfaVerified',       type: 'boolean' },
  { path: 'subject.employmentType',    group: 'Subject',  label: 'subject.employmentType',    type: 'StringEnum', options: ['FULL_TIME', 'CONTRACTOR', 'TEMP'] },
  { path: 'subject.riskCategory',      group: 'Subject',  label: 'subject.riskCategory',      type: 'StringEnum', options: ['LOW', 'MEDIUM', 'HIGH'] },
  { path: 'subject.passwordExpired',   group: 'Subject',  label: 'subject.passwordExpired',   type: 'boolean' },
  { path: 'resource.resourceType',     group: 'Resource', label: 'resource.resourceType',     type: 'StringEnum', options: ['OPERATOR', 'LOCATION', 'CABINET', 'ASSET', 'CABINET_USER', 'TRANSACTION'] },
  { path: 'resource.resourceId',       group: 'Resource', label: 'resource.resourceId',       type: 'String' },
  { path: 'resource.locationId',       group: 'Resource', label: 'resource.locationId',       type: 'int' },
  { path: 'resource.isGlobal',         group: 'Resource', label: 'resource.isGlobal',         type: 'boolean' },
  { path: 'resource.sensitivityLevel', group: 'Resource', label: 'resource.sensitivityLevel', type: 'int' },
  { path: 'resource.ownerType',        group: 'Resource', label: 'resource.ownerType',        type: 'int' },
  { path: 'env.riskScore',             group: 'Env',      label: 'env.riskScore',             type: 'int' },
  { path: 'env.businessHours',         group: 'Env',      label: 'env.businessHours',         type: 'boolean' },
  { path: 'env.clientIp',              group: 'Env',      label: 'env.clientIp',              type: 'String' },
  { path: 'env.dayOfWeek',             group: 'Env',      label: 'env.dayOfWeek',             type: 'StringEnum', options: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] },
  { path: 'action.name',               group: 'Action',   label: 'action.name',               type: 'StringEnum', options: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'APPROVE'] },
  { path: 'action.mutation',           group: 'Action',   label: 'action.mutation',           type: 'boolean' },
];

const OPS_FOR: Record<AttrType, OpDef[]> = {
  int:       [{ key: 'gte', label: '≥ at least', hasValue: true }, { key: 'gt', label: '> greater than', hasValue: true }, { key: 'lte', label: '≤ at most', hasValue: true }, { key: 'lt', label: '< less than', hasValue: true }, { key: 'eq', label: '= equals', hasValue: true }, { key: 'ne', label: '≠ not equals', hasValue: true }],
  boolean:   [{ key: 'isTrue', label: 'is true', hasValue: false }, { key: 'isFalse', label: 'is false', hasValue: false }],
  String:    [{ key: 'eq', label: '= equals', hasValue: true }, { key: 'ne', label: '≠ not equals', hasValue: true }],
  StringEnum:[{ key: 'eq', label: '= equals', hasValue: true }, { key: 'ne', label: '≠ not equals', hasValue: true }],
  SetInt:    [{ key: 'contains', label: 'contains', hasValue: true }, { key: 'notContains', label: 'not contains', hasValue: true }],
};

function defaultOp(type: AttrType): OpKey {
  if (type === 'boolean') return 'isTrue';
  if (type === 'SetInt')  return 'contains';
  if (type === 'int')     return 'gte';
  return 'eq';
}
function defaultVal(a: AttrDef): string {
  if (a.type === 'boolean')    return '';
  if (a.type === 'StringEnum') return a.options?.[0] ?? '';
  if (a.type === 'int')        return '1';
  if (a.type === 'SetInt')     return '1';
  return '';
}

let _uid = 0;
const uid = () => `${++_uid}`;
function newRow(attrPath = 'subject.clearanceLevel'): CRow {
  const a = ATTR_DEFS.find(x => x.path === attrPath) ?? ATTR_DEFS[2];
  return { id: uid(), attr: a.path, op: defaultOp(a.type), value: defaultVal(a) };
}
function newGroup(): CGroup { return { id: uid(), logic: 'and', rows: [newRow()] }; }

function compileRow(row: CRow): string {
  const a = ATTR_DEFS.find(x => x.path === row.attr);
  if (!a) return '';
  const ref = `#${row.attr}`;
  switch (row.op) {
    case 'eq':  return (a.type === 'String' || a.type === 'StringEnum') ? `${ref} == '${row.value}'` : `${ref} == ${row.value}`;
    case 'ne':  return (a.type === 'String' || a.type === 'StringEnum') ? `${ref} != '${row.value}'` : `${ref} != ${row.value}`;
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

function ConditionBuilder({ value, onChange, startRaw }: { value: string; onChange: (v: string) => void; startRaw: boolean }) {
  const [mode, setMode] = useState<'visual' | 'raw'>(startRaw ? 'raw' : 'visual');
  const [bs, setBs]     = useState<BuilderState>(() => ({ groups: [newGroup()], groupLogic: 'and' }));
  const [rawVal, setRawVal] = useState(value);

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

  const logicPill = (active: boolean): React.CSSProperties => ({
    padding: '0.08rem 0.45rem', borderRadius: '9999px', fontSize: '0.64rem', fontWeight: 700,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? 'var(--color-primary-content)' : 'var(--sb-text-muted)',
    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
  });
  const modePill = (active: boolean): React.CSSProperties => ({
    padding: '0.15rem 0.65rem', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 600,
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? 'var(--color-primary-content)' : 'var(--sb-text-muted)',
    cursor: 'pointer',
  });

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.625rem' }}>
        <button type="button" style={modePill(mode === 'visual')} onClick={mode === 'raw' ? switchToVisual : undefined}>Visual</button>
        <button type="button" style={modePill(mode === 'raw')}    onClick={mode === 'visual' ? switchToRaw  : undefined}>Raw SpEL</button>
        {mode === 'raw' && startRaw && (
          <span style={{ fontSize: '0.67rem', opacity: 0.4, marginLeft: '0.15rem' }}>Switching to Visual resets the builder</span>
        )}
      </div>

      {mode === 'raw' ? (
        <textarea
          className="textarea textarea-bordered w-full"
          rows={4}
          style={{ fontFamily: 'monospace', fontSize: '0.825rem', resize: 'vertical', lineHeight: 1.6 }}
          value={rawVal}
          placeholder="subject.clearanceLevel >= 4 and subject.mfaVerified == true"
          onChange={e => { setRawVal(e.target.value); onChange(e.target.value); }}
        />
      ) : (
        <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.375rem', overflow: 'hidden' }}>
          {bs.groups.map((group, gi) => (
            <div key={group.id}>
              {gi > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.75rem', background: 'var(--color-base-300)' }}>
                  <span style={{ fontSize: '0.64rem', opacity: 0.5 }}>Between groups:</span>
                  {(['and', 'or'] as const).map(l => (
                    <button key={l} type="button" style={logicPill(bs.groupLogic === l)} onClick={() => setOuterLogic(l)}>{l}</button>
                  ))}
                </div>
              )}
              <div style={{ padding: '0.625rem 0.75rem', background: gi % 2 === 0 ? 'var(--color-base-100)' : 'color-mix(in oklch, var(--color-base-200) 70%, transparent)' }}>
                {group.rows.map((row, ri) => {
                  const attrDef = ATTR_DEFS.find(a => a.path === row.attr) ?? ATTR_DEFS[2];
                  const ops     = OPS_FOR[attrDef.type];
                  const opDef   = ops.find(o => o.key === row.op) ?? ops[0];
                  return (
                    <div key={row.id}>
                      {ri > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: '0.25rem 0' }}>
                          {(['and', 'or'] as const).map(l => (
                            <button key={l} type="button" style={logicPill(group.logic === l)} onClick={() => setInnerLogic(group.id, l)}>{l}</button>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                        {/* Attribute */}
                        <select className="select select-bordered select-xs"
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.73rem', minWidth: 0 }}
                          value={row.attr}
                          onChange={e => {
                            const nd = ATTR_DEFS.find(a => a.path === e.target.value) ?? ATTR_DEFS[2];
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
                        <select className="select select-bordered select-xs"
                          style={{ width: '140px', fontSize: '0.73rem', flexShrink: 0 }}
                          value={row.op}
                          onChange={e => patchRow(group.id, row.id, { op: e.target.value as OpKey })}>
                          {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                        {/* Value */}
                        {opDef.hasValue ? (
                          attrDef.type === 'StringEnum' ? (
                            <select className="select select-bordered select-xs"
                              style={{ width: '115px', fontSize: '0.73rem', flexShrink: 0 }}
                              value={row.value}
                              onChange={e => patchRow(group.id, row.id, { value: e.target.value })}>
                              {(attrDef.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input className="input input-bordered input-xs"
                              style={{ width: '90px', fontFamily: 'monospace', fontSize: '0.73rem', flexShrink: 0 }}
                              type={attrDef.type === 'int' || attrDef.type === 'SetInt' ? 'number' : 'text'}
                              value={row.value}
                              onChange={e => patchRow(group.id, row.id, { value: e.target.value })} />
                          )
                        ) : (
                          <div style={{ width: '90px', flexShrink: 0 }} />
                        )}
                        {/* Remove row */}
                        <button type="button" className="btn btn-ghost btn-xs btn-square text-error"
                          disabled={bs.groups.length === 1 && group.rows.length === 1}
                          onClick={() => removeRow(group.id, row.id)}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="btn btn-ghost btn-xs gap-1" style={{ marginTop: '0.3rem', fontSize: '0.72rem' }}
                  onClick={() => addRow(group.id)}>
                  <Plus size={11} /> Add Condition
                </button>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--color-base-300)', padding: '0.375rem 0.75rem', background: 'var(--color-base-200)' }}>
            <button type="button" className="btn btn-ghost btn-xs gap-1" style={{ fontSize: '0.72rem' }} onClick={addGroup}>
              <Plus size={11} /> Add Condition Group
            </button>
          </div>
        </div>
      )}

      {/* SpEL preview beneath visual builder */}
      {mode === 'visual' && compileToSpel(bs) && (
        <div style={{
          marginTop: '0.4rem', fontFamily: 'monospace', fontSize: '0.7rem',
          padding: '0.3rem 0.55rem', background: 'var(--color-base-200)',
          borderRadius: '0.25rem', borderLeft: '3px solid var(--color-primary)',
          wordBreak: 'break-all', opacity: 0.65, lineHeight: 1.4,
        }}>
          {compileToSpel(bs)}
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
  const [errors, setErrors] = useState<Partial<Record<keyof PolicyRequest, string>>>({});
  const [createPolicy, { isLoading: creating }] = useCreatePolicyMutation();
  const [updatePolicy, { isLoading: updating }] = useUpdatePolicyMutation();
  const isEdit = policy != null;
  const busy = creating || updating;

  const set = (k: keyof PolicyRequest, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

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
      resourceType: form.resourceType?.trim()  || undefined,
      action:       form.action?.trim()         || undefined,
      description:  form.description?.trim()   || undefined,
      changeReason: form.changeReason?.trim()  || undefined,
    };
    try {
      if (isEdit) {
        await updatePolicy({ id: policy!.id, body }).unwrap();
        toast.success('Policy updated');
      } else {
        await createPolicy(body).unwrap();
        toast.success('Policy created');
      }
      onClose();
    } catch {
      toast.error(isEdit ? 'Failed to update policy' : 'Failed to create policy');
    }
  };

  return (
    <Modal open title={isEdit ? `Edit Policy — ${policy!.name}` : 'New Policy'} onClose={onClose} size="lg"
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : isEdit ? 'Save Changes' : 'Create Policy'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FL text="Name" required />
            <input className={`input input-bordered w-full${errors.name ? ' input-error' : ''}`}
              value={form.name} placeholder="e.g. account_status_gate"
              onChange={e => set('name', e.target.value)} />
            {errors.name && <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{errors.name}</p>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FL text="Description" />
            <input className="input input-bordered w-full" value={form.description ?? ''}
              placeholder="Brief human-readable description"
              onChange={e => set('description', e.target.value)} />
          </div>

          {/* Effect selector — large radio cards */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FL text="Effect" required />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(['PERMIT', 'DENY'] as const).map(eff => {
                const selected = form.effect === eff;
                const isPermit = eff === 'PERMIT';
                return (
                  <label key={eff} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 1rem', borderRadius: '0.375rem', cursor: 'pointer',
                    border: `2px solid ${selected ? (isPermit ? '#16a34a' : '#dc2626') : 'var(--color-base-300)'}`,
                    background: selected ? (isPermit ? '#f0fdf4' : '#fef2f2') : 'var(--color-base-100)',
                    transition: 'all 0.15s ease',
                  }}>
                    <input type="radio" className="radio radio-sm" checked={selected} onChange={() => set('effect', eff)} style={{ display: 'none' }} />
                    <EffectBadge effect={eff} size="md" />
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {isPermit ? 'Allow matching requests' : 'Block matching requests'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <FL text="Priority" required />
            <input className={`input input-bordered w-full${errors.priority ? ' input-error' : ''}`}
              type="number" min={1} max={9999}
              value={form.priority} onChange={e => set('priority', Number(e.target.value))} />
            {errors.priority
              ? <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{errors.priority}</p>
              : <p style={{ opacity: 0.5, fontSize: '0.7rem', marginTop: '0.2rem' }}>Lower number = evaluated first. DENY overrides at same priority.</p>
            }
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <FL text="Resource Type" />
              <input className="input input-bordered w-full" value={form.resourceType ?? ''}
                placeholder="OPERATOR… (blank = any)" onChange={e => set('resourceType', e.target.value)} />
            </div>
            <div>
              <FL text="Action" />
              <input className="input input-bordered w-full" value={form.action ?? ''}
                placeholder="READ… (blank = any)" onChange={e => set('action', e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <FL text="Condition Expression" required />
          <ConditionBuilder
            value={form.conditionExpr}
            onChange={v => set('conditionExpr', v)}
            startRaw={isEdit}
          />
          {errors.conditionExpr && <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{errors.conditionExpr}</p>}
        </div>

        {isEdit && (
          <div>
            <FL text="Change Reason" />
            <input className="input input-bordered w-full" value={form.changeReason ?? ''}
              placeholder="Why are you making this change?" onChange={e => set('changeReason', e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Evaluate modal ────────────────────────────────────────────────────────────

const ACCOUNT_STATUSES = ['ACTIVE', 'DISABLED', 'LOCKED'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'CONTRACTOR', 'TEMP'];
const RISK_CATEGORIES  = ['LOW', 'MEDIUM', 'HIGH'];
const ACTIONS_LIST     = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'APPROVE', 'PERMANENT_DELETE'];

function EvaluateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [evaluate, { isLoading }] = useEvaluatePolicyMutation();
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [form, setForm] = useState<EvaluateRequest>({
    resourceType: 'OPERATOR', action: 'READ',
    subjectClearanceLevel: 5, subjectAccountStatus: 'ACTIVE',
    subjectMfaVerified: true, subjectEmploymentType: 'FULL_TIME',
    subjectRiskCategory: 'LOW', resourceSensitivityLevel: 0,
    envRiskScore: 0, envBusinessHours: true,
  });

  const set = (k: keyof EvaluateRequest, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const run = async () => {
    try { setResult(await evaluate(form).unwrap()); }
    catch { toast.error('Evaluation failed'); }
  };

  const sL: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', opacity: 0.4, marginBottom: '0.5rem', display: 'block',
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

          <div>
            <span style={sL}>Subject (who is accessing)</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <FL text="Clearance Level (1–5)" />
                <input className="input input-bordered input-sm w-full" type="number" min={1} max={5}
                  value={form.subjectClearanceLevel ?? ''} onChange={e => set('subjectClearanceLevel', Number(e.target.value))} />
              </div>
              <div>
                <FL text="Account Status" />
                <select className="select select-bordered select-sm w-full"
                  value={form.subjectAccountStatus ?? ''} onChange={e => set('subjectAccountStatus', e.target.value)}>
                  {ACCOUNT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <FL text="Employment Type" />
                <select className="select select-bordered select-sm w-full"
                  value={form.subjectEmploymentType ?? ''} onChange={e => set('subjectEmploymentType', e.target.value)}>
                  {EMPLOYMENT_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <FL text="Risk Category" />
                <select className="select select-bordered select-sm w-full"
                  value={form.subjectRiskCategory ?? ''} onChange={e => set('subjectRiskCategory', e.target.value)}>
                  {RISK_CATEGORIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem' }}>
                <input type="checkbox" className="checkbox checkbox-sm" checked={form.subjectMfaVerified ?? false}
                  onChange={e => set('subjectMfaVerified', e.target.checked)} />
                <span style={{ fontSize: '0.825rem' }}>MFA Verified</span>
              </div>
            </div>
          </div>

          <div>
            <span style={sL}>Resource &amp; Action (what is being accessed)</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <FL text="Resource Type" required />
                <input className="input input-bordered input-sm w-full"
                  value={form.resourceType} onChange={e => set('resourceType', e.target.value)} placeholder="OPERATOR…" />
              </div>
              <div>
                <FL text="Action" required />
                <select className="select select-bordered select-sm w-full"
                  value={form.action} onChange={e => set('action', e.target.value)}>
                  {ACTIONS_LIST.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <FL text="Sensitivity Level (0–5)" />
                <input className="input input-bordered input-sm w-full" type="number" min={0} max={5}
                  value={form.resourceSensitivityLevel ?? 0} onChange={e => set('resourceSensitivityLevel', Number(e.target.value))} />
              </div>
              <div>
                <FL text="Location ID (0 = global)" />
                <input className="input input-bordered input-sm w-full" type="number" min={0}
                  value={form.resourceLocationId ?? 0} onChange={e => set('resourceLocationId', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div>
            <span style={sL}>Environment</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <FL text="Risk Score (0–100)" />
                <input className="input input-bordered input-sm w-full" type="number" min={0} max={100}
                  value={form.envRiskScore ?? 0} onChange={e => set('envRiskScore', Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                <input type="checkbox" className="checkbox checkbox-sm" checked={form.envBusinessHours ?? true}
                  onChange={e => set('envBusinessHours', e.target.checked)} />
                <span style={{ fontSize: '0.825rem' }}>Business Hours</span>
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
                ['Effective Clearance', `Level ${result.effectiveClearanceLevel ?? '—'}`],
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
  const operatorType = useAppSelector(s => s.auth.operator?.type ?? 5);
  const can = (action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE') =>
    hasPermission(operatorType, 'ABAC_POLICY', action);

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
      toast.success(`Policy ${p.active ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to toggle policy'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePolicy(deleteTarget.id).unwrap();
      toast.success('Policy deleted');
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete policy'); }
  };

  const handleReload = async () => {
    try { await reloadCache().unwrap(); toast.success('Policy cache reloaded'); }
    catch { toast.error('Failed to reload cache'); }
  };

  const cols = useMemo<ColDef<PolicyResponse>[]>(() => [
    {
      headerName: '#', field: 'priority', width: 72, sortable: true,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <PriorityChip value={d.priority} /> : null,
    },
    {
      headerName: 'Name', field: 'name', flex: 1, minWidth: 180,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d?.name}</div>
          {d?.description && (
            <div style={{ fontSize: '0.71rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.description}
            </div>
          )}
        </div>
      ),
    },
    {
      headerName: 'Effect', field: 'effect', width: 105, sortable: true,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <EffectBadge effect={d.effect} /> : null,
    },
    {
      headerName: 'Scope', width: 200,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <ResourceChip resource={d.resourceType ?? undefined} action={d.action ?? undefined} /> : null,
    },
    {
      headerName: 'Condition', flex: 1, minWidth: 160,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <span style={{
          fontFamily: 'monospace', fontSize: '0.72rem', opacity: 0.65,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
        }}>
          {d?.conditionExpr}
        </span>
      ),
    },
    {
      headerName: 'Status', field: 'active', width: 88,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d?.active
          ? <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
          : <span className="badge badge-soft badge-error badge-sm"   style={{ cursor: 'default' }}>Inactive</span>,
    },
    {
      headerName: '', width: 116, sortable: false, resizable: false,
      suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => {
        if (!d) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', height: '100%' }}>
            <button className="btn btn-ghost btn-xs btn-square" title="Version history"
              onClick={e => { e.stopPropagation(); setHistoryPol(d); }}>
              <History size={14} strokeWidth={1.5} />
            </button>
            {can('UPDATE') && (
              <button className="btn btn-ghost btn-xs btn-square" title="Edit"
                onClick={e => { e.stopPropagation(); setEditPolicy(d); setShowForm(true); }}>
                <Pencil size={14} strokeWidth={1.5} />
              </button>
            )}
            {can('UPDATE') && (
              <button
                className={`btn btn-ghost btn-xs btn-square${d.active ? ' text-warning' : ' text-success'}`}
                title={d.active ? 'Deactivate' : 'Activate'}
                onClick={e => { e.stopPropagation(); handleToggle(d); }}
                disabled={toggling}
              >
                <Power size={14} strokeWidth={1.5} />
              </button>
            )}
            {can('DELETE') && (
              <button className="btn btn-ghost btn-xs btn-square text-error" title="Delete"
                onClick={e => { e.stopPropagation(); setDeleteTarget(d); }}>
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [operatorType, toggling]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)', margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Access Policies
        </h1>
        <button className="btn btn-sm btn-ghost gap-1" onClick={() => setShowSpel(true)}>
          <BookOpen size={14} strokeWidth={1.5} /> SpEL Ref
        </button>
        {can('READ') && (
          <button className="btn btn-sm btn-outline gap-1" onClick={() => setShowEval(true)}>
            <Play size={14} strokeWidth={1.5} /> Simulate
          </button>
        )}
        {can('UPDATE') && (
          <button className="btn btn-sm btn-ghost gap-1" onClick={handleReload}>
            <RefreshCw size={14} strokeWidth={1.5} /> Reload Cache
          </button>
        )}
        {can('CREATE') && (
          <button className="btn btn-sm btn-primary gap-1"
            onClick={() => { setEditPolicy(null); setShowForm(true); }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span> New Policy
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
          display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
          padding: '0.45rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
          background: 'var(--color-base-200)', flexShrink: 0,
        }}>
          {/* Search */}
          <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.55rem', display: 'flex', pointerEvents: 'none', color: 'var(--sb-text-muted)' }}>
              <Search size={13} strokeWidth={1.5} />
            </span>
            <input className="input input-bordered input-sm"
              style={{ paddingLeft: '1.8rem', width: '180px' }}
              placeholder="Search name…"
              value={filterName}
              onChange={e => { setFilterName(e.target.value); setCurrentPage(0); }} />
          </label>

          {/* Effect dropdown */}
          <select className="select select-bordered select-sm" style={{ width: '130px' }}
            value={filterEffect} onChange={e => { setFilterEffect(e.target.value); setCurrentPage(0); }}>
            <option value="">All Effects</option>
            <option value="PERMIT">PERMIT</option>
            <option value="DENY">DENY</option>
          </select>

          {/* Resource type quick-filter chips */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {RESOURCE_CHIPS.map(r => {
              const active = filterResource === r;
              return (
                <button key={r}
                  onClick={() => { setFilterResource(active ? '' : r); setCurrentPage(0); }}
                  style={{
                    padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600,
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
                    background: active ? 'var(--color-primary)' : 'transparent',
                    color: active ? 'var(--color-primary-content)' : 'var(--sb-text-muted)',
                    cursor: 'pointer', transition: 'all 0.12s ease',
                  }}>
                  {r}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button className="btn btn-xs btn-ghost gap-1" onClick={clearFilters} style={{ marginLeft: 'auto' }}>
              ✕ Clear
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
