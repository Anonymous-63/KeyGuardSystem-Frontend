import { useEffect, useRef, useState } from 'react';
import {
  Building2, Mail, MessageSquare, KeyRound, SlidersHorizontal,
  Eye, EyeOff, UploadCloud, ImageIcon, Send,
} from 'lucide-react';
import {
  useGetAppConfigQuery,
  useUpdateOrganizationMutation,
  useUpdateSmtpMutation,
  useUpdateSmsMutation,
  useUpdateLdapMutation,
  useUpdateOtherMutation,
  useUpdateDbBackupMutation,
  useTestEmailMutation,
} from '@/features/config/api/configApi';
import { useToast } from '@/shared/components/ui/Toast';
import { useAppSelector } from '@/app/store/hooks';
import { hasPermissionByClearance, operatorClearance } from '@/features/auth/utils/permissions';

const TON_OPTIONS = [
  { v: 0, l: 'Unknown' }, { v: 1, l: 'International' }, { v: 2, l: 'National' },
  { v: 3, l: 'Network Specific' }, { v: 4, l: 'Subscriber Number' },
  { v: 5, l: 'Alphanumeric' }, { v: 6, l: 'Abbreviated' },
];
const NPI_OPTIONS = [
  { v: 0, l: 'Unknown' }, { v: 1, l: 'ISDN / Telephone' }, { v: 3, l: 'Data' },
  { v: 4, l: 'Telex' }, { v: 6, l: 'Land Mobile' }, { v: 8, l: 'National' },
  { v: 9, l: 'Private' }, { v: 14, l: 'Internet' },
];

type Section = 'org' | 'email' | 'sms' | 'ldap' | 'features';

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
      <button type="button" onClick={() => setShow((s) => !s)}
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

