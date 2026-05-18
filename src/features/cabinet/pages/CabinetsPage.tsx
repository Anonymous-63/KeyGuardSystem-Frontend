import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/store/hooks';
import { selectSelectedLocation } from '@/features/location/store/locationSlice';
import {
  useListCabinetsQuery,
  useLazyListCabinetsQuery,
  useCreateCabinetMutation,
  useUpdateCabinetMutation,
  useDisableCabinetMutation,
  useRestoreCabinetMutation,
} from '@/features/cabinet/api/cabinetApi';
import type { CabinetResponse, CabinetRequest } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import { Search, Pencil, Ban, RefreshCw, Download, Settings } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

const SYNC_LABELS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Pending',     cls: 'badge-neutral' },
  1: { label: 'Synced',      cls: 'badge-success' },
  2: { label: 'Out of Sync', cls: 'badge-warning' },
  3: { label: 'Error',       cls: 'badge-error' },
};

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.65,
      userSelect: 'none',
    }}>{text}</span>
    {required && (
      <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1, opacity: 1 }}>*</span>
    )}
  </div>
);

const Sect = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', margin: '0.125rem 0' }}>
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.35,
    }}>{label}</span>
    <div style={{ flex: 1, height: '1px', background: 'var(--color-base-300)' }} />
  </div>
);

