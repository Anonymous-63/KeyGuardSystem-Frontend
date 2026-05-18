import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Cpu, Clock, Wifi, WifiOff, Save, RotateCcw,
  Settings2, Timer, Sliders, Network, DoorOpen, Siren,
} from 'lucide-react';
import {
  useGetCabinetQuery,
  useGetCabinetSettingsQuery,
  useUpdateCabinetSettingsMutation,
} from '@/features/cabinet/api/cabinetApi';
import type { CabinetSettingsRequest, LcdRelaySettingRequest } from '@/shared/types/api';
import PermissionGate from '@/shared/components/ui/PermissionGate';
import { useToast } from '@/shared/components/ui/Toast';

// ─── Design primitives ────────────────────────────────────────────────────────

function Card({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-base-200/70 border-b border-base-300">
        <span className="text-primary/70">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/55">{title}</h3>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-base-200 last:border-0 hover:bg-base-200/30 transition-colors">
      <div className="min-w-0">
        <p className="text-sm leading-snug">{label}</p>
        {hint && <p className="text-xs text-base-content/35">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-base-200 last:border-0 hover:bg-base-200/30 transition-colors cursor-pointer"
      onClick={() => onChange(!checked)}>
      <div className="min-w-0">
        <p className="text-sm leading-snug">{label}</p>
        {hint && <p className="text-xs text-base-content/35">{hint}</p>}
      </div>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-xs shrink-0"
        checked={checked}
        onChange={(e) => { e.stopPropagation(); onChange(e.target.checked); }}
      />
    </div>
  );
}

function NumRow({ label, hint, value, onChange, min, max, step = 1, unit }: {
  label: string; hint?: string; value: number;
  onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <Row label={label} hint={hint}>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="input input-bordered input-xs w-20 text-right tabular-nums"
          value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="text-xs text-base-content/40 w-6">{unit}</span>}
      </div>
    </Row>
  );
}

function SelectRow<T extends string | number>({ label, hint, value, onChange, options }: {
  label: string; hint?: string; value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Row label={label} hint={hint}>
      <select
        className="select select-bordered select-xs w-36"
        value={value as string | number}
        onChange={(e) => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}
      >
        {options.map((o) => <option key={String(o.value)} value={o.value as string | number}>{o.label}</option>)}
      </select>
    </Row>
  );
}

function BitRow({ label, bit, value, onChange }: {
  label: string; bit: number; value: number; onChange: (v: number) => void;
}) {
  const checked = (value & (1 << bit)) !== 0;
  return (
    <Toggle
      label={label}
      checked={checked}
      onChange={(on) => onChange(on ? value | (1 << bit) : value & ~(1 << bit))}
    />
  );
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WITHDRAW_OPTS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Multi Key' },
  { value: 2, label: 'Single Key' },
  { value: 3, label: 'Single Key With Locker' },
];

const READER_OPTS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Face Reader' },
  { value: 2, label: 'Fingerprint Reader' },
];

const LCD_ACCESS_OPTS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Card + FP' },
  { value: 2, label: 'Card Only' },
  { value: 3, label: 'FP Only' },
  { value: 4, label: 'ID Only' },
  { value: 5, label: 'ID + FP' },
];

const SYNC_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Synced',      cls: 'badge-success' },
  1: { label: 'Pending',     cls: 'badge-warning' },
  2: { label: 'Out of Sync', cls: 'badge-error' },
};

// ─── Modern sections ──────────────────────────────────────────────────────────