const FL = ({ text, hint, required }: { text: string; hint?: string; required?: boolean }) => (
  <div style={{ marginBottom: '0.3rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-base-content)', opacity: 0.8 }}>
        {text}
      </span>
      {required && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>*</span>}
    </div>
    {hint && <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', opacity: 0.6, lineHeight: 1.4 }}>{hint}</p>}
  </div>
);

function Card({ title, description, children, dirty, saving, canSave, onSave, noFooter }: {
  title: string; description?: string; children: React.ReactNode;
  dirty: boolean; saving: boolean; canSave: boolean; onSave: () => void; noFooter?: boolean;
}) {
  return (
    <div style={{
      border: `1px solid ${dirty ? 'color-mix(in oklch, var(--color-primary) 35%, transparent)' : 'var(--color-base-300)'}`,
      borderRadius: '0.625rem', overflow: 'hidden', background: 'var(--color-base-100)', transition: 'border-color 0.2s',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-base-200)',
        background: dirty ? 'color-mix(in oklch, var(--color-primary) 4%, var(--color-base-100))' : 'var(--color-base-50, var(--color-base-100))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-base-content)' }}>{title}</div>
          {description && <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.15rem' }}>{description}</div>}
        </div>
        {dirty && <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-primary)', opacity: 0.8 }}>Unsaved</span>}
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
      {!noFooter && (
        <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid var(--color-base-200)', background: 'var(--color-base-50, var(--color-base-100))', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
          {!canSave && <span style={{ fontSize: '0.72rem', opacity: 0.45, fontStyle: 'italic' }}>Read-only — insufficient permissions</span>}
          {canSave && (
            <button className="btn btn-primary btn-sm" style={{ minWidth: '110px', gap: '0.375rem' }} onClick={onSave} disabled={saving || !dirty}>
              {saving && <span className="loading loading-spinner loading-xs" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.875rem',
      border: '1px solid var(--color-base-200)', borderRadius: '0.5rem', cursor: 'pointer',
      background: checked ? 'color-mix(in oklch, var(--color-primary) 5%, transparent)' : 'transparent', transition: 'background 0.15s',
    }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.74rem', opacity: 0.45, marginTop: '0.1rem' }}>{desc}</div>}
      </div>
      <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const Row2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', alignItems: 'end' }}>{children}</div>
);
const HostPort = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem', alignItems: 'end' }}>{children}</div>
);
const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>{children}</div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { addToast } = useToast();
  const operator = useAppSelector((s) => s.auth.operator);
  const canUpdate = operator != null && hasPermissionByClearance(operatorClearance(operator), 'APP_CONFIG', 'UPDATE');

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  const [active, setActive] = useState<Section>('org');
  const [savingSec, setSavingSec] = useState<Section | null>(null);

  const { data: config, isLoading, fulfilledTimeStamp: configTs } = useGetAppConfigQuery();

  // ── Org state ──
  const [orgName, setOrgName] = useState('');
  const [savedOrgName, setSavedOrgName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasLogo = config?.organization?.orgLogoUrl != null;

  // ── SMTP state ──
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSockClass, setSmtpSockClass] = useState('');
  const [smtpSockPort, setSmtpSockPort] = useState<number | ''>('');
  const [savedSmtp, setSavedSmtp] = useState('');

  // ── SMS state ──
  const [smppHost, setSmppHost] = useState('');
  const [smppPort, setSmppPort] = useState(2775);
  const [smppUser, setSmppUser] = useState('');
  const [smppPass, setSmppPass] = useState('');
  const [smppTon, setSmppTon] = useState(1);
  const [smppNpi, setSmppNpi] = useState(1);
  const [savedSms, setSavedSms] = useState('');

  // ── LDAP state ──
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [ldapSecured, setLdapSecured] = useState(false);
  const [ldapUrl, setLdapUrl] = useState('');
  const [ldapDn, setLdapDn] = useState('');
  const [ldapAuth, setLdapAuth] = useState('SIMPLE');
  const [ldapKeystore, setLdapKeystore] = useState('');
  const [ldapKeystorePass, setLdapKeystorePass] = useState('');
  const [savedLdap, setSavedLdap] = useState('');

  // ── Features state ──
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaLen, setCaptchaLen] = useState(6);
  const [captchaValidity, setCaptchaValidity] = useState(120);
  const [twoStepAuth, setTwoStepAuth] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupTime, setBackupTime] = useState('02:00');
  const [retentionDays, setRetentionDays] = useState(7);
  const [savedFeatures, setSavedFeatures] = useState('');

  const [testEmailAddr, setTestEmailAddr] = useState('');

  const initialized = useRef(false);

  useEffect(() => {
    if (!config || initialized.current) return;
    initialized.current = true;

    const org = config.organization;
    const smtp = config.smtp;
    const sms = config.sms;
    const ldap = config.ldap;
    const other = config.other;
    const db = config.dbBackup;

    setOrgName(org?.orgName ?? '');
    setSavedOrgName(org?.orgName ?? '');

    setSmtpHost(smtp?.smtpHost ?? '');
    setSmtpPort(smtp?.smtpPort ?? 587);
    setSmtpUsername(smtp?.smtpUsername ?? '');
    setSmtpSockClass(smtp?.smtpSocketFactoryClass ?? '');
    setSmtpSockPort(smtp?.smtpSocketFactoryPort ?? '');
    setSavedSmtp(JSON.stringify({ host: smtp?.smtpHost ?? '', port: smtp?.smtpPort ?? 587, user: smtp?.smtpUsername ?? '', sc: smtp?.smtpSocketFactoryClass ?? '', sp: smtp?.smtpSocketFactoryPort ?? '' }));

    setSmppHost(sms?.smppHost ?? '');
    setSmppPort(sms?.smppPort ?? 2775);
    setSmppUser(sms?.smppUserId ?? '');
    setSmppTon(sms?.smppTon ?? 1);
    setSmppNpi(sms?.smppNpi ?? 1);
    setSavedSms(JSON.stringify({ host: sms?.smppHost ?? '', port: sms?.smppPort ?? 2775, user: sms?.smppUserId ?? '', ton: sms?.smppTon ?? 1, npi: sms?.smppNpi ?? 1 }));

    setLdapEnabled(ldap?.enabled ?? false);
    setLdapSecured(ldap?.secured ?? false);
    setLdapUrl(ldap?.url ?? '');
    setLdapDn(ldap?.userDnPath ?? '');
    setLdapAuth(ldap?.authType ?? 'SIMPLE');
    setLdapKeystore(ldap?.keystorePath ?? '');
    setSavedLdap(JSON.stringify({ en: ldap?.enabled ?? false, sec: ldap?.secured ?? false, url: ldap?.url ?? '', dn: ldap?.userDnPath ?? '', auth: ldap?.authType ?? 'SIMPLE', ks: ldap?.keystorePath ?? '' }));

    const capCfg = other?.captchaConfig ?? { enabled: false, captchaLength: 6, captchaValiditySeconds: 120 };
    setCaptchaEnabled(capCfg.enabled);
    setCaptchaLen(capCfg.captchaLength);
    setCaptchaValidity(capCfg.captchaValiditySeconds);
    setTwoStepAuth(other?.twoStepAuth ?? false);
    setBackupEnabled(db?.enabled ?? true);
    setBackupTime(db?.backupTime ?? '02:00');
    setRetentionDays(db?.retentionDays ?? 7);
    setSavedFeatures(JSON.stringify({ cap: capCfg, tsa: other?.twoStepAuth ?? false, be: db?.enabled ?? true, bt: db?.backupTime ?? '02:00', rd: db?.retentionDays ?? 7 }));
  }, [config]);

  const smtpSnapshot = () => JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUsername, sc: smtpSockClass, sp: smtpSockPort });
  const smsSnapshot  = () => JSON.stringify({ host: smppHost, port: smppPort, user: smppUser, ton: smppTon, npi: smppNpi });
  const ldapSnapshot = () => JSON.stringify({ en: ldapEnabled, sec: ldapSecured, url: ldapUrl, dn: ldapDn, auth: ldapAuth, ks: ldapKeystore });
  const featSnapshot = () => JSON.stringify({ cap: { enabled: captchaEnabled, captchaLength: captchaLen, captchaValiditySeconds: captchaValidity }, tsa: twoStepAuth, be: backupEnabled, bt: backupTime, rd: retentionDays });

  const isDirty = (sec: Section) => {
    if (sec === 'org')      return orgName !== savedOrgName || logoFile !== null;
    if (sec === 'email')    return smtpSnapshot() !== savedSmtp || smtpPassword !== '';
    if (sec === 'sms')      return smsSnapshot() !== savedSms || smppPass !== '';
    if (sec === 'ldap')     return ldapSnapshot() !== savedLdap || ldapKeystorePass !== '';
    if (sec === 'features') return featSnapshot() !== savedFeatures;
    return false;
  };

  const isConfigured = (sec: Section): boolean => {
    if (sec === 'org')      return (config?.organization?.orgName ?? '').length > 0;
    if (sec === 'email')    return (config?.smtp?.smtpHost ?? '').length > 0;
    if (sec === 'sms')      return (config?.sms?.smppHost ?? '').length > 0;
    if (sec === 'ldap')     return config?.ldap?.enabled === true;
    if (sec === 'features') return (config?.other?.captchaConfig?.enabled || config?.other?.twoStepAuth) ?? false;
    return false;
  };

  const [updateOrg]     = useUpdateOrganizationMutation();
  const [updateSmtp]    = useUpdateSmtpMutation();
  const [updateSms]     = useUpdateSmsMutation();
  const [updateLdap]    = useUpdateLdapMutation();
  const [updateOther]   = useUpdateOtherMutation();
  const [updateDbBackup] = useUpdateDbBackupMutation();
  const [testEmail, { isLoading: testingEmail }] = useTestEmailMutation();

  const inp = 'input input-bordered input-sm w-full';
  const sel = 'select select-bordered select-sm w-full';

  const saveOrg = async () => {
    setSavingSec('org');
    try {
      await updateOrg({ orgName, ...(logoFile ? { orgLogo: logoFile } : {}) }).unwrap();
      setSavedOrgName(orgName);
      setLogoFile(null);
      addToast({ type: 'success', message: 'Organisation settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save organisation settings' });
    }
    setSavingSec(null);
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await updateOrg({ orgName: orgName || (config?.organization?.orgName ?? ''), orgLogo: file }).unwrap();
      addToast({ type: 'success', message: 'Logo uploaded' });
    } catch {
      addToast({ type: 'error', message: 'Logo upload failed' });
    }
    setUploadingLogo(false);
    e.target.value = '';
  };

  const saveSmtp = async () => {
    setSavingSec('email');
    try {
      const body: Record<string, unknown> = { smtpHost, smtpPort, smtpUsername, smtpSocketFactoryClass: smtpSockClass || undefined, smtpSocketFactoryPort: smtpSockPort || undefined };
      if (smtpPassword.trim()) body.smtpPassword = smtpPassword.trim();
      await updateSmtp(body as Parameters<typeof updateSmtp>[0]).unwrap();
      setSmtpPassword('');
      setSavedSmtp(smtpSnapshot());
      addToast({ type: 'success', message: 'SMTP settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save SMTP settings' });
    }
    setSavingSec(null);
  };

  const saveSms = async () => {
    setSavingSec('sms');
    try {
      const body: Record<string, unknown> = { smppHost, smppPort, smppUserId: smppUser, smppTon, smppNpi };
      if (smppPass.trim()) body.smppUserPass = smppPass.trim();
      await updateSms(body as Parameters<typeof updateSms>[0]).unwrap();
      setSmppPass('');
      setSavedSms(smsSnapshot());
      addToast({ type: 'success', message: 'SMS settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save SMS settings' });
    }
    setSavingSec(null);
  };

  const saveLdap = async () => {
    setSavingSec('ldap');
    try {
      const body: Record<string, unknown> = { enabled: ldapEnabled, secured: ldapSecured, url: ldapUrl, userDnPath: ldapDn, authType: ldapAuth, keystorePath: ldapKeystore || undefined };
      if (ldapKeystorePass.trim()) body.keystorePass = ldapKeystorePass.trim();
      await updateLdap(body as Parameters<typeof updateLdap>[0]).unwrap();
      setLdapKeystorePass('');
      setSavedLdap(ldapSnapshot());
      addToast({ type: 'success', message: 'LDAP settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save LDAP settings' });
    }
    setSavingSec(null);
  };

  const saveFeatures = async () => {
    setSavingSec('features');
    try {
      await Promise.all([
        updateOther({ captchaConfig: { enabled: captchaEnabled, captchaLength: captchaLen, captchaValiditySeconds: captchaValidity }, twoStepAuth }).unwrap(),
        updateDbBackup({ enabled: backupEnabled, backupTime, retentionDays }).unwrap(),
      ]);
      setSavedFeatures(featSnapshot());
      addToast({ type: 'success', message: 'Feature settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save feature settings' });
    }
    setSavingSec(null);
  };

  const saveSection = (sec: Section) => {
    if (!canUpdate) return;
    if (sec === 'org')      return saveOrg();
    if (sec === 'email')    return saveSmtp();
    if (sec === 'sms')      return saveSms();
    if (sec === 'ldap')     return saveLdap();
    if (sec === 'features') return saveFeatures();
  };

  const NAV: { id: Section; label: string; sub: string; icon: React.ReactNode }[] = [
    { id: 'org',      label: 'Organization',  sub: 'Name & identity',        icon: <Building2         size={17} strokeWidth={1.5} /> },
    { id: 'email',    label: 'Email / SMTP',  sub: 'Mail server settings',   icon: <Mail              size={17} strokeWidth={1.5} /> },
    { id: 'sms',      label: 'SMS / SMPP',    sub: 'SMS gateway',            icon: <MessageSquare     size={17} strokeWidth={1.5} /> },
    { id: 'ldap',     label: 'LDAP',          sub: 'Directory auth',         icon: <KeyRound          size={17} strokeWidth={1.5} /> },
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '1rem' }}>
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Application Config</h1>

      {/* ── Horizontal Tab Bar ── */}
      <div style={{
        display: 'flex', background: 'var(--color-base-100)',
        border: '1px solid var(--color-base-300)', borderRadius: '0.625rem', overflow: 'hidden', flexShrink: 0,
      }}>
        {NAV.map(({ id, label, sub, icon }, i) => {
          const isActive = active === id;
          const dirty = isDirty(id);
          const cfgd = isConfigured(id);
          return (
            <button key={id} onClick={() => setActive(id)} style={{
              flex: 1, minWidth: 0, position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: isMobile ? '0.2rem' : '0.3rem',
              padding: isMobile ? '0.55rem 0.25rem' : '0.75rem 0.5rem',
              background: isActive
                ? 'color-mix(in oklch, var(--color-primary) 8%, var(--color-base-100))'
                : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
              borderRight: i < NAV.length - 1 ? '1px solid var(--color-base-200)' : 'none',
              cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
              color: isActive ? 'var(--color-primary)' : 'var(--color-base-content)',
              opacity: isActive ? 1 : 0.6,
            }}>
              {/* Status dots — top-right corner */}
              {dirty && (
                <span style={{ position: 'absolute', top: '6px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-warning)', flexShrink: 0 }} />
              )}
              {!dirty && cfgd && (
                <span style={{ position: 'absolute', top: '6px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 }} />
              )}
              <span style={{ display: 'flex', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: isMobile ? '0.62rem' : '0.8rem', fontWeight: isActive ? 600 : 500, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {isMobile ? label.split(' ')[0] : label}
              </span>
              {!isMobile && (
                <span style={{ fontSize: '0.68rem', opacity: 0.45, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{sub}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {/* ── Organization ── */}
          {active === 'org' && (
            <Stack>
              <Card title="Organization Identity" description="Displayed in page headers, reports, and notifications."
                dirty={isDirty('org')} saving={saving} canSave={canUpdate} onSave={() => saveSection('org')}>
                <div>
                  <FL text="Organisation Name" required />
                  <input className={inp} value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={100} placeholder="e.g. Senergy Systems Pvt. Ltd." />
                </div>
              </Card>

              <Card title="Organisation Logo" description="Displayed in the sidebar and on printed reports."
                dirty={false} saving={false} canSave={false} onSave={() => {}} noFooter>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFile} />
                {hasLogo ? (
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '7rem', height: '5rem', flexShrink: 0, border: '1px solid var(--color-base-300)', borderRadius: '0.625rem', background: 'var(--color-base-200)', overflow: 'hidden', cursor: canUpdate ? 'pointer' : 'default' }}
                      onClick={() => canUpdate && logoInputRef.current?.click()} onMouseEnter={() => setLogoHover(true)} onMouseLeave={() => setLogoHover(false)}>
                      <img src={`/api/v1/config/logo?v=${configTs ?? ''}`} alt="org logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      {canUpdate && logoHover && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <UploadCloud size={18} color="white" strokeWidth={1.75} />
                          <span style={{ color: 'white', fontSize: '0.68rem', fontWeight: 600 }}>Replace</span>
                        </div>
                      )}
                      {uploadingLogo && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="loading loading-spinner loading-sm" />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ImageIcon size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Logo configured</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', opacity: 0.5, margin: 0, lineHeight: 1.4 }}>JPG, PNG or WebP · max 5 MB</p>
                      {canUpdate && (
                        <button className="btn btn-sm btn-outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                          <UploadCloud size={13} strokeWidth={1.75} />
                          {uploadingLogo ? 'Uploading…' : 'Replace Logo'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div onClick={() => canUpdate && logoInputRef.current?.click()} onMouseEnter={() => setLogoHover(true)} onMouseLeave={() => setLogoHover(false)}
                    style={{ border: `2px dashed ${logoHover && canUpdate ? 'var(--color-primary)' : 'var(--color-base-300)'}`, borderRadius: '0.75rem', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', cursor: canUpdate ? 'pointer' : 'default', background: logoHover && canUpdate ? 'color-mix(in oklch, var(--color-primary) 5%, var(--color-base-100))' : 'var(--color-base-200)', transition: 'border-color 0.15s, background 0.15s', textAlign: 'center', minHeight: '130px' }}>
                    {uploadingLogo ? <span className="loading loading-spinner loading-md" style={{ opacity: 0.5 }} /> : (
                      <>
                        <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: 'var(--color-base-300)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UploadCloud size={22} strokeWidth={1.5} style={{ opacity: 0.55 }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{canUpdate ? 'Click to upload logo' : 'No logo set'}</p>
                          {canUpdate && <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', opacity: 0.45 }}>JPG, PNG or WebP · max 5 MB</p>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            </Stack>
          )}

          {/* ── Email / SMTP ── */}
          {active === 'email' && (
            <Stack>
              <Card title="SMTP Server" description="Connection settings for the outgoing mail server."
                dirty={isDirty('email')} saving={saving} canSave={canUpdate} onSave={() => saveSection('email')}>
                <Stack>
                  <HostPort>
                    <div>
                      <FL text="SMTP Host" hint="Hostname or IP of your mail server" />
                      <input className={inp} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" maxLength={100} />
                    </div>
                    <div>
                      <FL text="Port" />
                      <input className={inp} type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} placeholder="587" min={1} max={65535} />
                    </div>
                  </HostPort>
                  <div>
                    <FL text="From Email Address" hint="Sender address shown to recipients" required />
                    <input className={inp} type="email" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="noreply@yourdomain.com" maxLength={150} />
                  </div>
                  <div>
                    <FL text="SMTP Password" hint="Leave blank to keep current password" />
                    <PwdInput value={smtpPassword} onChange={setSmtpPassword} placeholder="Enter new password to change" />
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem' }}>
                    <HostPort>
                      <div>
                        <FL text="SSL Socket Factory Class" hint="Optional — only needed for legacy SSL/TLS setups" />
                        <input className={inp} value={smtpSockClass} onChange={(e) => setSmtpSockClass(e.target.value)} placeholder="javax.net.ssl.SSLSocketFactory" maxLength={100} />
                      </div>
                      <div>
                        <FL text="Socket Port" hint="SSL socket factory port (optional)" />
                        <input className={inp} type="number" value={smtpSockPort} onChange={(e) => setSmtpSockPort(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 465" min={1} max={65535} />
                      </div>
                    </HostPort>
                  </div>
                </Stack>
              </Card>

              <div style={{ border: '1px solid var(--color-base-300)', borderRadius: '0.625rem', overflow: 'hidden', background: 'var(--color-base-100)' }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-base-200)', background: 'var(--color-base-50, var(--color-base-100))' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Send Test Email</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.15rem' }}>Verify that the SMTP configuration above works by sending a test message.</div>
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <FL text="Recipient Email" hint="Where the test message should be delivered" />
                      <input className={inp} type="email" value={testEmailAddr} onChange={(e) => setTestEmailAddr(e.target.value)} placeholder="admin@yourdomain.com" maxLength={150} disabled={testingEmail} />
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ gap: '0.375rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                      disabled={testingEmail || !testEmailAddr.trim() || !smtpHost.trim()}
                      onClick={async () => {
                        try {
                          await testEmail(testEmailAddr.trim()).unwrap();
                          addToast({ type: 'success', message: `Test email sent to ${testEmailAddr.trim()}` });
                        } catch (err: unknown) {
                          const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to send test email';
                          addToast({ type: 'error', message: msg });
                        }
                      }}>
                      {testingEmail ? <><span className="loading loading-spinner loading-xs" /> Sending…</> : <><Send size={13} strokeWidth={1.75} /> Send Test</>}
                    </button>
                  </div>
                  {!smtpHost.trim() && <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--color-warning)', opacity: 0.8 }}>Configure and save the SMTP Host first.</p>}
                </div>
              </div>
            </Stack>
          )}

          {/* ── SMS / SMPP ── */}
          {active === 'sms' && (
            <Stack>
              <Card title="SMPP Gateway" description="Short Message Peer-to-Peer server for SMS delivery."
                dirty={isDirty('sms')} saving={saving} canSave={canUpdate} onSave={() => saveSection('sms')}>
                <Stack>
                  <HostPort>
                    <div>
                      <FL text="SMPP Host" hint="IP address or hostname of SMPP server" />
                      <input className={inp} value={smppHost} onChange={(e) => setSmppHost(e.target.value)} placeholder="192.168.1.100" maxLength={100} />
                    </div>
                    <div>
                      <FL text="Port" />
                      <input className={inp} type="number" value={smppPort} onChange={(e) => setSmppPort(Number(e.target.value))} placeholder="2775" min={1} max={65535} />
                    </div>
                  </HostPort>
                  <Row2>
                    <div>
                      <FL text="System ID" hint="SMPP username / System ID" />
                      <input className={inp} value={smppUser} onChange={(e) => setSmppUser(e.target.value)} maxLength={50} placeholder="System ID" />
                    </div>
                    <div>
                      <FL text="Password" hint="Leave blank to keep current password" />
                      <PwdInput value={smppPass} onChange={setSmppPass} placeholder="Enter new password to change" />
                    </div>
                  </Row2>
                  <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem' }}>
                    <FL text="Addressing Parameters" hint="TON and NPI define how the source address is interpreted" />
                    <Row2>
                      <select className={sel} value={smppTon} onChange={(e) => setSmppTon(Number(e.target.value))}>
                        {TON_OPTIONS.map((o) => <option key={o.v} value={o.v}>TON {o.v} — {o.l}</option>)}
                      </select>
                      <select className={sel} value={smppNpi} onChange={(e) => setSmppNpi(Number(e.target.value))}>
                        {NPI_OPTIONS.map((o) => <option key={o.v} value={o.v}>NPI {o.v} — {o.l}</option>)}
                      </select>
                    </Row2>
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* ── LDAP ── */}
          {active === 'ldap' && (
            <Stack>
              <Card title="LDAP / Directory Authentication" description="Allow users to authenticate against a corporate directory."
                dirty={isDirty('ldap')} saving={saving} canSave={canUpdate} onSave={() => saveSection('ldap')}>
                <Stack>
                  <Toggle label="Enable LDAP Authentication" desc="Users will be authenticated against the directory server below." checked={ldapEnabled} onChange={setLdapEnabled} />
                  <div style={{ opacity: ldapEnabled ? 1 : 0.35, pointerEvents: ldapEnabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <Stack>
                      <div>
                        <FL text="LDAP Server URL" hint="e.g. ldap://ldap.company.com:389" required />
                        <input className={inp} value={ldapUrl} onChange={(e) => setLdapUrl(e.target.value)} placeholder="ldap://ldap.company.com:389" maxLength={200} />
                      </div>
                      <div>
                        <FL text="User DN Path" hint="Use ?? as the username placeholder" required />
                        <input className={inp} value={ldapDn} onChange={(e) => setLdapDn(e.target.value)} placeholder="uid=??,ou=users,dc=company,dc=com" maxLength={300} />
                      </div>
                      <Row2>
                        <div>
                          <FL text="Authentication Type" />
                          <input className={inp} value={ldapAuth} onChange={(e) => setLdapAuth(e.target.value)} placeholder="SIMPLE" maxLength={50} />
                        </div>
                        <div>
                          <Toggle label="Secured (LDAPS)" desc="Use SSL/TLS for the connection" checked={ldapSecured} onChange={setLdapSecured} />
                        </div>
                      </Row2>
                      {ldapSecured && (
                        <div style={{ padding: '0.875rem', borderRadius: '0.5rem', border: '1px dashed var(--color-base-300)', background: 'var(--color-base-200)' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.75rem' }}>Keystore — LDAPS only</div>
                          <Stack>
                            <div>
                              <FL text="Keystore File Path" hint="Absolute path to .jks or .p12 keystore file" />
                              <input className={inp} value={ldapKeystore} onChange={(e) => setLdapKeystore(e.target.value)} placeholder="/etc/ssl/certs/keystore.jks" maxLength={300} />
                            </div>
                            <div>
                              <FL text="Keystore Password" hint="Leave blank to keep current password" />
                              <PwdInput value={ldapKeystorePass} onChange={setLdapKeystorePass} placeholder="Enter new password to change" />
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

          {/* ── Features ── */}
          {active === 'features' && (
            <Stack>
              <Card title="Login Security" description="Additional verification steps for operator login."
                dirty={isDirty('features')} saving={saving} canSave={canUpdate} onSave={() => saveSection('features')}>
                <Stack>
                  <Toggle label="CAPTCHA on Login" desc="Display a CAPTCHA challenge on the login page to block automated attacks." checked={captchaEnabled} onChange={setCaptchaEnabled} />
                  {captchaEnabled && (
                    <Row2>
                      <div>
                        <FL text="Captcha Length" hint="Number of characters (4–10)" />
                        <input className={inp} type="number" value={captchaLen} onChange={(e) => setCaptchaLen(Number(e.target.value))} min={4} max={10} />
                      </div>
                      <div>
                        <FL text="Captcha Validity" hint="Seconds before captcha expires (30–600)" />
                        <input className={inp} type="number" value={captchaValidity} onChange={(e) => setCaptchaValidity(Number(e.target.value))} min={30} max={600} />
                      </div>
                    </Row2>
                  )}
                  <Toggle label="Two-Step Authentication" desc="Require an OTP verification via email or SMS after the password step." checked={twoStepAuth} onChange={setTwoStepAuth} />

                  <div style={{ borderTop: '1px solid var(--color-base-200)', paddingTop: '0.875rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.625rem' }}>Database Backup</div>
                    <Stack>
                      <Toggle label="Enable Auto Backup" desc="Automatically back up the database on the schedule below." checked={backupEnabled} onChange={setBackupEnabled} />
                      {backupEnabled && (
                        <Row2>
                          <div>
                            <FL text="Backup Time" hint="Daily backup schedule (24-hour clock)" />
                            <input className={inp} type="time" value={backupTime} onChange={(e) => setBackupTime(e.target.value)} style={{ maxWidth: '140px' }} />
                          </div>
                          <div>
                            <FL text="Retention Days" hint="Keep backups for this many days (7–35)" />
                            <input className={inp} type="number" value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} min={7} max={35} />
                          </div>
                        </Row2>
                      )}
                    </Stack>
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}

      </div>
    </div>
  );
}
