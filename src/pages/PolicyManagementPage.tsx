import { useState } from 'react';
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
import { useToast } from '../components/shared/Toast';
import { useAppSelector } from '../app/hooks';
import { hasPermission } from '../features/auth/permissions';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import {
  ShieldCheck, ShieldX, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Search, History, Play, ChevronLeft, ChevronRight, BookOpen, X,
} from 'lucide-react';

const PAGE_SIZE = 20;

// ─── Label primitive ──────────────────────────────────────────────────────────

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

// ─── Effect + Status badges (F10) ─────────────────────────────────────────────

function EffectBadge({ effect }: { effect: 'PERMIT' | 'DENY' }) {
  const isPermit = effect === 'PERMIT';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.15rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700,
      background: isPermit ? '#dcfce7' : '#fee2e2',
      color: isPermit ? '#166534' : '#991b1b',
      border: `1px solid ${isPermit ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {isPermit ? <ShieldCheck size={11} /> : <ShieldX size={11} />}
      {effect}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '9999px',
      fontSize: '0.7rem', fontWeight: 600,
      background: active ? '#dbeafe' : '#f1f5f9',
      color: active ? '#1e40af' : '#64748b',
      border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── SpEL reference panel (F07) ───────────────────────────────────────────────

const SPEL_VARS = [
  { group: 'Subject', vars: [
    { name: 'subject.operatorId',      type: 'String',       example: "'superadmin'" },
    { name: 'subject.operatorType',    type: 'int (1–5)',    example: '1' },
    { name: 'subject.clearanceLevel',  type: 'int (1–5)',    example: '5' },
    { name: 'subject.locationIds',     type: 'Set<Integer>', example: '{1,2}' },
    { name: 'subject.accountStatus',   type: 'String',       example: "'ACTIVE'" },
    { name: 'subject.mfaVerified',     type: 'boolean',      example: 'true' },
    { name: 'subject.employmentType',  type: 'String',       example: "'FULL_TIME'" },
    { name: 'subject.riskCategory',    type: 'String',       example: "'LOW'" },
    { name: 'subject.passwordExpired', type: 'boolean',      example: 'false' },
  ]},
  { group: 'Resource', vars: [
    { name: 'resource.resourceType',    type: 'String',   example: "'OPERATOR'" },
    { name: 'resource.resourceId',      type: 'String',   example: "'op-001'" },
    { name: 'resource.locationId',      type: 'int',      example: '1' },
    { name: 'resource.isGlobal',        type: 'boolean',  example: 'false' },
    { name: 'resource.sensitivityLevel',type: 'int',      example: '2' },
    { name: 'resource.ownerType',       type: 'int',      example: '3' },
  ]},
  { group: 'Environment', vars: [
    { name: 'env.riskScore',     type: 'int (0–100)', example: '25' },
    { name: 'env.businessHours', type: 'boolean',     example: 'true' },
    { name: 'env.clientIp',      type: 'String',      example: "'192.168.1.1'" },
  ]},
  { group: 'Action', vars: [
    { name: 'action.name',     type: 'String',  example: "'READ'" },
    { name: 'action.mutation', type: 'boolean', example: 'false' },
  ]},
];

function SpelPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '420px', height: '100vh', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', borderLeft: '1px solid var(--color-base-300)',
        display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
        overflowY: 'auto',
      }}>
        <div style={{
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.5rem 1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>SpEL Variable Reference</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'white',
            cursor: 'pointer', padding: '0.25rem', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '1rem', fontSize: '0.8rem' }}>
          <p style={{ opacity: 0.6, marginBottom: '1rem', lineHeight: 1.5 }}>
            Use these variables in condition expressions. Access nested fields directly
            (e.g., <code>subject.clearanceLevel &gt;= 4</code>).
          </p>
          {SPEL_VARS.map(({ group, vars }) => (
            <div key={group} style={{ marginBottom: '1.25rem' }}>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem',
              }}>
                {group}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {vars.map(v => (
                    <tr key={v.name} style={{ borderBottom: '1px solid var(--color-base-200)' }}>
                      <td style={{ padding: '0.3rem 0', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary)' }}>
                        {v.name}
                      </td>
                      <td style={{ padding: '0.3rem 0 0.3rem 0.75rem', opacity: 0.55, fontSize: '0.72rem' }}>
                        {v.type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Version History drawer (F09) ─────────────────────────────────────────────

function VersionHistoryDrawer({ policyId, policyName, onClose }: {
  policyId: string; policyName: string; onClose: () => void;
}) {
  const { data: versions, isLoading } = useGetPolicyVersionsQuery(policyId);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '460px', height: '100vh', background: 'var(--color-base-100)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', borderLeft: '1px solid var(--color-base-300)',
        display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
      }}>
        <div style={{
          background: 'var(--ent-dark)', color: 'white',
          padding: '0.5rem 1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
            Version History — {policyName}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'white',
            cursor: 'pointer', padding: '0.25rem', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Loading...</div>
          )}
          {!isLoading && (!versions || versions.length === 0) && (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
              No version history yet.
            </div>
          )}
          {versions?.map(v => (
            <div key={v.id} style={{
              borderRadius: '0.5rem', border: '1px solid var(--color-base-300)',
              padding: '0.75rem 1rem', marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>v{v.version}</span>
                <EffectBadge effect={v.effect} />
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '0.75rem',
                background: 'var(--color-base-200)', padding: '0.4rem 0.6rem',
                borderRadius: '0.25rem', marginBottom: '0.5rem',
                wordBreak: 'break-all',
              }}>
                {v.conditionExpr}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', opacity: 0.6 }}>
                <span>{v.changedBy ?? '—'}</span>
                <span>{v.changeReason ?? '—'}</span>
                <span style={{ marginLeft: 'auto' }}>{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Policy Form (F06) ────────────────────────────────────────────────────────

const EFFECT_OPTIONS: Array<'PERMIT' | 'DENY'> = ['PERMIT', 'DENY'];

const emptyForm = (): PolicyRequest => ({
  name: '', description: '', resourceType: '', action: '',
  effect: 'PERMIT', priority: 100, conditionExpr: '', changeReason: '',
});

function PolicyFormModal({ open, policy, onClose }: {
  open: boolean; policy: PolicyResponse | null; onClose: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<PolicyRequest>(() =>
    policy
      ? {
          name: policy.name,
          description: policy.description ?? '',
          resourceType: policy.resourceType ?? '',
          action: policy.action ?? '',
          effect: policy.effect,
          priority: policy.priority,
          conditionExpr: policy.conditionExpr,
          changeReason: '',
        }
      : emptyForm()
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

  const validate = (): boolean => {
    const e: Partial<Record<keyof PolicyRequest, string>> = {};
    if (!form.name.trim())         e.name = 'Name is required';
    if (!form.conditionExpr.trim()) e.conditionExpr = 'Condition expression is required';
    if (form.priority < 1 || form.priority > 9999) e.priority = 'Priority must be 1–9999';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const body: PolicyRequest = {
      ...form,
      resourceType: form.resourceType?.trim() || undefined,
      action: form.action?.trim() || undefined,
      description: form.description?.trim() || undefined,
      changeReason: form.changeReason?.trim() || undefined,
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

  const inp = (
    k: keyof PolicyRequest,
    label: string,
    required?: boolean,
    placeholder?: string,
    type: 'text' | 'number' = 'text',
  ) => (
    <div style={{ marginBottom: '1rem' }}>
      <FL text={label} required={required} />
      <input
        className="input input-bordered w-full input-sm"
        type={type}
        value={String(form[k] ?? '')}
        placeholder={placeholder}
        onChange={e => set(k, type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{ fontFamily: k === 'conditionExpr' ? 'monospace' : undefined }}
      />
      {errors[k] && <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.25rem' }}>{errors[k]}</p>}
    </div>
  );

  if (!open) return null;

  return (
    <Modal
      key={policy?.id ?? 'new'}
      open={open}
      title={isEdit ? `Edit Policy — ${policy!.name}` : 'Create Policy'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : (isEdit ? 'Save Changes' : 'Create')}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>{inp('name', 'Name', true, 'e.g. account_status_gate')}</div>
        <div style={{ gridColumn: '1 / -1' }}>{inp('description', 'Description', false, 'Brief human-readable description')}</div>

        <div>
          <FL text="Effect" required />
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            {EFFECT_OPTIONS.map(eff => (
              <label key={eff} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                cursor: 'pointer', fontSize: '0.875rem',
              }}>
                <input
                  type="radio"
                  className="radio radio-sm"
                  checked={form.effect === eff}
                  onChange={() => set('effect', eff)}
                  style={{ accentColor: eff === 'PERMIT' ? '#16a34a' : '#dc2626' }}
                />
                <EffectBadge effect={eff} />
              </label>
            ))}
          </div>
        </div>

        <div>{inp('priority', 'Priority', true, '1–9999 (lower = evaluated first)', 'number')}</div>
        <div>{inp('resourceType', 'Resource Type', false, 'OPERATOR, LOCATION… (blank = any)')}</div>
        <div>{inp('action', 'Action', false, 'READ, CREATE… (blank = any)')}</div>

        <div style={{ gridColumn: '1 / -1' }}>
          <FL text="Condition Expression" required />
          <textarea
            className="textarea textarea-bordered w-full"
            rows={4}
            style={{ fontFamily: 'monospace', fontSize: '0.825rem', resize: 'vertical' }}
            value={form.conditionExpr}
            placeholder="subject.clearanceLevel >= 4 and subject.mfaVerified == true"
            onChange={e => set('conditionExpr', e.target.value)}
          />
          {errors.conditionExpr && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '0.25rem' }}>{errors.conditionExpr}</p>
          )}
        </div>

        {isEdit && (
          <div style={{ gridColumn: '1 / -1' }}>{inp('changeReason', 'Change Reason', false, 'Why are you making this change?')}</div>
        )}
      </div>
    </Modal>
  );
}

// ─── Evaluate panel (F08) ─────────────────────────────────────────────────────

const ACCOUNT_STATUSES = ['ACTIVE', 'DISABLED', 'LOCKED'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'CONTRACTOR', 'TEMP'];
const RISK_CATEGORIES  = ['LOW', 'MEDIUM', 'HIGH'];
const ACTIONS_LIST     = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'ASSIGN', 'APPROVE', 'PERMANENT_DELETE'];

function EvaluatePanel({ onClose }: { onClose: () => void }) {
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

  const set = (k: keyof EvaluateRequest, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const run = async () => {
    try {
      const r = await evaluate(form).unwrap();
      setResult(r);
    } catch {
      toast.error('Evaluation failed');
    }
  };

  const labelCls: React.CSSProperties = {
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.2rem',
    display: 'block',
  };

  return (
    <Modal open onClose={onClose} title="Simulate Policy Decision" size="xl">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Left: inputs */}
        <div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.75rem',
          }}>Subject</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={labelCls}>Clearance Level</span>
              <input className="input input-bordered input-sm w-full" type="number" min={1} max={5}
                value={form.subjectClearanceLevel ?? ''} onChange={e => set('subjectClearanceLevel', Number(e.target.value))} />
            </div>
            <div>
              <span style={labelCls}>Account Status</span>
              <select className="select select-bordered select-sm w-full"
                value={form.subjectAccountStatus ?? ''} onChange={e => set('subjectAccountStatus', e.target.value)}>
                {ACCOUNT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={labelCls}>Employment Type</span>
              <select className="select select-bordered select-sm w-full"
                value={form.subjectEmploymentType ?? ''} onChange={e => set('subjectEmploymentType', e.target.value)}>
                {EMPLOYMENT_TYPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={labelCls}>Risk Category</span>
              <select className="select select-bordered select-sm w-full"
                value={form.subjectRiskCategory ?? ''} onChange={e => set('subjectRiskCategory', e.target.value)}>
                {RISK_CATEGORIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1rem' }}>
              <input type="checkbox" className="checkbox checkbox-sm"
                checked={form.subjectMfaVerified ?? false}
                onChange={e => set('subjectMfaVerified', e.target.checked)} />
              <span style={{ fontSize: '0.825rem' }}>MFA Verified</span>
            </div>
          </div>

          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.75rem',
          }}>Resource</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={labelCls}>Resource Type</span>
              <input className="input input-bordered input-sm w-full"
                value={form.resourceType} onChange={e => set('resourceType', e.target.value)}
                placeholder="OPERATOR, LOCATION…" />
            </div>
            <div>
              <span style={labelCls}>Action</span>
              <select className="select select-bordered select-sm w-full"
                value={form.action} onChange={e => set('action', e.target.value)}>
                {ACTIONS_LIST.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <span style={labelCls}>Sensitivity Level</span>
              <input className="input input-bordered input-sm w-full" type="number" min={0} max={5}
                value={form.resourceSensitivityLevel ?? 0}
                onChange={e => set('resourceSensitivityLevel', Number(e.target.value))} />
            </div>
            <div>
              <span style={labelCls}>Location ID (0=global)</span>
              <input className="input input-bordered input-sm w-full" type="number" min={0}
                value={form.resourceLocationId ?? 0}
                onChange={e => set('resourceLocationId', Number(e.target.value))} />
            </div>
          </div>

          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', opacity: 0.45, marginBottom: '0.75rem',
          }}>Environment</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={labelCls}>Risk Score (0–100)</span>
              <input className="input input-bordered input-sm w-full" type="number" min={0} max={100}
                value={form.envRiskScore ?? 0} onChange={e => set('envRiskScore', Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1rem' }}>
              <input type="checkbox" className="checkbox checkbox-sm"
                checked={form.envBusinessHours ?? true}
                onChange={e => set('envBusinessHours', e.target.checked)} />
              <span style={{ fontSize: '0.825rem' }}>Business Hours</span>
            </div>
          </div>

          <button className="btn btn-primary btn-sm w-full" onClick={run} disabled={isLoading}>
            {isLoading
              ? <span className="loading loading-spinner loading-xs" />
              : <><Play size={14} /> Run Simulation</>}
          </button>
        </div>

        {/* Right: result */}
        <div style={{
          background: 'var(--color-base-200)', borderRadius: '0.5rem',
          padding: '1.25rem', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', opacity: 0.45, marginBottom: '1rem',
          }}>Decision Result</div>

          {!result && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
              Run simulation to see the decision
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.25rem', borderRadius: '0.5rem',
                background: result.isDeny ? '#fee2e2' : result.decision === 'PERMIT' ? '#dcfce7' : '#fef9c3',
                border: `2px solid ${result.isDeny ? '#fca5a5' : result.decision === 'PERMIT' ? '#86efac' : '#fde047'}`,
              }}>
                <span style={{
                  fontSize: '1.5rem', fontWeight: 800,
                  color: result.isDeny ? '#991b1b' : result.decision === 'PERMIT' ? '#166534' : '#854d0e',
                }}>
                  {result.decision}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {[
                  ['Matched Policy', result.matchedPolicy ?? 'None'],
                  ['Reason', result.reason ?? '—'],
                  ['Resource Type', result.resourceType],
                  ['Action', result.action],
                  ['Effective Clearance', String(result.effectiveClearanceLevel ?? '—')],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: 'flex', gap: '0.5rem',
                    background: 'var(--color-base-100)', padding: '0.4rem 0.6rem',
                    borderRadius: '0.375rem', fontSize: '0.8rem',
                  }}>
                    <span style={{ opacity: 0.55, flexShrink: 0 }}>{label}:</span>
                    <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page (F04, F05) ─────────────────────────────────────────────────────

function getPageNums(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

export default function PolicyManagementPage() {
  const toast = useToast();
  const operatorType = useAppSelector(s => s.auth.operator?.type ?? 5);
  const canRead   = hasPermission(operatorType, 'ABAC_POLICY', 'READ');
  const canCreate = hasPermission(operatorType, 'ABAC_POLICY', 'CREATE');
  const canUpdate = hasPermission(operatorType, 'ABAC_POLICY', 'UPDATE');
  const canDelete = hasPermission(operatorType, 'ABAC_POLICY', 'DELETE');

  // Filters
  const [page, setPage]               = useState(0);
  const [search, setSearch]           = useState('');
  const [filterEffect, setFilterEffect] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Panels
  const [showForm, setShowForm]         = useState(false);
  const [editPolicy, setEditPolicy]     = useState<PolicyResponse | null>(null);
  const [showSpel, setShowSpel]         = useState(false);
  const [showEval, setShowEval]         = useState(false);
  const [historyPolicy, setHistoryPolicy] = useState<PolicyResponse | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<PolicyResponse | null>(null);

  const params: PolicyListParams = {
    effect: filterEffect || undefined,
    active: filterActive === '' ? undefined : filterActive === 'true',
    page, size: PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = useListPoliciesQuery(params, { skip: !canRead });
  const [togglePolicy, { isLoading: toggling }] = useTogglePolicyMutation();
  const [deletePolicy, { isLoading: deleting }] = useDeletePolicyMutation();
  const [reloadCache]                           = useReloadPolicyCacheMutation();

  const policies  = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

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

  if (!canRead) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
        You do not have permission to view access policies.
      </div>
    );
  }

  // Filter by name client-side (server-side name filter not exposed)
  const displayed = search.trim()
    ? policies.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : policies;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Access Policies</h1>
          <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: '0.2rem 0 0' }}>
            ABAC policy engine — {data?.totalElements ?? 0} policies
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowSpel(true)}>
            <BookOpen size={14} /> SpEL Ref
          </button>
          {canRead && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowEval(true)}>
              <Play size={14} /> Simulate
            </button>
          )}
          {canUpdate && (
            <button className="btn btn-sm btn-ghost" onClick={handleReload}>
              <RefreshCw size={14} /> Reload Cache
            </button>
          )}
          {canCreate && (
            <button className="btn btn-sm btn-primary" onClick={() => { setEditPolicy(null); setShowForm(true); }}>
              <Plus size={14} /> New Policy
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input
            className="input input-bordered input-sm w-full"
            style={{ paddingLeft: '2rem' }}
            placeholder="Search name or description…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <select className="select select-bordered select-sm" value={filterEffect}
          onChange={e => { setFilterEffect(e.target.value); setPage(0); }}>
          <option value="">All Effects</option>
          <option value="PERMIT">PERMIT</option>
          <option value="DENY">DENY</option>
        </select>
        <select className="select select-bordered select-sm" value={filterActive}
          onChange={e => { setFilterActive(e.target.value); setPage(0); }}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--color-base-300)' }}>
        <table className="table table-sm" style={{ minWidth: '760px' }}>
          <thead>
            <tr style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.55 }}>
              <th>Priority</th>
              <th>Name</th>
              <th>Effect</th>
              <th>Resource / Action</th>
              <th>Status</th>
              <th>Version</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading || isFetching) && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>Loading…</td></tr>
            )}
            {!isLoading && !isFetching && displayed.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>No policies found.</td></tr>
            )}
            {displayed.map(p => (
              <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                <td>
                  <span style={{
                    display: 'inline-block', minWidth: '2rem', textAlign: 'center',
                    padding: '0.15rem 0.4rem', background: 'var(--color-base-200)',
                    borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: 700,
                  }}>
                    {p.priority}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                  {p.description && (
                    <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: '0.1rem' }}>{p.description}</div>
                  )}
                </td>
                <td><EffectBadge effect={p.effect} /></td>
                <td style={{ fontSize: '0.8rem' }}>
                  <span style={{ fontFamily: 'monospace', opacity: 0.75 }}>
                    {p.resourceType ?? '*'} / {p.action ?? '*'}
                  </span>
                </td>
                <td><ActiveBadge active={p.active} /></td>
                <td style={{ fontSize: '0.8rem', opacity: 0.6 }}>v{p.version}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-xs btn-ghost"
                      title="Version history"
                      onClick={() => setHistoryPolicy(p)}
                    >
                      <History size={13} />
                    </button>
                    {canUpdate && (
                      <>
                        <button
                          className="btn btn-xs btn-ghost"
                          title={p.active ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggle(p)}
                          disabled={toggling}
                        >
                          {p.active ? <ToggleRight size={14} style={{ color: '#16a34a' }} /> : <ToggleLeft size={14} style={{ opacity: 0.5 }} />}
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          title="Edit"
                          onClick={() => { setEditPolicy(p); setShowForm(true); }}
                        >
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        title="Delete"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '1rem' }}>
          <button className="btn btn-xs btn-ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          {getPageNums(page, totalPages).map((n, i) =>
            n === '...'
              ? <span key={`e${i}`} style={{ padding: '0 0.25rem', alignSelf: 'center', opacity: 0.4 }}>…</span>
              : <button key={n} className={`btn btn-xs ${n === page ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPage(n as number)}>
                  {(n as number) + 1}
                </button>
          )}
          <button className="btn btn-xs btn-ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modals + panels */}
      {showForm && (
        <PolicyFormModal
          open={showForm}
          policy={editPolicy}
          onClose={() => { setShowForm(false); setEditPolicy(null); }}
        />
      )}
      {showEval && <EvaluatePanel onClose={() => setShowEval(false)} />}
      {showSpel && <SpelPanel onClose={() => setShowSpel(false)} />}
      {historyPolicy && (
        <VersionHistoryDrawer
          policyId={historyPolicy.id}
          policyName={historyPolicy.name}
          onClose={() => setHistoryPolicy(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Policy"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
