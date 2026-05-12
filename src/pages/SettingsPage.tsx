import { useEffect, useRef, useState } from 'react';
import {
  Building2, Mail, MessageSquare, KeyRound, SlidersHorizontal,
  Eye, EyeOff, CheckCircle2, Circle, Server, Clock, ShieldCheck,
} from 'lucide-react';
import { useListConfigsQuery, useUpsertConfigMutation } from '../features/config/configApi';
import { useToast } from '../components/shared/Toast';
import { useAppSelector } from '../app/hooks';
import { hasPermission } from '../features/auth/permissions';

// ─── Config key map ───────────────────────────────────────────────────────────
const K = {
  ORG_NAME:           'org.name',
  MAIL_HOST:          'mail.smtp_host',
  MAIL_PORT:          'mail.smtp_port',
  MAIL_EMAIL:         'mail.host_email',
  MAIL_PASS:          'mail.host_pass',
  MAIL_SOCK_CLASS:    'mail.socket_factory_class',
  MAIL_SOCK_PORT:     'mail.socket_factory_port',
  SMS_HOST:           'sms.smpp_host',
  SMS_PORT:           'sms.smpp_port',
  SMS_USER:           'sms.user_id',
  SMS_PASS:           'sms.user_pass',
  SMS_TON:            'sms.ton',
  SMS_NPI:            'sms.npi',
  LDAP_ENABLED:       'ldap.enabled',
  LDAP_SECURED:       'ldap.secured',
  LDAP_URL:           'ldap.url',
  LDAP_USER_DN:       'ldap.user_dn_path',
  LDAP_AUTH_TYPE:     'ldap.auth_type',
  LDAP_KEYSTORE:      'ldap.keystore_path',
  LDAP_KEYSTORE_PASS: 'ldap.keystore_pass',
  FEATURE_CAPTCHA:    'feature.captcha',
  FEATURE_2FA:        'feature.two_step_auth',
  DB_BACKUP_TIME:     'db.auto_backup_time',
} as const;

const TON_OPTIONS = [
  { v: '0', l: 'Unknown' }, { v: '1', l: 'International' }, { v: '2', l: 'National' },
  { v: '3', l: 'Network Specific' }, { v: '4', l: 'Subscriber Number' },
  { v: '5', l: 'Alphanumeric' }, { v: '6', l: 'Abbreviated' },
];
const NPI_OPTIONS = [
  { v: '0', l: 'Unknown' }, { v: '1', l: 'ISDN / Telephone' }, { v: '3', l: 'Data' },
  { v: '4', l: 'Telex' }, { v: '6', l: 'Land Mobile' }, { v: '8', l: 'National' },
  { v: '9', l: 'Private' }, { v: '10', l: 'ERMES' }, { v: '14', l: 'Internet' },
];

type Section = 'org' | 'email' | 'sms' | 'ldap' | 'features';