function ModernSettings({
  form, rfidEnabled, fpEnabled, qFaceAuthEnabled, onChange,
}: {
  form: CabinetSettingsRequest;
  rfidEnabled?: boolean; fpEnabled?: boolean; qFaceAuthEnabled?: boolean;
  onChange: (p: Partial<CabinetSettingsRequest>) => void;
}) {
  const n = (k: keyof CabinetSettingsRequest) => (form[k] as number) ?? 0;
  const b = (k: keyof CabinetSettingsRequest) => (form[k] as boolean) ?? false;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

      {/* Config */}
      <Card title="Configuration" icon={<Settings2 className="size-3.5" />}>
        <Row label="Display String" hint="Max 20 characters">
          <input
            type="text" maxLength={20}
            className="input input-bordered input-xs w-36"
            value={form.displayString ?? ''}
            onChange={(e) => onChange({ displayString: e.target.value })}
          />
        </Row>
        <SelectRow label="Withdraw Policy" value={form.withdrawPolicy ?? 0} onChange={(v) => onChange({ withdrawPolicy: v })} options={WITHDRAW_OPTS} />
        <NumRow label="Volume"      hint="0 – 10"   value={n('volume')}     min={0}  max={10}   onChange={(v) => onChange({ volume: v })} />
        <NumRow label="Brightness"  hint="0 – 10"   value={n('brightness')} min={0}  max={10}   onChange={(v) => onChange({ brightness: v })} />
        <NumRow label="FP Security" hint="0 – 9999" value={n('fpSecurity')} min={0}  max={9999} onChange={(v) => onChange({ fpSecurity: v })} />
      </Card>

      {/* Access Mode */}
      <Card title="Access Mode" icon={<Sliders className="size-3.5" />}>
        {rfidEnabled !== false && (
          <BitRow label="Card (RFID)"    bit={0} value={n('accessMode')} onChange={(v) => onChange({ accessMode: v })} />
        )}
        <BitRow label="Keypad ID"        bit={3} value={n('accessMode')} onChange={(v) => onChange({ accessMode: v })} />
        {fpEnabled !== false && (
          <BitRow label="FP Identify"    bit={5} value={n('accessMode')} onChange={(v) => onChange({ accessMode: v })} />
        )}
        <BitRow label="Wiegand"          bit={6} value={n('accessMode')} onChange={(v) => onChange({ accessMode: v })} />
        <BitRow label="Wiegand + Face"   bit={7} value={n('accessMode')} onChange={(v) => onChange({ accessMode: v })} />
        {qFaceAuthEnabled && (
          <Toggle
            label="qFace Auth"
            checked={(n('accessMode2') & 1) !== 0}
            onChange={(on) => onChange({ accessMode2: on ? n('accessMode2') | 1 : n('accessMode2') & ~1 })}
          />
        )}
      </Card>

      {/* Behaviour */}
      <Card title="Behaviour Flags" icon={<Sliders className="size-3.5" />}>
        <Toggle label="Auto Release"          checked={b('autoRelease')}         onChange={(v) => onChange({ autoRelease: v })} />
        <Toggle label="Multi Release"         checked={b('multiRelease')}        onChange={(v) => onChange({ multiRelease: v })} />
        <Toggle label="Notify Tamper"         checked={b('notifyTamper')}        onChange={(v) => onChange({ notifyTamper: v })} />
        <Toggle label="Check Time Constraint" checked={b('checkTimeConstraint')} onChange={(v) => onChange({ checkTimeConstraint: v })} />
        <Toggle label="Check Validity"        checked={b('checkValidity')}       onChange={(v) => onChange({ checkValidity: v })} />
        <Toggle label="Keypad Echo"           checked={b('keypadEcho')}          onChange={(v) => onChange({ keypadEcho: v })} />
        <Toggle label="Fixed Slot"            checked={b('fixedSlot')}           onChange={(v) => onChange({ fixedSlot: v })} />
        <Toggle label="Auth Return"           checked={b('authReturn')}          onChange={(v) => onChange({ authReturn: v })} />
      </Card>

      {/* Timeouts */}
      <Card title="Timeouts" icon={<Timer className="size-3.5" />}>
        <NumRow label="Key Bunch Release" hint="5 – 10 s"    value={n('keyBunchReleaseTimeout')} min={5}  max={10}  unit="s"   onChange={(v) => onChange({ keyBunchReleaseTimeout: v })} />
        <NumRow label="Key Release"       hint="5 – 10 s"    value={n('keyReleaseTimeout')}      min={5}  max={10}  unit="s"   onChange={(v) => onChange({ keyReleaseTimeout: v })} />
        <NumRow label="Keypad"            hint="5 – 16 s"    value={n('keypadTimeout')}          min={5}  max={16}  unit="s"   onChange={(v) => onChange({ keypadTimeout: v })} />
        <NumRow label="Door Close"        hint="12 – 30 s"   value={n('doorCloseTimeout')}       min={12} max={30}  unit="s"   onChange={(v) => onChange({ doorCloseTimeout: v })} />
        <NumRow label="Server Response"   hint="2 – 20 s"    value={n('serverRespTimeout')}      min={2}  max={20}  unit="s"   onChange={(v) => onChange({ serverRespTimeout: v })} />
        <NumRow label="Health Packet"     hint="0 – 20 min"  value={n('healthPacketInterval')}   min={0}  max={20}  unit="min" onChange={(v) => onChange({ healthPacketInterval: v })} />
        <NumRow label="Trans Upload"      hint="1 – 10"      value={n('transUploadCount')}       min={1}  max={10}           onChange={(v) => onChange({ transUploadCount: v })} />
      </Card>

      {/* I/O Masks */}
      <Card title="I/O Masks" icon={<Sliders className="size-3.5" />}>
        <NumRow label="Alarm Mask"   hint="0 – 65535" value={n('alarmMask')}  min={0} max={65535} onChange={(v) => onChange({ alarmMask: v })} />
        <NumRow label="Input Mask"   hint="0 – 255"   value={n('inputMask')}  min={0} max={255}   onChange={(v) => onChange({ inputMask: v })} />
        <NumRow label="Relay 1 Mask" hint="0 – 255"   value={n('relay1Mask')} min={0} max={255}   onChange={(v) => onChange({ relay1Mask: v })} />
        <NumRow label="Relay 2 Mask" hint="0 – 255"   value={n('relay2Mask')} min={0} max={255}   onChange={(v) => onChange({ relay2Mask: v })} />
        <NumRow label="Spare Mask"   hint="0 – 255"   value={n('spareMask')}  min={0} max={255}   onChange={(v) => onChange({ spareMask: v })} />
        <NumRow label="Door Mask"    hint="0 – 255"   value={n('doorMask')}   min={0} max={255}   onChange={(v) => onChange({ doorMask: v })} />
      </Card>

      {/* Output Timeouts */}
      <Card title="Output Timeouts" icon={<Timer className="size-3.5" />}>
        <NumRow label="Output Timeout 1" value={n('outputTimeout1')} min={0} max={255} onChange={(v) => onChange({ outputTimeout1: v })} />
        <NumRow label="Output Timeout 2" value={n('outputTimeout2')} min={0} max={255} onChange={(v) => onChange({ outputTimeout2: v })} />
        <NumRow label="Door Timeout 1"   value={n('doorTimeout1')}   min={0} max={255} onChange={(v) => onChange({ doorTimeout1: v })} />
        <NumRow label="Door Timeout 2"   value={n('doorTimeout2')}   min={0} max={255} onChange={(v) => onChange({ doorTimeout2: v })} />
        <NumRow label="Door Timeout 3"   value={n('doorTimeout3')}   min={0} max={255} onChange={(v) => onChange({ doorTimeout3: v })} />
        <NumRow label="Door Timeout 4"   value={n('doorTimeout4')}   min={0} max={255} onChange={(v) => onChange({ doorTimeout4: v })} />
      </Card>

    </div>
  );
}

