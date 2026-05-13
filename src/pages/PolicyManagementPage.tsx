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
  ShieldCheck, ShieldX, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Search, History, Play, BookOpen, X,
} from 'lucide-react';

const PAGE_SIZE = 20;

type Tab = 'all' | 'active' | 'inactive';

// ─── Form label primitive (matches other pages) ────────────────────────────────

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.65, userSelect: 'none',
    }}>
      {text}
    </span>
    {required && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1 }}>*</span>}
  </div>
);

// ─── Effect badge ──────────────────────────────────────────────────────────────

function EffectBadge({ effect }: { effect: 'PERMIT' | 'DENY' }) {
  const isPermit = effect === 'PERMIT';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.1rem 0.45rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700,
      background: isPermit ? '#dcfce7' : '#fee2e2',
      color: isPermit ? '#166534' : '#991b1b',
      border: `1px solid ${isPermit ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {isPermit ? <ShieldCheck size={10} /> : <ShieldX size={10} />}
      {effect}
    </span>
  );
}

// ─── SpEL reference side drawer (F07) ─────────────────────────────────────────

const SPEL_VARS = [
  { group: 'Subject', vars: [
    { name: 'subject.operatorId',      type: 'String'       },
    { name: 'subject.operatorType',    type: 'int (1–5)'    },
    { name: 'subject.clearanceLevel',  type: 'int (1–5)'    },
    { name: 'subject.locationIds',     type: 'Set<Integer>' },
    { name: 'subject.accountStatus',   type: 'String'       },
    { name: 'subject.mfaVerified',     type: 'boolean'      },
    { name: 'subject.employmentType',  type: 'String'       },
    { name: 'subject.riskCategory',    type: 'String'       },
    { name: 'subject.passwordExpired', type: 'boolean'      },
  ]},
  { group: 'Resource', vars: [
    { name: 'resource.resourceType',    type: 'String'  },
    { name: 'resource.resourceId',      type: 'String'  },
    { name: 'resource.locationId',      type: 'int'     },
    { name: 'resource.isGlobal',        type: 'boolean' },
    { name: 'resource.sensitivityLevel',type: 'int'     },
    { name: 'resource.ownerType',       type: 'int'     },
  ]},
  { group: 'Environment', vars: [
    { name: 'env.riskScore',     type: 'int (0–100)' },
    { name: 'env.businessHours', type: 'boolean'     },
    { name: 'env.clientIp',      type: 'String'      },
  ]},
  { group: 'Action', vars: [
    { name: 'action.name',     type: 'String'  },
    { name: 'action.mutation', type: 'boolean' },
  ]},
];

function SpelDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.15)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '400px', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.5rem 1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>SpEL Variable Reference</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontSize: '0.8rem' }}>
          <p style={{ opacity: 0.55, marginBottom: '1rem', lineHeight: 1.5 }}>
            Use these in condition expressions — e.g. <code style={{ fontFamily: 'monospace' }}>subject.clearanceLevel &gt;= 4</code>
          </p>
          {SPEL_VARS.map(({ group, vars }) => (
            <div key={group} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.4rem' }}>
                {group}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {vars.map(v => (
                    <tr key={v.name} style={{ borderBottom: '1px solid var(--color-base-200)' }}>
                      <td style={{ padding: '0.3rem 0', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary)' }}>{v.name}</td>
                      <td style={{ padding: '0.3rem 0 0.3rem 0.75rem', opacity: 0.5, fontSize: '0.72rem', textAlign: 'right' }}>{v.type}</td>
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

// ─── Version history drawer (F09) ─────────────────────────────────────────────

function VersionHistoryDrawer({ policy, onClose }: { policy: PolicyResponse; onClose: () => void }) {
  const { data: versions, isLoading } = useGetPolicyVersionsQuery(policy.id);
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.15)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '440px', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.5rem 1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>History — {policy.name}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {isLoading && <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>Loading…</div>}
          {!isLoading && (!versions || versions.length === 0) && (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>No version history yet.</div>
          )}
          {versions?.map(v => (
            <div key={v.id} style={{
              borderRadius: '0.375rem', border: '1px solid var(--color-base-300)',
              padding: '0.75rem', marginBottom: '0.625rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>v{v.version}</span>
                <EffectBadge effect={v.effect} />
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '0.73rem',
                background: 'var(--color-base-200)', padding: '0.35rem 0.5rem',
                borderRadius: '0.25rem', marginBottom: '0.4rem', wordBreak: 'break-all',
              }}>
                {v.conditionExpr}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', opacity: 0.55 }}>
                <span>{v.changedBy ?? '—'}</span>
                <span>{v.changeReason ?? '—'}</span>
                <span style={{ marginLeft: 'auto' }}>{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Policy form modal (F06) ──────────────────────────────────────────────────

const emptyForm = (): PolicyRequest => ({
  name: '', description: '', resourceType: '', action: '',
  effect: 'PERMIT', priority: 100, conditionExpr: '', changeReason: '',
});

function PolicyFormModal({ policy, onClose }: {
  policy: PolicyResponse | null; onClose: () => void;
}) {
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
    if (form.priority < 1 || form.priority > 9999) e.priority = 'Priority 1–9999';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const body: PolicyRequest = {
      ...form,
      resourceType:  form.resourceType?.trim()  || undefined,
      action:        form.action?.trim()         || undefined,
      description:   form.description?.trim()   || undefined,
      changeReason:  form.changeReason?.trim()  || undefined,
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
    <Modal
      open
      title={isEdit ? `Edit Policy — ${policy!.name}` : 'New Policy'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : (isEdit ? 'Save Changes' : 'Create Policy')}
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

          <div>
            <FL text="Effect" required />
            <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.25rem' }}>
              {(['PERMIT', 'DENY'] as const).map(eff => (
                <label key={eff} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input type="radio" className="radio radio-sm"
                    checked={form.effect === eff} onChange={() => set('effect', eff)} />
                  <EffectBadge effect={eff} />
                </label>
              ))}
            </div>
          </div>

          <div>
            <FL text="Priority" required />
            <input className={`input input-bordered w-full${errors.priority ? ' input-error' : ''}`}
              type="number" min={1} max={9999}
              value={form.priority} onChange={e => set('priority', Number(e.target.value))} />
            {errors.priority && <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{errors.priority}</p>}
          </div>

          <div>
            <FL text="Resource Type" />
            <input className="input input-bordered w-full" value={form.resourceType ?? ''}
              placeholder="OPERATOR, LOCATION… (blank = any)"
              onChange={e => set('resourceType', e.target.value)} />
          </div>

          <div>
            <FL text="Action" />
            <input className="input input-bordered w-full" value={form.action ?? ''}
              placeholder="READ, CREATE… (blank = any)"
              onChange={e => set('action', e.target.value)} />
          </div>
        </div>

        <div>
          <FL text="Condition Expression" required />
          <textarea
            className={`textarea textarea-bordered w-full${errors.conditionExpr ? ' textarea-error' : ''}`}
            rows={4} style={{ fontFamily: 'monospace', fontSize: '0.825rem', resize: 'vertical' }}
            value={form.conditionExpr}
            placeholder="subject.clearanceLevel >= 4 and subject.mfaVerified == true"
            onChange={e => set('conditionExpr', e.target.value)} />
          {errors.conditionExpr && <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{errors.conditionExpr}</p>}
        </div>

        {isEdit && (
          <div>
            <FL text="Change Reason" />
            <input className="input input-bordered w-full" value={form.changeReason ?? ''}
              placeholder="Why are you making this change?"
              onChange={e => set('changeReason', e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Evaluate modal (F08) ─────────────────────────────────────────────────────

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
    try {
      setResult(await evaluate(form).unwrap());
    } catch {
      toast.error('Evaluation failed');
    }
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.625rem', display: 'block',
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

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <span style={sectionLabel}>Subject</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <FL text="Clearance Level" />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '0.75rem' }}>
                <input type="checkbox" className="checkbox checkbox-sm"
                  checked={form.subjectMfaVerified ?? false} onChange={e => set('subjectMfaVerified', e.target.checked)} />
                <span style={{ fontSize: '0.825rem' }}>MFA Verified</span>
              </div>
            </div>
          </div>

          <div>
            <span style={sectionLabel}>Resource &amp; Action</span>
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
                <FL text="Sensitivity Level" />
                <input className="input input-bordered input-sm w-full" type="number" min={0} max={5}
                  value={form.resourceSensitivityLevel ?? 0} onChange={e => set('resourceSensitivityLevel', Number(e.target.value))} />
              </div>
              <div>
                <FL text="Location ID (0=global)" />
                <input className="input input-bordered input-sm w-full" type="number" min={0}
                  value={form.resourceLocationId ?? 0} onChange={e => set('resourceLocationId', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div>
            <span style={sectionLabel}>Environment</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <FL text="Risk Score (0–100)" />
                <input className="input input-bordered input-sm w-full" type="number" min={0} max={100}
                  value={form.envRiskScore ?? 0} onChange={e => set('envRiskScore', Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '1.25rem' }}>
                <input type="checkbox" className="checkbox checkbox-sm"
                  checked={form.envBusinessHours ?? true} onChange={e => set('envBusinessHours', e.target.checked)} />
                <span style={{ fontSize: '0.825rem' }}>Business Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        <div style={{
          background: 'var(--color-base-200)', borderRadius: '0.5rem',
          padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <span style={sectionLabel}>Decision Result</span>

          {!result && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35, minHeight: '120px' }}>
              Run simulation to see decision
            </div>
          )}

          {result && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', borderRadius: '0.5rem',
                background: result.isDeny ? '#fee2e2' : result.decision === 'PERMIT' ? '#dcfce7' : '#fef9c3',
                border: `2px solid ${result.isDeny ? '#fca5a5' : result.decision === 'PERMIT' ? '#86efac' : '#fde047'}`,
              }}>
                <span style={{
                  fontSize: '1.4rem', fontWeight: 800,
                  color: result.isDeny ? '#991b1b' : result.decision === 'PERMIT' ? '#166534' : '#854d0e',
                }}>
                  {result.decision}
                </span>
              </div>

              {[
                ['Matched Policy', result.matchedPolicy ?? 'None'],
                ['Reason', result.reason ?? '—'],
                ['Resource Type', result.resourceType],
                ['Action', result.action],
                ['Effective Clearance', String(result.effectiveClearanceLevel ?? '—')],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', gap: '0.5rem',
                  background: 'var(--color-base-100)', padding: '0.375rem 0.625rem',
                  borderRadius: '0.375rem', fontSize: '0.8rem',
                }}>
                  <span style={{ opacity: 0.5, flexShrink: 0 }}>{label}:</span>
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

// ─── Main page ────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

export default function PolicyManagementPage() {
  const toast = useToast();
  const operatorType = useAppSelector(s => s.auth.operator?.type ?? 5);
  const can = (action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE') =>
    hasPermission(operatorType, 'ABAC_POLICY', action);

  const [activeTab,    setActiveTab]    = useState<Tab>('all');
  const [currentPage,  setCurrentPage]  = useState(0);
  const [filterName,   setFilterName]   = useState('');
  const [filterEffect, setFilterEffect] = useState('');

  // Panels
  const [showForm,    setShowForm]    = useState(false);
  const [editPolicy,  setEditPolicy]  = useState<PolicyResponse | null>(null);
  const [showSpel,    setShowSpel]    = useState(false);
  const [showEval,    setShowEval]    = useState(false);
  const [historyPol,  setHistoryPol]  = useState<PolicyResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PolicyResponse | null>(null);

  const activeParam: boolean | undefined =
    activeTab === 'active' ? true : activeTab === 'inactive' ? false : undefined;

  const params: PolicyListParams = {
    effect: filterEffect || undefined,
    active: activeParam,
    page: currentPage, size: PAGE_SIZE,
  };

  const { data, isLoading }         = useListPoliciesQuery(params, { skip: !can('READ') });
  const { data: countAllData }      = useListPoliciesQuery({ effect: filterEffect || undefined, page: 0, size: 1 }, { skip: !can('READ') });
  const { data: countActiveData }   = useListPoliciesQuery({ effect: filterEffect || undefined, active: true,  page: 0, size: 1 }, { skip: !can('READ') });
  const { data: countInactiveData } = useListPoliciesQuery({ effect: filterEffect || undefined, active: false, page: 0, size: 1 }, { skip: !can('READ') });

  const counts = {
    all:      countAllData?.totalElements      ?? 0,
    active:   countActiveData?.totalElements   ?? 0,
    inactive: countInactiveData?.totalElements ?? 0,
  };

  const [togglePolicy, { isLoading: toggling }]    = useTogglePolicyMutation();
  const [deletePolicy, { isLoading: deleting }]    = useDeletePolicyMutation();
  const [reloadCache]                              = useReloadPolicyCacheMutation();

  const rows       = data?.content       ?? [];
  const totalItems = data?.totalElements ?? 0;
  const totalPages = data?.totalPages    ?? 1;

  // Client-side name filter
  const displayed = filterName.trim()
    ? rows.filter(p =>
        p.name.toLowerCase().includes(filterName.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(filterName.toLowerCase()))
    : rows;

  const handleToggle = async (p: PolicyResponse) => {
    try {
      await togglePolicy(p.id).unwrap();
      toast.success(`Policy ${p.active ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to toggle policy');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePolicy(deleteTarget.id).unwrap();
      toast.success('Policy deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete policy');
    }
  };

  const handleReload = async () => {
    try {
      await reloadCache().unwrap();
      toast.success('Policy cache reloaded');
    } catch {
      toast.error('Failed to reload cache');
    }
  };

  const cols = useMemo<ColDef<PolicyResponse>[]>(() => [
    {
      headerName: 'Priority', field: 'priority', width: 90, sortable: true,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <span style={{
          display: 'inline-block', padding: '0.1rem 0.45rem',
          background: 'var(--color-base-200)', borderRadius: '0.25rem',
          fontWeight: 700, fontSize: '0.78rem',
        }}>
          {d?.priority}
        </span>
      ),
    },
    {
      headerName: 'Name', field: 'name', flex: 1, minWidth: 160,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d?.name}</div>
          {d?.description && (
            <div style={{ fontSize: '0.72rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
              {d.description}
            </div>
          )}
        </div>
      ),
    },
    {
      headerName: 'Effect', field: 'effect', width: 100, sortable: true,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d ? <EffectBadge effect={d.effect} /> : null,
    },
    {
      headerName: 'Resource / Action', width: 180,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', opacity: 0.7 }}>
          {d?.resourceType ?? '*'} / {d?.action ?? '*'}
        </span>
      ),
    },
    {
      headerName: 'Status', field: 'active', width: 95,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) =>
        d?.active
          ? <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
          : <span className="badge badge-soft badge-error badge-sm" style={{ cursor: 'default' }}>Inactive</span>,
    },
    {
      headerName: 'Ver.', field: 'version', width: 60,
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => (
        <span style={{ opacity: 0.55, fontSize: '0.78rem' }}>v{d?.version}</span>
      ),
    },
    {
      headerName: 'Actions', width: 160, sortable: false, resizable: false,
      suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: PolicyResponse }) => {
        if (!d) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', height: '100%' }}>
            <button className="btn btn-ghost btn-xs gap-1" title="Version history"
              onClick={e => { e.stopPropagation(); setHistoryPol(d); }}>
              <History size={13} strokeWidth={1.5} />
            </button>
            {can('UPDATE') && (
              <button className="btn btn-ghost btn-xs gap-1" title="Edit"
                onClick={e => { e.stopPropagation(); setEditPolicy(d); setShowForm(true); }}>
                <Pencil size={13} strokeWidth={1.5} /> Edit
              </button>
            )}
            {can('UPDATE') && (
              <button
                className={`btn btn-ghost btn-xs gap-1 ${d.active ? 'text-warning' : 'text-success'}`}
                title={d.active ? 'Deactivate' : 'Activate'}
                onClick={e => { e.stopPropagation(); handleToggle(d); }}
                disabled={toggling}
              >
                {d.active ? <ToggleRight size={13} strokeWidth={1.5} /> : <ToggleLeft size={13} strokeWidth={1.5} />}
              </button>
            )}
            {can('DELETE') && (
              <button className="btn btn-ghost btn-xs text-error" title="Delete"
                onClick={e => { e.stopPropagation(); setDeleteTarget(d); }}>
                <Trash2 size={13} strokeWidth={1.5} />
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
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
        You do not have permission to view access policies.
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
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.45rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
          background: 'var(--color-base-200)', flexShrink: 0, flexWrap: 'wrap',
        }}>
          <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.55rem', display: 'flex', pointerEvents: 'none', color: 'var(--sb-text-muted)' }}>
              <Search size={13} strokeWidth={1.5} />
            </span>
            <input className="input input-bordered input-sm"
              style={{ paddingLeft: '1.8rem', width: '200px' }}
              placeholder="Search name or description…"
              value={filterName}
              onChange={e => { setFilterName(e.target.value); setCurrentPage(0); }} />
          </label>
          <select className="select select-bordered select-sm" style={{ width: '140px' }}
            value={filterEffect} onChange={e => { setFilterEffect(e.target.value); setCurrentPage(0); }}>
            <option value="">All Effects</option>
            <option value="PERMIT">PERMIT</option>
            <option value="DENY">DENY</option>
          </select>
          {(filterName || filterEffect) && (
            <button className="btn btn-xs btn-ghost gap-1"
              onClick={() => { setFilterName(''); setFilterEffect(''); setCurrentPage(0); }}>
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
          onRowDoubleClicked={r => { setEditPolicy(r); setShowForm(true); }}
          height="100%"
          hideToolbar
        />

        {/* Pagination */}
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
                    ? <button key={`el-${i}`} className="join-item btn btn-sm btn-disabled">…</button>
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
      {showSpel && <SpelDrawer onClose={() => setShowSpel(false)} />}
      {showEval && <EvaluateModal onClose={() => setShowEval(false)} />}
      {showForm && (
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