function CabinetForm({ initial, onSave, onCancel, loading, isMobile = false }: {
  initial?: CabinetResponse;
  onSave: (data: CabinetRequest) => void;
  onCancel: () => void;
  loading: boolean;
  isMobile?: boolean;
}) {
  const selectedLocation = useAppSelector(selectSelectedLocation);

  const isEdit = !!initial;
  const locId  = isEdit ? initial!.location?.id : selectedLocation?.id;

  const locName = isEdit
    ? (initial!.location?.name ?? '—')
    : (selectedLocation?.name ?? '—');

  const locationId = locId ?? 0;
  const noLocationSelected = !isEdit && !selectedLocation;

  const [name,       setName]       = useState(initial?.name       ?? '');
  const [mac,        setMac]        = useState(initial?.mac        ?? '');
  const [ip,         setIp]         = useState(initial?.ip         ?? '');
  const [subnetMask, setSubnetMask] = useState(initial?.subnetMask ?? '');
  const [gateway,    setGateway]    = useState(initial?.gateway    ?? '');
  const [serverIp,   setServerIp]   = useState(initial?.serverIp   ?? '');
  const [serverUrl,  setServerUrl]  = useState(initial?.serverUrl  ?? '');

  // camera: '0' = No Camera, '1' = Built-in, '2' = IP Camera
  const [camera,      setCamera]      = useState(initial?.camera      ?? '0');
  const [cameraIp,    setCameraIp]    = useState(initial?.cameraIp    ?? '');
  const [photoPath,   setPhotoPath]   = useState(initial?.photoPath   ?? '');
  const [photoSuffix, setPhotoSuffix] = useState(initial?.photoSuffix ?? '');

  // face reader: opt-in toggle (was ng-if="false" in old app — treating it as new optional feature)
  const hasFrData = !!(initial?.faceReaderIp || initial?.faceReaderPort || initial?.faceReaderGatewayIp);
  const [frEnabled,         setFrEnabled]         = useState(hasFrData);
  const [faceReaderIp,      setFaceReaderIp]       = useState(initial?.faceReaderIp       ?? '');
  const [faceReaderPort,    setFaceReaderPort]     = useState(initial?.faceReaderPort      ? String(initial.faceReaderPort) : '');
  const [faceReaderGateway, setFaceReaderGateway]  = useState(initial?.faceReaderGatewayIp ?? '');

  const [macError,     setMacError]     = useState('');
  const [ipError,      setIpError]      = useState('');
  const [camIpError,   setCamIpError]   = useState('');
  const [photoPathErr, setPhotoPathErr] = useState('');
  const [photoSufErr,  setPhotoSufErr]  = useState('');
  const [frIpError,    setFrIpError]    = useState('');
  const [frPortError,  setFrPortError]  = useState('');
  const [frGwError,    setFrGwError]    = useState('');

  const isIpCamera = camera === '2';

  const validateMac = (v: string) => {
    if (!v.trim()) return 'Required';
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(v)) return 'Format: AA:BB:CC:DD:EE:FF';
    return '';
  };
  const validateIp = (v: string) => {
    if (!v.trim()) return 'Required';
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return 'Invalid IP format';
    return '';
  };
  const validateOptIp = (v: string) =>
    v.trim() && !/^(\d{1,3}\.){3}\d{1,3}$/.test(v) ? 'Invalid IP format' : '';
  const validatePort = (v: string) => {
    if (!v.trim()) return '';
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 65535) return 'Port must be 0–65535';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noLocationSelected) return;

    const me = validateMac(mac);
    const ie = validateIp(ip);
    const ce = isIpCamera ? (cameraIp.trim() ? validateOptIp(cameraIp) || '' : 'Required') : '';
    const pe = isIpCamera && !photoPath.trim() ? 'Required' : '';
    const se = isIpCamera && !photoSuffix.trim() ? 'Required' : '';
    const fie = frEnabled ? validateOptIp(faceReaderIp) : '';
    const fpe = frEnabled ? validatePort(faceReaderPort) : '';
    const fge = frEnabled ? validateOptIp(faceReaderGateway) : '';

    setMacError(me); setIpError(ie);
    setCamIpError(ce); setPhotoPathErr(pe); setPhotoSufErr(se);
    setFrIpError(fie); setFrPortError(fpe); setFrGwError(fge);
    if (me || ie || ce || pe || se || fie || fpe || fge) return;

    onSave({
      locationId,
      name, mac, ip, subnetMask, gateway,
      serverIp:  serverIp.trim()  || undefined,
      serverUrl: serverUrl.trim() || undefined,
      camera,
      cameraIp:    isIpCamera ? cameraIp.trim()    || undefined : undefined,
      photoPath:   isIpCamera ? photoPath.trim()   || undefined : undefined,
      photoSuffix: isIpCamera ? photoSuffix.trim() || undefined : undefined,
      faceReaderIp:        frEnabled ? faceReaderIp.trim()      || undefined : undefined,
      faceReaderPort:      frEnabled && faceReaderPort.trim()    ? Number(faceReaderPort) : undefined,
      faceReaderGatewayIp: frEnabled ? faceReaderGateway.trim() || undefined : undefined,
    });
  };

  const inp = 'input input-bordered w-full';
  const g2  = isMobile ? '1fr' : '1fr 1fr';

  // If creating without a location in the header, block the form
  if (noLocationSelected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '0.875rem 1rem',
          background: 'color-mix(in oklch, var(--color-warning) 12%, transparent)',
          border: '1px solid color-mix(in oklch, var(--color-warning) 40%, transparent)',
          borderRadius: '0.5rem',
        }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>⚠</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>No location selected</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
              Select a location from the switcher in the header, then open this form again.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Location — always read-only (locked from header on create, locked from record on edit) */}
      <div>
        <FL text="Location" required />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.45rem 0.75rem',
          background: isEdit
            ? 'var(--color-base-200)'
            : 'color-mix(in oklch, var(--color-primary) 8%, transparent)',
          border: `1px solid ${isEdit
            ? 'var(--color-base-300)'
            : 'color-mix(in oklch, var(--color-primary) 30%, transparent)'}`,
          borderRadius: '0.5rem',
          fontSize: '0.875rem', fontWeight: 500,
          color: isEdit ? 'var(--color-base-content)' : 'var(--color-primary)',
        }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.6, flexShrink: 0 }}>📍</span>
          <span style={{ flex: 1 }}>{locName}</span>
        </div>
      </div>

      {/* Name */}
      <div>
        <FL text="Cabinet Name" required />
        <input className={inp}
          value={name} onChange={(e) => setName(e.target.value)}
          required maxLength={30} placeholder="e.g. Cabinet A1" />
      </div>

      {/* Network */}
      <Sect label="Network Configuration" />

      <div style={{ display: 'grid', gridTemplateColumns: g2, gap: '0.75rem' }}>
        <div>
          <FL text="MAC Address" required />
          <input
            className={`${inp}${macError ? ' input-error' : ''}`}
            value={mac}
            onChange={(e) => { setMac(e.target.value); if (macError) setMacError(validateMac(e.target.value)); }}
            onBlur={() => setMacError(validateMac(mac))}
            maxLength={17} placeholder="AA:BB:CC:DD:EE:FF"
            style={{ fontFamily: 'monospace' }} />
          {macError && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{macError}</p>}
        </div>
        <div>
          <FL text="IP Address" required />
          <input
            className={`${inp}${ipError ? ' input-error' : ''}`}
            value={ip}
            onChange={(e) => { setIp(e.target.value); if (ipError) setIpError(validateIp(e.target.value)); }}
            onBlur={() => setIpError(validateIp(ip))}
            maxLength={15} placeholder="192.168.1.100"
            style={{ fontFamily: 'monospace' }} />
          {ipError && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{ipError}</p>}
        </div>
        <div>
          <FL text="Subnet Mask" required />
          <input className={inp}
            value={subnetMask} onChange={(e) => setSubnetMask(e.target.value)}
            required maxLength={15} placeholder="255.255.255.0"
            style={{ fontFamily: 'monospace' }} />
        </div>
        <div>
          <FL text="Gateway" required />
          <input className={inp}
            value={gateway} onChange={(e) => setGateway(e.target.value)}
            required maxLength={15} placeholder="192.168.1.1"
            style={{ fontFamily: 'monospace' }} />
        </div>
      </div>

      {/* Server */}
      <Sect label="Server Settings" />

      <div style={{ display: 'grid', gridTemplateColumns: g2, gap: '0.75rem' }}>
        <div>
          <FL text="Server IP" />
          <input className={inp}
            value={serverIp} onChange={(e) => setServerIp(e.target.value)}
            maxLength={15} placeholder="Optional"
            style={{ fontFamily: 'monospace' }} />
        </div>
        <div>
          <FL text="Server URL" />
          <input className={inp}
            value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
            maxLength={50} placeholder="Optional" />
        </div>
      </div>

      {/* Camera */}
      <Sect label="Camera" />

      <div>
        <FL text="Camera Type" required />
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {([
            { value: '0', label: 'No Camera' },
            { value: '1', label: 'Built-in' },
            { value: '2', label: 'IP Camera' },
          ] as const).map(({ value, label }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                className="radio radio-primary radio-sm"
                value={value}
                checked={camera === value}
                onChange={() => { setCamera(value); setCamIpError(''); setPhotoPathErr(''); setPhotoSufErr(''); }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {isIpCamera && (
        <div style={{
          display: 'grid', gridTemplateColumns: g2, gap: '0.75rem',
          padding: '0.875rem', borderRadius: '0.5rem',
          background: 'color-mix(in oklch, var(--color-primary) 5%, transparent)',
          border: '1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)',
        }}>
          <div>
            <FL text="Camera IP" required />
            <input
              className={`${inp}${camIpError ? ' input-error' : ''}`}
              value={cameraIp}
              onChange={(e) => { setCameraIp(e.target.value); if (camIpError) setCamIpError(''); }}
              onBlur={() => setCamIpError(cameraIp.trim() ? validateOptIp(cameraIp) : 'Required')}
              maxLength={15} placeholder="192.168.1.200"
              style={{ fontFamily: 'monospace' }} />
            {camIpError && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{camIpError}</p>}
          </div>
          <div>
            <FL text="Photo Directory" required />
            <input
              className={`${inp}${photoPathErr ? ' input-error' : ''}`}
              value={photoPath}
              onChange={(e) => { setPhotoPath(e.target.value); if (photoPathErr) setPhotoPathErr(''); }}
              placeholder="e.g. C:/CabinetPhotos/" />
            {photoPathErr && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{photoPathErr}</p>}
          </div>
          <div style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
            <FL text="Photo Suffix (filename pattern)" required />
            <input
              className={`${inp}${photoSufErr ? ' input-error' : ''}`}
              value={photoSuffix}
              onChange={(e) => { setPhotoSuffix(e.target.value); if (photoSufErr) setPhotoSufErr(''); }}
              placeholder="e.g. <YYYYMMDD_HHmmss>" />
            {photoSufErr
              ? <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{photoSufErr}</p>
              : <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', opacity: 0.45 }}>
                  Wrap datetime tokens in &lt; &gt; — e.g. &lt;YYYYMMDD_HHmmss&gt;
                </p>
            }
          </div>
        </div>
      )}

      {/* Face Reader — explicit enable toggle */}
      <div style={{
        borderRadius: '0.5rem',
        border: `1px solid ${frEnabled ? 'color-mix(in oklch, var(--color-secondary) 35%, transparent)' : 'var(--color-base-300)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
        {/* Toggle row */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.55rem 0.875rem',
          background: frEnabled
            ? 'color-mix(in oklch, var(--color-secondary) 7%, transparent)'
            : 'var(--color-base-200)',
          cursor: 'pointer',
        }}>
          <input type="checkbox" className="toggle toggle-sm toggle-secondary"
            checked={frEnabled}
            onChange={(e) => {
              setFrEnabled(e.target.checked);
              if (!e.target.checked) { setFrIpError(''); setFrPortError(''); setFrGwError(''); }
            }} />
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Face Reader</span>
            <span style={{ fontSize: '0.72rem', opacity: 0.5, marginLeft: '0.5rem' }}>
              {frEnabled ? 'enabled' : 'not configured'}
            </span>
          </div>
        </label>

        {frEnabled && (
          <div style={{
            display: 'grid', gridTemplateColumns: g2, gap: '0.75rem',
            padding: '0.875rem',
            borderTop: '1px solid color-mix(in oklch, var(--color-secondary) 25%, transparent)',
            background: 'color-mix(in oklch, var(--color-secondary) 4%, transparent)',
          }}>
            <div>
              <FL text="Face Reader IP" />
              <input
                className={`${inp}${frIpError ? ' input-error' : ''}`}
                value={faceReaderIp}
                onChange={(e) => { setFaceReaderIp(e.target.value); if (frIpError) setFrIpError(''); }}
                onBlur={() => setFrIpError(validateOptIp(faceReaderIp))}
                maxLength={15} placeholder="e.g. 192.168.1.50"
                style={{ fontFamily: 'monospace' }} />
              {frIpError && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{frIpError}</p>}
            </div>
            <div>
              <FL text="Face Reader Port" />
              <input
                className={`${inp}${frPortError ? ' input-error' : ''}`}
                type="number"
                value={faceReaderPort}
                onChange={(e) => { setFaceReaderPort(e.target.value); if (frPortError) setFrPortError(''); }}
                onBlur={() => setFrPortError(validatePort(faceReaderPort))}
                min={0} max={65535} placeholder="0–65535" />
              {frPortError && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{frPortError}</p>}
            </div>
            <div style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
              <FL text="Gateway IP" />
              <input
                className={`${inp}${frGwError ? ' input-error' : ''}`}
                value={faceReaderGateway}
                onChange={(e) => { setFaceReaderGateway(e.target.value); if (frGwError) setFrGwError(''); }}
                onBlur={() => setFrGwError(validateOptIp(faceReaderGateway))}
                maxLength={15} placeholder="e.g. 192.168.1.1"
                style={{ fontFamily: 'monospace' }} />
              {frGwError && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>{frGwError}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem',
        borderTop: '1px solid var(--color-base-200)',
        paddingTop: '0.875rem', marginTop: '0.125rem',
      }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '130px' }} disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          {isEdit ? 'Save Changes' : 'Create Cabinet'}
        </button>
      </div>
    </form>
  );
}

type Tab = 'all' | 'active' | 'disabled';

export default function CabinetsPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const { canAccess } = usePermissions();

  const can = useCallback(
    (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'EXPORT' | 'MANAGE_CABINET') => canAccess('CABINET', action),
    [canAccess],
  );

  const selectedLocation = useAppSelector(selectSelectedLocation);

  const [activeTab,    setActiveTab]    = useState<Tab>('active');
  const [filterSearch, setFilterSearch] = useState('');
  const [currentPage,  setCurrentPage]  = useState(0);

  const locationId = selectedLocation?.id ?? undefined;
  const [pageSize,         setPageSize]         = useState(20);
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editing,          setEditing]          = useState<CabinetResponse | null>(null);
  const [confirmState,     setConfirmState]     = useState<{ cab: CabinetResponse; action: 'disable' | 'restore' } | null>(null);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  useEffect(() => { setCurrentPage(0); }, [filterSearch, locationId, activeTab, pageSize]);

  const deletedParam = activeTab === 'all' ? undefined : activeTab === 'active' ? false : true;

  const { data, isLoading } = useListCabinetsQuery({ page: currentPage, size: pageSize, deleted: deletedParam, locationId });
  const { data: allData }      = useListCabinetsQuery({ page: 0, size: 1, locationId });
  const { data: activeData }   = useListCabinetsQuery({ page: 0, size: 1, deleted: false, locationId });
  const { data: disabledData } = useListCabinetsQuery({ page: 0, size: 1, deleted: true,  locationId });

  const counts = {
    all:      allData?.totalElements      ?? 0,
    active:   activeData?.totalElements   ?? 0,
    disabled: disabledData?.totalElements ?? 0,
  };

  const [fetchAll, { isFetching: exportFetching }] = useLazyListCabinetsQuery();

  const [create,  { isLoading: creating  }] = useCreateCabinetMutation();
  const [update,  { isLoading: updating  }] = useUpdateCabinetMutation();
  const [disable, { isLoading: disabling }] = useDisableCabinetMutation();
  const [restore, { isLoading: restoring }] = useRestoreCabinetMutation();

  const rows = useMemo(() => {
    let list = data?.content ?? [];
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.ip.toLowerCase().includes(q) ||
        c.mac.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.content, filterSearch]);

  const hasClientFilter = !!filterSearch.trim();
  const totalItems = hasClientFilter ? rows.length : (data?.totalElements ?? 0);
  const totalPages = hasClientFilter ? 1 : (data?.totalPages ?? 1);

  const hasActiveFilters = !!filterSearch;
  const clearFilters = () => { setFilterSearch(''); };

  const handleExport = async () => {
    if (totalItems === 0) return;
    try {
      const result = await fetchAll({ deleted: deletedParam, locationId, page: 0, size: totalItems }).unwrap();
      const headers = ['ID', 'Name', 'Location', 'IP', 'MAC', 'Status', 'Sync'];
      const csvData = result.content.map((c) => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.location?.name ?? '').replace(/"/g, '""')}"`,
        c.ip,
        c.mac,
        c.deleted ? 'Disabled' : 'Active',
        (SYNC_LABELS[c.syncStatus ?? 0] ?? SYNC_LABELS[0]).label,
      ]);
      const csv  = [headers, ...csvData].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'cabinets.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', message: 'Export failed' });
    }
  };

  const openEdit = (cab: CabinetResponse) => { setEditing(cab); setModalOpen(true); };

  const handleSave = async (body: CabinetRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else         await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Cabinet updated' : 'Cabinet created' });
      setModalOpen(false);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Failed to save cabinet' });
    }
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    try {
      if (confirmState.action === 'disable') await disable(confirmState.cab.id).unwrap();
      else                                   await restore(confirmState.cab.id).unwrap();
      addToast({
        type: 'success',
        message: confirmState.action === 'disable' ? 'Cabinet disabled' : 'Cabinet restored',
      });
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Action failed' });
    }
    setConfirmState(null);
  };

  const cols = useMemo<ColDef<CabinetResponse>[]>(() => [
    {
      field: 'name', headerName: 'Name',
      flex: 1, minWidth: 130,
    },
    {
      field: 'ip', headerName: 'IP Address',
      width: 135, minWidth: 110,
      cellRenderer: ({ value }: { value: string }) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{value}</span>
      ),
    },
    {
      field: 'mac', headerName: 'MAC',
      width: 150, minWidth: 120,
      cellRenderer: ({ value }: { value: string }) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.02em' }}>{value}</span>
      ),
    },
    {
      headerName: 'Status', width: 82, minWidth: 72, sortable: false,
      cellRenderer: ({ data: d }: { data: CabinetResponse }) => (
        d.deleted
          ? <span className="badge badge-soft badge-error badge-sm"   style={{ cursor: 'default' }}>Disabled</span>
          : <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
      ),
    },
    {
      headerName: 'Sync', width: 100, minWidth: 85, sortable: false,
      cellRenderer: ({ data: d }: { data: CabinetResponse }) => {
        const s = SYNC_LABELS[d.syncStatus ?? 0] ?? SYNC_LABELS[0];
        return <span className={`badge badge-soft badge-sm ${s.cls}`} style={{ cursor: 'default' }}>{s.label}</span>;
      },
    },
    {
      headerName: 'Actions',
      width: 195, minWidth: 180,
      sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: CabinetResponse }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
          {can('MANAGE_CABINET') && (
            <button className="btn btn-ghost btn-xs gap-1"
              onClick={(e) => { e.stopPropagation(); navigate(`/cabinets/${d.id}/settings`); }}>
              <Settings size={13} strokeWidth={1.5} /> Settings
            </button>
          )}
          {can('UPDATE') && !d.deleted && (
            <button className="btn btn-outline btn-xs gap-1"
              onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
              <Pencil size={13} strokeWidth={1.5} /> Edit
            </button>
          )}
          {can('DELETE') && !d.deleted && (
            <button className="btn btn-outline btn-error btn-xs gap-1"
              onClick={(e) => { e.stopPropagation(); setConfirmState({ cab: d, action: 'disable' }); }}>
              <Ban size={13} strokeWidth={1.5} /> Disable
            </button>
          )}
          {can('RESTORE') && d.deleted && (
            <button className="btn btn-outline btn-info btn-xs gap-1"
              onClick={(e) => { e.stopPropagation(); setConfirmState({ cab: d, action: 'restore' }); }}>
              <RefreshCw size={13} strokeWidth={1.5} /> Restore
            </button>
          )}
        </div>
      ),
    },
  ], [can, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{
          fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)',
          margin: 0, flex: 1, letterSpacing: '-0.01em',
        }}>
          Cabinets
        </h1>
        {can('CREATE') && (
          <button className="btn btn-sm btn-primary gap-1"
            onClick={() => { setEditing(null); setModalOpen(true); }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span> Add Cabinet
          </button>
        )}
      </div>

      {/* Card */}
      <div className="bg-base-100 shadow-sm"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '0.5rem', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flex: 1, paddingLeft: '0.25rem' }}>
            {(['all', 'active', 'disabled'] as Tab[]).map((tab) => {
              const isActive = activeTab === tab;
              const label    = tab === 'all' ? 'All' : tab === 'active' ? 'Active' : 'Disabled';
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
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
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--sb-border)', padding: '0 0.75rem', gap: '0.75rem' }}>
            {!isMobile && (
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : `${totalItems} record${totalItems !== 1 ? 's' : ''}`}
              </span>
            )}
            {can('EXPORT') && (
              <button
                onClick={handleExport}
                disabled={exportFetching || totalItems === 0}
                title="Export records as CSV"
                className={isMobile
                  ? 'btn btn-sm btn-outline btn-primary btn-square'
                  : 'btn btn-sm btn-outline btn-primary gap-1.5'}
                style={{ fontSize: '0.75rem', height: '1.75rem', minHeight: '1.75rem', paddingInline: isMobile ? undefined : '0.6rem' }}>
                {exportFetching
                  ? <span className="loading loading-spinner loading-xs" />
                  : <Download size={14} strokeWidth={1.5} />}
                {!isMobile && (exportFetching ? 'Exporting…' : 'Export CSV')}
              </button>
            )}
          </div>
        </div>

        {/* Filter strip */}
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center', gap: '0.4rem',
          padding: '0.45rem 0.875rem', borderBottom: '1px solid var(--sb-border)',
          background: 'var(--color-base-200)', flexShrink: 0,
        }}>
          <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '0.55rem', display: 'flex', pointerEvents: 'none', color: 'var(--sb-text-muted)' }}>
              <Search size={13} strokeWidth={1.5} />
            </span>
            <input className="input input-bordered input-sm"
              style={{ paddingLeft: '1.8rem', width: isMobile ? '100%' : '220px' }}
              placeholder="Search name, IP, MAC…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)} />
          </label>
          {hasActiveFilters && (
            <button className="btn btn-xs btn-ghost gap-1" onClick={clearFilters}>✕ Clear</button>
          )}
        </div>

        {/* Grid */}
        <DataGrid
          columnDefs={cols}
          rowData={rows}
          loading={isLoading}
          getRowId={(r) => String(r.id)}
          onRowDoubleClicked={(r) => { if (can('UPDATE') && !r.deleted) openEdit(r); }}
          height="100%"
          hideToolbar
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.45rem 0.875rem',
            borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-100)',
            flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : hasClientFilter
                  ? `${totalItems} result${totalItems !== 1 ? 's' : ''}`
                  : <>Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems}</>
                }
              </span>
              <select className="select select-bordered select-xs" value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ fontSize: '0.72rem', height: '1.5rem', minHeight: '1.5rem', paddingBlock: 0 }}>
                {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
            {totalPages > 1 && (
              isMobile ? (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  <button className="join-item btn btn-sm btn-active pointer-events-none">
                    {currentPage + 1} / {totalPages}
                  </button>
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                </div>
              ) : (
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage(0)}>«</button>
                  <button className="join-item btn btn-sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === '...'
                      ? <button key={`el-${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                      : <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={`join-item btn btn-sm${p === currentPage ? ' btn-active' : ''}`}>
                          {(p as number) + 1}
                        </button>
                  )}
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                  <button className="join-item btn btn-sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage(totalPages - 1)}>»</button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Edit / Create modal */}
      <Modal
        open={modalOpen}
        title={editing ? `Update Cabinet : ${editing.name}` : 'Add New Cabinet'}
        onClose={() => setModalOpen(false)}
        size="lg">
        <CabinetForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
          loading={creating || updating}
          isMobile={isMobile}
        />
      </Modal>

      {/* Disable / restore confirm */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.action === 'disable' ? 'Disable Cabinet' : 'Restore Cabinet'}
        message={
          confirmState?.action === 'disable'
            ? `Disable "${confirmState?.cab.name}"? It will stop syncing.`
            : `Restore "${confirmState?.cab.name}"?`
        }
        confirmLabel={confirmState?.action === 'disable' ? 'Disable' : 'Restore'}
        danger={confirmState?.action === 'disable'}
        loading={disabling || restoring}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