// ─── LCD sections ─────────────────────────────────────────────────────────────

type RelayRow = LcdRelaySettingRequest & { eventName?: string };

function LcdSettings({
  form, cabinetIp, onChange,
}: { form: FormState; cabinetIp: string; onChange: (p: Partial<FormState>) => void }) {
  const n = (k: keyof CabinetSettingsRequest) => (form[k] as number) ?? 0;
  const b = (k: keyof CabinetSettingsRequest) => (form[k] as boolean) ?? false;

  const patchRelay = (idx: number, field: keyof LcdRelaySettingRequest, val: boolean | number) => {
    onChange({
      relaySettings: (form.relaySettings ?? []).map((r, i) => i === idx ? { ...r, [field]: val } : r),
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

      {/* Config */}
      <Card title="Configuration" icon={<Settings2 className="size-3.5" />}>
        <Row label="Display String" hint="Max 16 characters">
          <input
            type="text" maxLength={16}
            className="input input-bordered input-xs w-36"
            value={form.displayString ?? ''}
            onChange={(e) => onChange({ displayString: e.target.value })}
          />
        </Row>
        <SelectRow label="Withdraw Policy"  value={form.withdrawPolicy ?? 0} onChange={(v) => onChange({ withdrawPolicy: v })} options={WITHDRAW_OPTS} />
        <SelectRow label="Access Mode 1"    value={n('accessMode')}          onChange={(v) => onChange({ accessMode: v })}    options={LCD_ACCESS_OPTS} />
        <SelectRow label="Access Mode 2"    value={n('accessMode2')}         onChange={(v) => onChange({ accessMode2: v })}   options={LCD_ACCESS_OPTS} />
        <SelectRow label="Reader Type"      value={n('readerType')}          onChange={(v) => onChange({ readerType: v })}    options={READER_OPTS} />
      </Card>

      {/* Network */}
      <Card title="Network" icon={<Network className="size-3.5" />}>
        <Row label="Cabinet IP" hint="Read-only">
          <span className="font-mono text-sm text-base-content/50 bg-base-200 px-3 py-1 rounded-lg border border-base-300">
            {cabinetIp}
          </span>
        </Row>
        <NumRow label="Listen Port" hint="1 – 65535" value={n('listenPort')} min={1} max={65535} onChange={(v) => onChange({ listenPort: v })} />
        <NumRow label="Server Port" hint="1 – 65535" value={n('serverPort')} min={1} max={65535} onChange={(v) => onChange({ serverPort: v })} />
      </Card>

      {/* Behaviour */}
      <Card title="Behaviour Flags" icon={<Sliders className="size-3.5" />}>
        <Toggle label="Auto Release"          checked={b('autoRelease')}         onChange={(v) => onChange({ autoRelease: v })} />
        <Toggle label="Multi Release"         checked={b('multiRelease')}        onChange={(v) => onChange({ multiRelease: v })} />
        <Toggle label="Notify Tamper"         checked={b('notifyTamper')}        onChange={(v) => onChange({ notifyTamper: v })} />
        <Toggle label="Check Time Constraint" checked={b('checkTimeConstraint')} onChange={(v) => onChange({ checkTimeConstraint: v })} />
        <Toggle label="Check Validity"        checked={b('checkValidity')}       onChange={(v) => onChange({ checkValidity: v })} />
        <Toggle label="Keypad Echo"           checked={b('keypadEcho')}          onChange={(v) => onChange({ keypadEcho: v })} />
        <Toggle label="Fixed Slot"            checked={b('fixedSlot')}           onChange={(v) => onChange({ fixedSlot: v })} />
      </Card>

      {/* Timeouts */}
      <Card title="Timeouts" icon={<Timer className="size-3.5" />}>
        <NumRow label="Key Bunch Release" hint="5 – 10 s"   value={n('keyBunchReleaseTimeout')} min={5}  max={10}  unit="s"   onChange={(v) => onChange({ keyBunchReleaseTimeout: v })} />
        <NumRow label="Key Release"       hint="5 – 10 s"   value={n('keyReleaseTimeout')}      min={5}  max={10}  unit="s"   onChange={(v) => onChange({ keyReleaseTimeout: v })} />
        <NumRow label="Keypad"            hint="5 – 16 s"   value={n('keypadTimeout')}          min={5}  max={16}  unit="s"   onChange={(v) => onChange({ keypadTimeout: v })} />
        <NumRow label="Door Close"        hint="12 – 30 s"  value={n('doorCloseTimeout')}       min={12} max={30}  unit="s"   onChange={(v) => onChange({ doorCloseTimeout: v })} />
        <NumRow label="Server Response"   hint="2 – 20 s"   value={n('serverRespTimeout')}      min={2}  max={20}  unit="s"   onChange={(v) => onChange({ serverRespTimeout: v })} />
        <NumRow label="Health Packet"     hint="0 – 20 min" value={n('healthPacketInterval')}   min={0}  max={20}  unit="min" onChange={(v) => onChange({ healthPacketInterval: v })} />
        <NumRow label="Trans Upload"      hint="1 – 10"     value={n('transUploadCount')}       min={1}  max={10}             onChange={(v) => onChange({ transUploadCount: v })} />
      </Card>

      {/* Door */}
      <Card title="Door" icon={<DoorOpen className="size-3.5" />}>
        <NumRow label="Relay Timeout"    hint="0 – 2540 s" value={n('relayTimeout')}    min={0} max={2540} step={10} unit="s" onChange={(v) => onChange({ relayTimeout: v })} />
        <NumRow label="Input Mask"       hint="0 – 255"    value={n('inputMask')}       min={0} max={255}             onChange={(v) => onChange({ inputMask: v })} />
        <NumRow label="Door Mask"        hint="0 – 65535"  value={n('doorMask')}        min={0} max={65535}           onChange={(v) => onChange({ doorMask: v })} />
        <NumRow label="Input Mask Door 1" hint="0 – 65535" value={n('inputMaskDoor1')}  min={0} max={65535}           onChange={(v) => onChange({ inputMaskDoor1: v })} />
        <NumRow label="Input Mask Door 2" hint="0 – 65535" value={n('inputMaskDoor2')}  min={0} max={65535}           onChange={(v) => onChange({ inputMaskDoor2: v })} />
        <Toggle label="Open for Valid User" checked={b('openForValidUser')} onChange={(v) => onChange({ openForValidUser: v })} />
      </Card>

      {/* Relays & Alarms — full width */}
      <div className="sm:col-span-2 lg:col-span-3">
        <Card title="Relays & Alarms" icon={<Siren className="size-3.5" />}>
          {form.relaySettings && form.relaySettings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="bg-base-200/40 text-xs uppercase text-base-content/50">
                    <th className="w-48">Event</th>
                    <th className="text-center w-20">Relay 1</th>
                    <th className="text-center w-20">Relay 2</th>
                    <th className="text-center w-20">Alarm</th>
                    <th className="w-32">Delay (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {form.relaySettings.map((r, i) => (
                    <tr key={r.eventIndex} className="hover:bg-base-50">
                      <td className="font-medium text-sm">{r.eventName ?? `Event ${r.eventIndex}`}</td>
                      <td className="text-center">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                          checked={r.relay1 ?? false}
                          onChange={(e) => patchRelay(i, 'relay1', e.target.checked)} />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                          checked={r.relay2 ?? false}
                          onChange={(e) => patchRelay(i, 'relay2', e.target.checked)} />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-warning"
                          checked={r.alarm ?? false}
                          onChange={(e) => patchRelay(i, 'alarm', e.target.checked)} />
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <input type="number" className="input input-bordered input-xs w-20 text-right tabular-nums"
                            value={r.delayTimeout ?? 0} min={0} max={255}
                            onChange={(e) => patchRelay(i, 'delayTimeout', Number(e.target.value))} />
                          <span className="text-xs text-base-content/40">s</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-base-content/40 px-4 py-6">No relay configuration available.</p>
          )}
        </Card>
      </div>

    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FormState = CabinetSettingsRequest & { relaySettings?: RelayRow[] };

export default function CabinetSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const cabinetId = Number(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: cabinet, isLoading: loadingCabinet } = useGetCabinetQuery(cabinetId, { skip: !cabinetId });
  const { data: settings, isLoading: loadingSettings } = useGetCabinetSettingsQuery(cabinetId, { skip: !cabinetId });
  const [updateSettings, { isLoading: saving }] = useUpdateCabinetSettingsMutation();

  const [form, setForm] = useState<FormState | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) { setForm({ ...settings }); setDirty(false); }
  }, [settings]);

  const patch = (update: Partial<FormState>) => {
    setForm((prev) => prev ? { ...prev, ...update } : prev);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form) return;
    try {
      await updateSettings({ id: cabinetId, body: form }).unwrap();
      addToast({ type: 'success', message: 'Settings saved successfully' });
      setDirty(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings' });
    }
  };

  const handleReset = () => {
    if (settings) { setForm({ ...settings }); setDirty(false); }
  };

  if (loadingCabinet || loadingSettings) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!cabinet || !form) {
    return (
      <div className="text-center py-24">
        <p className="text-base-content/40">Cabinet not found.</p>
        <button className="btn btn-ghost mt-4" onClick={() => navigate('/cabinets')}>← Back</button>
      </div>
    );
  }

  const isLcd = (cabinet.cabinetType ?? 0) === 1;
  const sync = SYNC_STATUS[cabinet.syncStatus] ?? { label: `Status ${cabinet.syncStatus}`, cls: 'badge-ghost' };

  return (
    <div className="space-y-3">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => navigate(`/cabinets/${cabinetId}`)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{cabinet.name} — Settings</h1>
            <p className="text-xs text-base-content/50">
              {isLcd ? 'LCD 3.5"' : 'Modern'} cabinet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button className="btn btn-ghost btn-sm gap-1.5" onClick={handleReset}>
              <RotateCcw className="size-3.5" /> Discard
            </button>
          )}
          <PermissionGate resource="CABINET" action="MANAGE_CABINET">
            <button
              className={`btn btn-sm gap-1.5 ${dirty ? 'btn-primary' : 'btn-ghost'}`}
              disabled={!dirty || saving}
              onClick={handleSave}
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-3.5" />}
              Save Changes
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ── Cabinet info strip ── */}
      <div className="rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-base-200">
          <div className="px-3 py-2 flex items-center gap-2 col-span-2 sm:col-span-1 bg-base-200/40">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Cpu className="size-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/50">Type</p>
              <p className="text-sm font-semibold">{isLcd ? 'LCD 3.5"' : 'Modern'}</p>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-base-content/50">IP Address</p>
            <p className="font-mono text-xs font-medium mt-0.5">{cabinet.ip}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-base-content/50">MAC Address</p>
            <p className="font-mono text-xs font-medium mt-0.5">{cabinet.mac}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-base-content/50">Status</p>
            <span className={`badge badge-xs mt-1 ${sync.cls}`}>{sync.label}</span>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-base-content/50">Last Heartbeat</p>
            <div className="flex items-center gap-1 mt-0.5">
              {cabinet.liveAt
                ? <><Wifi className="size-3 text-success shrink-0" /><span className="text-xs">{fmtTime(cabinet.liveAt)}</span></>
                : <><WifiOff className="size-3 text-base-content/30 shrink-0" /><span className="text-xs text-base-content/40">Never</span></>
              }
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-base-content/50">Last Config Change</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="size-3 text-base-content/30 shrink-0" />
              <span className="text-xs">{fmtTime(cabinet.changedAt)}</span>
            </div>
          </div>
        </div>
        {(settings?.rfidEnabled || settings?.fpEnabled || settings?.qFaceAuthEnabled || (settings?.doorCount ?? 0) > 0) && (
          <div className="px-3 py-1.5 bg-base-200/20 border-t border-base-200 flex items-center gap-1.5">
            <span className="text-xs text-base-content/40 mr-1">Capabilities</span>
            {settings?.rfidEnabled      && <span className="badge badge-xs badge-outline">RFID</span>}
            {settings?.fpEnabled        && <span className="badge badge-xs badge-outline">Fingerprint</span>}
            {settings?.qFaceAuthEnabled && <span className="badge badge-xs badge-outline">Face Auth</span>}
            {settings?.doorCount != null && settings.doorCount > 0 && (
              <span className="badge badge-xs badge-outline">{settings.doorCount} door{settings.doorCount > 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Unsaved banner ── */}
      {dirty && (
        <div className="alert alert-warning py-2 text-sm gap-2">
          <span className="font-medium">Unsaved changes</span>
          <span className="text-warning-content/70">— click Save Changes to apply.</span>
        </div>
      )}

      {/* ── Settings grid ── */}
      {isLcd ? (
        <LcdSettings form={form} cabinetIp={cabinet.ip} onChange={patch} />
      ) : (
        <ModernSettings
          form={form}
          rfidEnabled={settings?.rfidEnabled}
          fpEnabled={settings?.fpEnabled}
          qFaceAuthEnabled={settings?.qFaceAuthEnabled}
          onChange={patch}
        />
      )}

    </div>
  );
}