// ─── Password field with show / hide toggle ───────────────────────────────────
function PwdInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        className="input input-bordered input-sm w-full"
        style={{ paddingRight: '2.4rem' }}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        maxLength={200}
        autoComplete="new-password"
      />
      <button type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-base-content)', opacity: 0.4, padding: '0.1rem',
          display: 'flex', alignItems: 'center',
        }}>
        {show ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────
const FL = ({ text, hint, required }: { text: string; hint?: string; required?: boolean }) => (
  <div style={{ marginBottom: '0.3rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <span style={{
        fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--color-base-content)', opacity: 0.6,
      }}>
        {text}
      </span>
      {required && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>*</span>}
    </div>
    {hint && (
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', opacity: 0.4, lineHeight: 1.4 }}>{hint}</p>
    )}
  </div>
);

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, description, children, dirty, saving, canSave, onSave }: {
  title: string; description?: string;
  children: React.ReactNode;
  dirty: boolean; saving: boolean; canSave: boolean;
  onSave: () => void;
}) {
  return (
    <div style={{
      border: `1px solid ${dirty ? 'color-mix(in oklch, var(--color-primary) 35%, transparent)' : 'var(--color-base-300)'}`,
      borderRadius: '0.625rem',
      overflow: 'hidden',
      background: 'var(--color-base-100)',
      transition: 'border-color 0.2s',
    }}>
      {/* Card header */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--color-base-200)',
        background: dirty
          ? 'color-mix(in oklch, var(--color-primary) 4%, var(--color-base-100))'
          : 'var(--color-base-50, var(--color-base-100))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.2s',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-base-content)' }}>{title}</div>
          {description && (
            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.15rem' }}>{description}</div>
          )}
        </div>
        {dirty && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'var(--color-primary)', opacity: 0.8,
          }}>
            Unsaved
          </span>
        )}
      </div>
      {/* Card body */}
      <div style={{ padding: '1.25rem' }}>
        {children}
      </div>
      {/* Card footer */}
      <div style={{
        padding: '0.625rem 1.25rem',
        borderTop: '1px solid var(--color-base-200)',
        background: 'var(--color-base-50, var(--color-base-100))',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem',
      }}>
        {!canSave && (
          <span style={{ fontSize: '0.72rem', opacity: 0.45, fontStyle: 'italic' }}>
            Read-only — insufficient permissions
          </span>
        )}
        {canSave && (
          <button
            className="btn btn-primary btn-sm"
            style={{ minWidth: '110px', gap: '0.375rem' }}
            onClick={onSave}
            disabled={saving || !dirty}>
            {saving && <span className="loading loading-spinner loading-xs" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
function Toggle({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 0.875rem',
      border: '1px solid var(--color-base-200)',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      background: checked
        ? 'color-mix(in oklch, var(--color-primary) 5%, transparent)'
        : 'transparent',
      transition: 'background 0.15s',
    }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.74rem', opacity: 0.45, marginTop: '0.1rem' }}>{desc}</div>}
      </div>
      <input type="checkbox" className="toggle toggle-primary toggle-sm"
        checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// ─── Grid helpers — auto-collapse below their minmax threshold ────────────────
const Row2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>{children}</div>
);
const Row3 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem' }}>{children}</div>
);
const HostPort = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>{children}</div>
);
const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>{children}</div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { addToast } = useToast();
  const operator = useAppSelector((s) => s.auth.operator);
  const canUpdate = operator != null && hasPermission(operator.type, 'APP_CONFIG', 'UPDATE');

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  const [active,  setActive]  = useState<Section>('org');
  const [savingSec, setSavingSec] = useState<Section | null>(null);

  // All config values in one flat map
  const [vals,    setVals]    = useState<Record<string, string>>({});
  // Snapshot at last load/save — used to detect dirty state per section
  const [saved,   setSaved]   = useState<Record<string, string>>({});

  const { data: configs = [], isLoading } = useListConfigsQuery();
  const [upsert] = useUpsertConfigMutation();
  const initialized = useRef(false);

  useEffect(() => {
    if (configs.length > 0 && !initialized.current) {
      initialized.current = true;
      const map: Record<string, string> = {};
      for (const c of configs) map[c.configKey] = c.configValue ?? '';
      setVals(map);
      setSaved(map);
    }
  }, [configs]);

  const v       = (key: string) => vals[key] ?? '';
  const set     = (key: string, val: string) => setVals((p) => ({ ...p, [key]: val }));
  const bool    = (key: string) => v(key) === 'true';
  const setBool = (key: string, val: boolean) => set(key, val ? 'true' : 'false');
  const inp     = 'input input-bordered input-sm w-full';
  const sel     = 'select select-bordered select-sm w-full';

  // Per-section key map
  const SECTION_KEYS: Record<Section, string[]> = {
    org:      [K.ORG_NAME],
    email:    [K.MAIL_HOST, K.MAIL_PORT, K.MAIL_EMAIL, K.MAIL_PASS, K.MAIL_SOCK_CLASS, K.MAIL_SOCK_PORT],
    sms:      [K.SMS_HOST, K.SMS_PORT, K.SMS_USER, K.SMS_PASS, K.SMS_TON, K.SMS_NPI],
    ldap:     [K.LDAP_ENABLED, K.LDAP_SECURED, K.LDAP_URL, K.LDAP_USER_DN, K.LDAP_AUTH_TYPE, K.LDAP_KEYSTORE, K.LDAP_KEYSTORE_PASS],
    features: [K.FEATURE_CAPTCHA, K.FEATURE_2FA, K.DB_BACKUP_TIME],
  };

  const isDirty = (sec: Section) => SECTION_KEYS[sec].some((k) => vals[k] !== saved[k]);

  const isConfigured = (sec: Section): boolean => {
    if (sec === 'org')      return v(K.ORG_NAME).trim().length > 0;
    if (sec === 'email')    return v(K.MAIL_HOST).trim().length > 0 && v(K.MAIL_EMAIL).trim().length > 0;
    if (sec === 'sms')      return v(K.SMS_HOST).trim().length > 0;
    if (sec === 'ldap')     return bool(K.LDAP_ENABLED) && v(K.LDAP_URL).trim().length > 0;
    if (sec === 'features') return bool(K.FEATURE_CAPTCHA) || bool(K.FEATURE_2FA);
    return false;
  };

  const saveSection = async (sec: Section) => {
    if (!canUpdate) return;
    setSavingSec(sec);
    const keys = SECTION_KEYS[sec];
    try {
      await Promise.all(keys.map((k) =>
        upsert({ key: k, body: { configValue: vals[k] ?? '' } }).unwrap(),
      ));
      setSaved((p) => {
        const next = { ...p };
        for (const k of keys) next[k] = vals[k] ?? '';
        return next;
      });
      addToast({ type: 'success', message: 'Settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings' });
    }
    setSavingSec(null);
  };

  // ─── Nav items ──────────────────────────────────────────────────────────────
  const NAV: { id: Section; label: string; sub: string; icon: React.ReactNode }[] = [
    { id: 'org',      label: 'Organization',  sub: 'Name & identity',     icon: <Building2    size={17} strokeWidth={1.5} /> },
    { id: 'email',    label: 'Email / SMTP',  sub: 'Mail server settings', icon: <Mail         size={17} strokeWidth={1.5} /> },
    { id: 'sms',      label: 'SMS / SMPP',    sub: 'SMS gateway',          icon: <MessageSquare size={17} strokeWidth={1.5} /> },
    { id: 'ldap',     label: 'LDAP',          sub: 'Directory auth',       icon: <KeyRound     size={17} strokeWidth={1.5} /> },
    { id: 'features', label: 'Features',      sub: 'Security & maintenance', icon: <SlidersHorizontal size={17} strokeWidth={1.5} /> },
  ];

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem' }}>
      <span className="loading loading-spinner loading-sm" />
      <span style={{ fontSize: '0.85rem', opacity: 0.45 }}>Loading settings…</span>
    </div>
  );

  const saving = savingSec === active;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page title */}
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
        Application Config
      </h1>

      {/* Two-panel layout — stacks on mobile */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flex: 1, minHeight: 0, gap: '1.25rem',
        alignItems: 'flex-start',
      }}>

        {/* ── Nav ───────────────────────────────────────────────────────────── */}
        {isMobile ? (
          /* Mobile: 5-segment bar — all tabs always visible, no scroll */
          <div style={{
            display: 'flex',
            border: '1px solid var(--color-base-300)',
            borderRadius: '0.625rem',
            overflow: 'hidden',
            background: 'var(--color-base-100)',
            flexShrink: 0, width: '100%',
          }}>
            {NAV.map(({ id, icon }, i) => {
              const isActive = active === id;
              const dirty    = isDirty(id);
              const cfgd     = isConfigured(id);
              const SHORT    = ({ org: 'Org', email: 'Email', sms: 'SMS', ldap: 'LDAP', features: 'Features' } as Record<string,string>)[id];
              return (
                <button key={id} onClick={() => setActive(id)}
                  style={{
                    flex: 1, minWidth: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '0.22rem', padding: '0.6rem 0.2rem 0.5rem',
                    background: isActive
                      ? 'var(--color-primary)'
                      : 'transparent',
                    color: isActive ? 'var(--color-primary-content)' : 'var(--color-base-content)',
                    border: 'none',
                    borderRight: i < NAV.length - 1 ? '1px solid var(--color-base-200)' : 'none',
                    cursor: 'pointer', position: 'relative',
                    transition: 'background 0.15s, color 0.15s',
                    opacity: isActive ? 1 : 0.5,
                  }}>
                  <span style={{ lineHeight: 1, display: 'flex' }}>{icon}</span>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: isActive ? 700 : 500,
                    lineHeight: 1, whiteSpace: 'nowrap',
                  }}>
                    {SHORT}
                  </span>
                  {/* Dot: warning=unsaved, success=configured */}
                  {(dirty || cfgd) && (
                    <span style={{
                      position: 'absolute', top: '5px', right: '6px',
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: dirty ? 'var(--color-warning)' : 'var(--color-success)',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Desktop: left sidebar */
          <div style={{
            width: '220px', flexShrink: 0,
            border: '1px solid var(--color-base-300)',
            borderRadius: '0.625rem',
            overflow: 'hidden',
            background: 'var(--color-base-100)',
          }}>
            {NAV.map(({ id, label, sub, icon }, i) => {
              const isActive = active === id;
              const dirty    = isDirty(id);
              const cfgd     = isConfigured(id);
              return (
                <button key={id} onClick={() => setActive(id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: i < NAV.length - 1 ? '1px solid var(--color-base-200)' : 'none',
                    background: isActive
                      ? 'color-mix(in oklch, var(--color-primary) 8%, transparent)'
                      : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}>
                  <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-base-content)', opacity: isActive ? 1 : 0.45, flexShrink: 0 }}>
                    {icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-primary)' : 'var(--color-base-content)' }}>
                        {label}
                      </span>
                      {dirty && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-warning)', flexShrink: 0 }} title="Unsaved changes" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub}
                    </div>
                  </div>
                  <span style={{ color: cfgd ? 'var(--color-success)' : 'var(--color-base-300)', flexShrink: 0 }}>
                    {cfgd
                      ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', display: 'block' }} title="Configured" />
                      : <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--color-base-300)', display: 'block' }} title="Not configured" />
                    }
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Right content ─────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, overflowY: 'auto',
          width: isMobile ? '100%' : undefined,
          minHeight: isMobile ? '360px' : undefined,
        }}>

          {/* ── Organization ────────────────────────────────────────────── */}
          {active === 'org' && (
            <Card title="Organization Identity" description="Displayed in page headers, reports, and notifications."
              dirty={isDirty('org')} saving={saving} canSave={canUpdate}
              onSave={() => saveSection('org')}>
              <Stack>
                <div>
                  <FL text="Organisation Name" required />
                  <input className={inp} value={v(K.ORG_NAME)}
                    onChange={(e) => set(K.ORG_NAME, e.target.value)}
                    maxLength={50} placeholder="e.g. Senergy Systems Pvt. Ltd." />
                </div>
              </Stack>
            </Card>
          )}

          {/* ── Email / SMTP ─────────────────────────────────────────────── */}
          {active === 'email' && (
            <Stack>
              <Card title="SMTP Server" description="Connection settings for the outgoing mail server."
                dirty={isDirty('email')} saving={saving} canSave={canUpdate}
                onSave={() => saveSection('email')}>
                <Stack>
                  <HostPort>
                    <div>
                      <FL text="SMTP Host" hint="Hostname or IP of your mail server" />
                      <input className={inp} value={v(K.MAIL_HOST)}
                        onChange={(e) => set(K.MAIL_HOST, e.target.value)}
                        placeholder="smtp.gmail.com" maxLength={100} />
                    </div>
                    <div>
                      <FL text="Port" />
                      <input className={inp} type="number" value={v(K.MAIL_PORT)}
                        onChange={(e) => set(K.MAIL_PORT, e.target.value)}
                        placeholder="587" min={1} max={65535} />
                    </div>
                  </HostPort>

                  <div>
                    <FL text="From Email Address" hint="Sender address shown to recipients" required />
                    <input className={inp} type="email" value={v(K.MAIL_EMAIL)}
                      onChange={(e) => set(K.MAIL_EMAIL, e.target.value)}
                      placeholder="noreply@yourdomain.com" maxLength={150} />
                  </div>

                  <div>
                    <FL text="SMTP Password" />
                    <PwdInput value={v(K.MAIL_PASS)} onChange={(val) => set(K.MAIL_PASS, val)} />
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem' }}>
                    <FL text="SSL Socket Factory Class" hint="Optional — only needed for legacy SSL/TLS setups" />
                    <HostPort>
                      <input className={inp} value={v(K.MAIL_SOCK_CLASS)}
                        onChange={(e) => set(K.MAIL_SOCK_CLASS, e.target.value)}
                        placeholder="javax.net.ssl.SSLSocketFactory" maxLength={100} />
                      <div>
                        <input className={inp} type="number" value={v(K.MAIL_SOCK_PORT)}
                          onChange={(e) => set(K.MAIL_SOCK_PORT, e.target.value)}
                          placeholder="Port" min={1} max={65535} />
                      </div>
                    </HostPort>
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* ── SMS / SMPP ───────────────────────────────────────────────── */}
          {active === 'sms' && (
            <Stack>
              <Card title="SMPP Gateway" description="Short Message Peer-to-Peer server for SMS delivery."
                dirty={isDirty('sms')} saving={saving} canSave={canUpdate}
                onSave={() => saveSection('sms')}>
                <Stack>
                  <HostPort>
                    <div>
                      <FL text="SMPP Host" hint="IP address or hostname of SMPP server" />
                      <input className={inp} value={v(K.SMS_HOST)}
                        onChange={(e) => set(K.SMS_HOST, e.target.value)}
                        placeholder="192.168.1.100" maxLength={100} />
                    </div>
                    <div>
                      <FL text="Port" />
                      <input className={inp} type="number" value={v(K.SMS_PORT)}
                        onChange={(e) => set(K.SMS_PORT, e.target.value)}
                        placeholder="2775" min={1} max={65535} />
                    </div>
                  </HostPort>

                  <Row2>
                    <div>
                      <FL text="System ID" hint="SMPP username / System ID" />
                      <input className={inp} value={v(K.SMS_USER)}
                        onChange={(e) => set(K.SMS_USER, e.target.value)}
                        maxLength={50} placeholder="System ID" />
                    </div>
                    <div>
                      <FL text="Password" />
                      <PwdInput value={v(K.SMS_PASS)} onChange={(val) => set(K.SMS_PASS, val)} />
                    </div>
                  </Row2>

                  <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem' }}>
                    <FL text="Addressing Parameters" hint="TON and NPI define how the source address is interpreted" />
                    <Row2>
                      <select className={sel} value={v(K.SMS_TON)} onChange={(e) => set(K.SMS_TON, e.target.value)}>
                        {TON_OPTIONS.map((o) => <option key={o.v} value={o.v}>TON {o.v} — {o.l}</option>)}
                      </select>
                      <select className={sel} value={v(K.SMS_NPI)} onChange={(e) => set(K.SMS_NPI, e.target.value)}>
                        {NPI_OPTIONS.map((o) => <option key={o.v} value={o.v}>NPI {o.v} — {o.l}</option>)}
                      </select>
                    </Row2>
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* ── LDAP ─────────────────────────────────────────────────────── */}
          {active === 'ldap' && (
            <Stack>
              <Card title="LDAP / Directory Authentication" description="Allow users to authenticate against a corporate directory."
                dirty={isDirty('ldap')} saving={saving} canSave={canUpdate}
                onSave={() => saveSection('ldap')}>
                <Stack>
                  <Toggle
                    label="Enable LDAP Authentication"
                    desc="Users will be authenticated against the directory server below."
                    checked={bool(K.LDAP_ENABLED)}
                    onChange={(val) => setBool(K.LDAP_ENABLED, val)}
                  />

                  <div style={{ opacity: bool(K.LDAP_ENABLED) ? 1 : 0.35, pointerEvents: bool(K.LDAP_ENABLED) ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <Stack>
                      <div>
                        <FL text="LDAP Server URL" hint='e.g. ldap://ldap.company.com:389 or ldaps://... for secured' required />
                        <input className={inp} value={v(K.LDAP_URL)}
                          onChange={(e) => set(K.LDAP_URL, e.target.value)}
                          placeholder="ldap://ldap.company.com:389" maxLength={200} />
                      </div>

                      <div>
                        <FL text="User DN Path" hint='Use ?? as the username placeholder — e.g. uid=??,ou=users,dc=company,dc=com' required />
                        <input className={inp} value={v(K.LDAP_USER_DN)}
                          onChange={(e) => set(K.LDAP_USER_DN, e.target.value)}
                          placeholder="uid=??,ou=users,dc=company,dc=com" maxLength={300} />
                      </div>

                      <Row2>
                        <div>
                          <FL text="Authentication Type" />
                          <input className={inp} value={v(K.LDAP_AUTH_TYPE)}
                            onChange={(e) => set(K.LDAP_AUTH_TYPE, e.target.value)}
                            placeholder="SIMPLE" maxLength={50} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <Toggle
                            label="Secured (LDAPS)"
                            desc="Use SSL/TLS for the connection"
                            checked={bool(K.LDAP_SECURED)}
                            onChange={(val) => setBool(K.LDAP_SECURED, val)}
                          />
                        </div>
                      </Row2>

                      {bool(K.LDAP_SECURED) && (
                        <div style={{
                          padding: '0.875rem', borderRadius: '0.5rem',
                          border: '1px dashed var(--color-base-300)',
                          background: 'var(--color-base-200)',
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.75rem' }}>
                            Keystore — LDAPS only
                          </div>
                          <Stack>
                            <div>
                              <FL text="Keystore File Path" hint="Absolute path to .jks or .p12 keystore file" />
                              <input className={inp} value={v(K.LDAP_KEYSTORE)}
                                onChange={(e) => set(K.LDAP_KEYSTORE, e.target.value)}
                                placeholder="/etc/ssl/certs/keystore.jks" maxLength={300} />
                            </div>
                            <div>
                              <FL text="Keystore Password" />
                              <PwdInput value={v(K.LDAP_KEYSTORE_PASS)} onChange={(val) => set(K.LDAP_KEYSTORE_PASS, val)} />
                            </div>
                          </Stack>
                        </div>
                      )}
                    </Stack>
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* ── Features ─────────────────────────────────────────────────── */}
          {active === 'features' && (
            <Stack>
              <Card title="Login Security" description="Additional verification steps for operator login."
                dirty={isDirty('features')} saving={saving} canSave={canUpdate}
                onSave={() => saveSection('features')}>
                <Stack>
                  <Toggle
                    label="CAPTCHA on Login"
                    desc="Display a CAPTCHA challenge on the login page to block automated attacks."
                    checked={bool(K.FEATURE_CAPTCHA)}
                    onChange={(val) => setBool(K.FEATURE_CAPTCHA, val)}
                  />
                  <Toggle
                    label="Two-Step Authentication"
                    desc="Require an OTP verification via email or SMS after the password step."
                    checked={bool(K.FEATURE_2FA)}
                    onChange={(val) => setBool(K.FEATURE_2FA, val)}
                  />

                  <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem' }}>
                    <FL text="Auto Backup Time" hint="Daily database backup schedule (24-hour clock)" />
                    <input className={inp} type="time" value={v(K.DB_BACKUP_TIME)}
                      onChange={(e) => set(K.DB_BACKUP_TIME, e.target.value)}
                      style={{ maxWidth: '140px' }} />
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}

        </div>
      </div>
    </div>
  );
}
