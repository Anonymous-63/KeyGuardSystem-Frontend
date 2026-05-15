import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useListLocationsQuery,
  useLazyListLocationsQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDisableLocationMutation,
  useRestoreLocationMutation,
  useBulkDisableLocationsMutation,
  useBulkRestoreLocationsMutation,
} from '@/features/location/api/locationApi';
import type { LocationResponse, LocationRequest, LocationAssetType, LocationCabinetType } from '@/shared/types/api';
import { LOCATION_ASSET_TYPES, LOCATION_CABINET_TYPES } from '@/shared/types/api';
import Modal from '@/shared/components/modal/Modal';
import ConfirmDialog from '@/shared/components/modal/ConfirmDialog';
import { useToast } from '@/shared/components/ui/Toast';
import { DataGrid, type ColDef } from '@/shared/components/table/DataGrid';
import { useAppSelector } from '@/app/store/hooks';
import { hasPermissionByClearance, operatorClearance } from '@/features/auth/utils/permissions';
import { Search, Download, Pencil, Ban, RefreshCw } from 'lucide-react';

const FEATURES_ENABLED   = '01000000000000000000';
const FEATURES_DISABLED  = '00000000000000000000';
const PAGE_SIZE_OPTIONS  = [20, 50, 100, 200];

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4)         return [0, 1, 2, 3, 4, '...', total - 1];
  if (current > total - 5) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

function decodeFeatures(hex?: string): boolean {
  return hex != null && hex.startsWith('01');
}

const FL = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.325rem' }}>
    <span style={{
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: 'var(--color-base-content)', opacity: 0.65,
      userSelect: 'none',
    }}>
      {text}
    </span>
    {required && (
      <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', lineHeight: 1, opacity: 1 }}>*</span>
    )}
  </div>
);

function LocationForm({
  initial, existingLocations, onSave, loading,
}: {
  initial?: LocationResponse;
  existingLocations: LocationResponse[];
  onSave: (data: LocationRequest) => void;
  loading: boolean;
}) {
  const defaultName        = initial?.name            ?? '';
  const defaultAssetType   = initial?.assetTypeName   ?? 'KEYS';
  const defaultCabinetType = initial?.cabinetTypeName ?? 'SINGLE';
  const defaultLcd         = decodeFeatures(initial?.features);

  const [name,        setName]        = useState(defaultName);
  const [assetType,   setAssetType]   = useState(defaultAssetType);
  const [cabinetType, setCabinetType] = useState(defaultCabinetType);
  const [lcdEnabled,  setLcdEnabled]  = useState(defaultLcd);
  const [nameError,   setNameError]   = useState('');

  function validateName(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return 'Name is required.';
    if (trimmed.length < 3) return 'Name must be at least 3 characters.';
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) return 'Name must contain only letters and spaces.';
    const dup = existingLocations.find(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase() && l.id !== initial?.id,
    );
    if (dup) return 'Location name already exists.';
    return '';
  }

  const handleNameChange = (v: string) => { setName(v); if (nameError) setNameError(validateName(v)); };
  const handleReset = () => {
    setName(defaultName); setAssetType(defaultAssetType);
    setCabinetType(defaultCabinetType); setLcdEnabled(defaultLcd); setNameError('');
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateName(name);
    if (err) { setNameError(err); return; }
    onSave({
      name:        name.trim(),
      assetType:   assetType   as LocationAssetType,
      cabinetType: cabinetType as LocationCabinetType,
      features:    lcdEnabled ? FEATURES_ENABLED : FEATURES_DISABLED,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      <div>
        <FL text="Location Name" required />
        <input
          className={`input input-bordered w-full${nameError ? ' input-error' : ''}`}
          value={name} placeholder="e.g. Mumbai Office" maxLength={50}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setNameError(validateName(name))}
        />
        {nameError && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--color-error)' }}>
            {nameError}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <FL text="Asset Type" required />
          <select className="select select-bordered w-full" value={assetType}
            onChange={(e) => setAssetType(e.target.value as LocationAssetType)} required>
            {Object.entries(LOCATION_ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <FL text="Cabinet Type" required />
          <select className="select select-bordered w-full" value={cabinetType}
            onChange={(e) => setCabinetType(e.target.value as LocationCabinetType)} required>
            {Object.entries(LOCATION_CABINET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div>
        <FL text="Features" />
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
          padding: '0.625rem 0.75rem',
          border: `1.5px solid ${lcdEnabled ? 'var(--color-primary)' : 'var(--color-base-300)'}`,
          borderRadius: '0.5rem',
          background: lcdEnabled ? 'color-mix(in oklch, var(--color-primary) 6%, transparent)' : 'transparent',
          transition: 'border-color 0.12s ease, background 0.12s ease',
          userSelect: 'none',
        }}>
          <input type="checkbox" className="checkbox checkbox-primary checkbox-sm"
            checked={lcdEnabled} onChange={(e) => setLcdEnabled(e.target.checked)} />
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-base-content)' }}>
              3.5&apos; LCD Cabinet
            </span>
            <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.4 }}>
              Enable LCD display support for this location&apos;s cabinets
            </p>
          </div>
        </label>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem',
        borderTop: '1px solid var(--color-base-200)',
        paddingTop: '0.875rem', marginTop: '0.125rem',
      }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleReset} disabled={loading}>
          Reset
        </button>
        <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '120px' }} disabled={loading}>
          {loading && <span className="loading loading-spinner loading-xs" />}
          {initial ? 'Save Changes' : 'Create Location'}
        </button>
      </div>
    </form>
  );
}

type Tab = 'all' | 'active' | 'disabled';

export default function LocationsPage() {
  const { addToast } = useToast();
  const operator = useAppSelector((s) => s.auth.operator);

  const can = useCallback(
    (action: 'CREATE' | 'UPDATE' | 'RESTORE' | 'DELETE') =>
      operator != null && hasPermissionByClearance(operatorClearance(operator), 'LOCATION', action),
    [operator],
  );

  const [activeTab,          setActiveTab]          = useState<Tab>('active');
  const [filterName,         setFilterName]         = useState('');
  const [filterAssetType,    setFilterAssetType]    = useState('');
  const [filterCabinetType,  setFilterCabinetType]  = useState('');
  const [debouncedName,      setDebouncedName]      = useState('');
  const [currentPage,        setCurrentPage]        = useState(0);
  const [pageSize,           setPageSize]           = useState(20);
  const [modalOpen,          setModalOpen]          = useState(false);
  const [editing,            setEditing]            = useState<LocationResponse | null>(null);
  const [confirm,            setConfirm]            = useState<{ loc: LocationResponse; action: 'disable' | 'restore' } | null>(null);
  const [selectedRows,       setSelectedRows]       = useState<LocationResponse[]>([]);
  const [clearTrigger,       setClearTrigger]       = useState(0);
  const [bulkLoading,        setBulkLoading]        = useState(false);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 768;

  // Debounce name filter 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(filterName), 300);
    return () => clearTimeout(t);
  }, [filterName]);

  // Reset page when any filter or tab changes
  useEffect(() => { setCurrentPage(0); }, [debouncedName, filterAssetType, filterCabinetType, activeTab, pageSize]);

  const disabledParam = activeTab === 'all' ? undefined : activeTab === 'active' ? false : true;
  const filterBase = {
    name:        debouncedName    || undefined,
    assetType:   filterAssetType  || undefined,
    cabinetType: filterCabinetType || undefined,
  };

  const { data, isLoading } = useListLocationsQuery({ ...filterBase, page: currentPage, size: pageSize, disabled: disabledParam });

  // Tab counts — 3 lightweight queries (size=1), same text filters, vary disabled only
  const { data: countAllData }      = useListLocationsQuery({ ...filterBase, page: 0, size: 1 });
  const { data: countActiveData }   = useListLocationsQuery({ ...filterBase, page: 0, size: 1, disabled: false });
  const { data: countDisabledData } = useListLocationsQuery({ ...filterBase, page: 0, size: 1, disabled: true });

  const counts = {
    all:      countAllData?.totalElements      ?? 0,
    active:   countActiveData?.totalElements   ?? 0,
    disabled: countDisabledData?.totalElements ?? 0,
  };

  const [fetchAll, { isFetching: exportFetching }] = useLazyListLocationsQuery();

  const [create,       { isLoading: creating  }] = useCreateLocationMutation();
  const [update,       { isLoading: updating  }] = useUpdateLocationMutation();
  const [disable,      { isLoading: disabling }] = useDisableLocationMutation();
  const [restore,      { isLoading: restoring }] = useRestoreLocationMutation();
  const [bulkDisable]                            = useBulkDisableLocationsMutation();
  const [bulkRestore]                            = useBulkRestoreLocationsMutation();

  const rows        = data?.content       ?? [];
  const totalItems  = data?.totalElements ?? 0;
  const totalPages  = data?.totalPages    ?? 1;

  const hasActiveFilters = !!(filterName || filterAssetType || filterCabinetType);

  const clearFilters = () => { setFilterName(''); setFilterAssetType(''); setFilterCabinetType(''); };

  const clearSelection = () => { setSelectedRows([]); setClearTrigger((n) => n + 1); };

  const handleExport = async () => {
    if (totalItems === 0) return;
    try {
      const result = await fetchAll({ ...filterBase, disabled: disabledParam, page: 0, size: totalItems }).unwrap();
      const headers = ['ID', 'Name', 'Asset Type', 'Cabinet Type', 'Status'];
      const csvData = result.content.map((r) => [
        r.id,
        `"${r.name.replace(/"/g, '""')}"`,
        r.assetTypeName   ? LOCATION_ASSET_TYPES[r.assetTypeName]   : '',
        r.cabinetTypeName ? LOCATION_CABINET_TYPES[r.cabinetTypeName] : '',
        r.disabled ? 'Disabled' : 'Active',
      ]);
      const csv  = [headers, ...csvData].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'locations.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', message: 'Export failed' });
    }
  };

  const handleSave = async (body: LocationRequest) => {
    try {
      if (editing) await update({ id: editing.id, body }).unwrap();
      else         await create(body).unwrap();
      addToast({ type: 'success', message: editing ? 'Location updated' : 'Location created' });
      setModalOpen(false);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string; error?: string } };
      addToast({ type: 'error', message: e?.data?.message || e?.data?.error || 'Failed to save location' });
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'disable') await disable(confirm.loc.id).unwrap();
      else                              await restore(confirm.loc.id).unwrap();
      addToast({ type: 'success', message: confirm.action === 'disable' ? 'Location disabled' : 'Location restored' });
    } catch {
      addToast({ type: 'error', message: 'Action failed' });
    }
    setConfirm(null);
  };

  const handleBulkDisable = async () => {
    const ids = selectedRows.filter((r) => !r.disabled).map((r) => r.id);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      const count = await bulkDisable(ids).unwrap();
      addToast({ type: 'success', message: `${count} location${count !== 1 ? 's' : ''} disabled` });
      clearSelection();
    } catch {
      addToast({ type: 'error', message: 'Bulk disable failed' });
    }
    setBulkLoading(false);
  };

  const handleBulkRestore = async () => {
    const ids = selectedRows.filter((r) => r.disabled).map((r) => r.id);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      const count = await bulkRestore(ids).unwrap();
      addToast({ type: 'success', message: `${count} location${count !== 1 ? 's' : ''} restored` });
      clearSelection();
    } catch {
      addToast({ type: 'error', message: 'Bulk restore failed' });
    }
    setBulkLoading(false);
  };

  const cols = useMemo<ColDef<LocationResponse>[]>(() => [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 100 },
    {
      headerName: 'Asset Type', width: 120, hide: isMobile,
      valueGetter: ({ data: d }) => d ? (d.assetTypeName   ? LOCATION_ASSET_TYPES[d.assetTypeName]   : '--') : '',
    },
    {
      headerName: 'Cabinet Type', width: 120, hide: isMobile,
      valueGetter: ({ data: d }) => d ? (d.cabinetTypeName ? LOCATION_CABINET_TYPES[d.cabinetTypeName] : '--') : '',
    },
    {
      headerName: 'Status', width: 90, sortable: false,
      cellRenderer: ({ data: d }: { data: LocationResponse }) => (
        d.disabled
          ? <span className="badge badge-soft badge-error badge-sm" style={{ cursor: 'default' }}>Disabled</span>
          : <span className="badge badge-soft badge-success badge-sm" style={{ cursor: 'default' }}>Active</span>
      ),
    },
    {
      headerName: 'Actions',
      width: isMobile ? 78 : 148,
      minWidth: isMobile ? 72 : 140,
      sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
      cellRenderer: ({ data: d }: { data: LocationResponse }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', height: '100%' }}>
          {can('UPDATE') && (isMobile
            ? <button className="btn btn-ghost btn-xs btn-square" title="Edit"
                onClick={(e) => { e.stopPropagation(); setEditing(d); setModalOpen(true); }}>
                <Pencil size={16} strokeWidth={1.5} />
              </button>
            : <button className="btn btn-outline btn-xs gap-1" title="Edit"
                onClick={(e) => { e.stopPropagation(); setEditing(d); setModalOpen(true); }}>
                <Pencil size={14} strokeWidth={1.5} /> Edit
              </button>
          )}
          {!d.disabled && can('DELETE') && (isMobile
            ? <button className="btn btn-ghost btn-xs btn-square text-error" title="Disable"
                onClick={(e) => { e.stopPropagation(); setConfirm({ loc: d, action: 'disable' }); }}>
                <Ban size={16} strokeWidth={1.5} />
              </button>
            : <button className="btn btn-outline btn-error btn-xs gap-1" title="Disable"
                onClick={(e) => { e.stopPropagation(); setConfirm({ loc: d, action: 'disable' }); }}>
                <Ban size={14} strokeWidth={1.5} /> Disable
              </button>
          )}
          {d.disabled && can('RESTORE') && (isMobile
            ? <button className="btn btn-ghost btn-xs btn-square text-info" title="Restore"
                onClick={(e) => { e.stopPropagation(); setConfirm({ loc: d, action: 'restore' }); }}>
                <RefreshCw size={16} strokeWidth={1.5} />
              </button>
            : <button className="btn btn-outline btn-info btn-xs gap-1" title="Restore"
                onClick={(e) => { e.stopPropagation(); setConfirm({ loc: d, action: 'restore' }); }}>
                <RefreshCw size={14} strokeWidth={1.5} /> Restore
              </button>
          )}
        </div>
      ),
    },
  ], [can, isMobile]);

  const bulkDisableCount  = selectedRows.filter((r) => !r.disabled).length;
  const bulkRestoreCount  = selectedRows.filter((r) =>  r.disabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.875rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-base-content)', margin: 0, flex: 1, letterSpacing: '-0.01em' }}>
          Location
        </h1>
        {can('CREATE') && (
          <button className="btn btn-sm btn-primary gap-1"
            onClick={() => { setEditing(null); setModalOpen(true); }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>+</span> Add location
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
              const label = tab === 'all' ? 'All' : tab === 'active' ? 'Active' : 'Disabled';
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8125rem',
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

          {/* Right: record count + Export CSV */}
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--sb-border)', padding: '0 0.75rem', gap: '0.75rem' }}>
            {!isMobile && (
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : `${totalItems} record${totalItems !== 1 ? 's' : ''}`}
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={exportFetching || totalItems === 0}
              title="Export all filtered records as CSV"
              className={isMobile ? 'btn btn-sm btn-outline btn-primary btn-square' : 'btn btn-sm btn-outline btn-primary gap-1.5'}
              style={{ fontSize: '0.75rem', height: '1.75rem', minHeight: '1.75rem', paddingInline: isMobile ? undefined : '0.6rem' }}>
              {exportFetching
                ? <span className="loading loading-spinner loading-xs" />
                : <Download size={14} strokeWidth={1.5} />}
              {!isMobile && (exportFetching ? 'Exporting…' : 'Export CSV')}
            </button>
          </div>
        </div>

        {/* Filter strip — always visible */}
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
              style={{ paddingLeft: '1.8rem', width: isMobile ? '100%' : '180px' }}
              placeholder="Search name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)} />
          </label>
          <select className="select select-bordered select-sm"
            style={{ width: isMobile ? '100%' : '150px' }}
            value={filterAssetType} onChange={(e) => setFilterAssetType(e.target.value)}>
            <option value="">All Asset Types</option>
            {Object.entries(LOCATION_ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select select-bordered select-sm"
            style={{ width: isMobile ? '100%' : '160px' }}
            value={filterCabinetType} onChange={(e) => setFilterCabinetType(e.target.value)}>
            <option value="">All Cabinet Types</option>
            {Object.entries(LOCATION_CABINET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasActiveFilters && (
            <button className="btn btn-xs btn-ghost gap-1" onClick={clearFilters}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Bulk selection bar */}
        {selectedRows.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 1rem',
            background: 'color-mix(in oklch, var(--color-primary) 8%, transparent)',
            borderBottom: '1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)',
            flexShrink: 0, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              {selectedRows.length} selected
            </span>
            {bulkDisableCount > 0 && can('DELETE') && (
              <button className="btn btn-xs btn-error btn-outline gap-1"
                onClick={handleBulkDisable} disabled={bulkLoading}>
                {bulkLoading && <span className="loading loading-spinner loading-xs" />}
                Disable {bulkDisableCount > 1 ? `(${bulkDisableCount})` : ''}
              </button>
            )}
            {bulkRestoreCount > 0 && can('RESTORE') && (
              <button className="btn btn-xs btn-info btn-outline gap-1"
                onClick={handleBulkRestore} disabled={bulkLoading}>
                {bulkLoading && <span className="loading loading-spinner loading-xs" />}
                Restore {bulkRestoreCount > 1 ? `(${bulkRestoreCount})` : ''}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-xs" onClick={clearSelection}>Clear</button>
          </div>
        )}

        {/* Grid */}
        <DataGrid
          columnDefs={cols}
          rowData={rows}
          loading={isLoading}
          getRowId={(r) => String(r.id)}
          onRowDoubleClicked={(r) => { setEditing(r); setModalOpen(true); }}
          onSelectionChanged={setSelectedRows}
          height="100%"
          checkboxes
          hideToolbar
          clearSelectionTrigger={clearTrigger}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.875rem',
            borderTop: '1px solid var(--color-base-300)',
            background: 'var(--color-base-100)',
            flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isLoading ? '…' : (
                  <>Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems}</>
                )}
              </span>
              <select
                className="select select-bordered select-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ fontSize: '0.72rem', height: '1.5rem', minHeight: '1.5rem', paddingBlock: 0 }}>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            </div>

            {/* Page controls */}
            {totalPages > 1 && (
              isMobile ? (
                <div className="join">
                  <button className="join-item btn btn-sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  <button className="join-item btn btn-sm btn-active pointer-events-none">
                    {currentPage + 1} / {totalPages}
                  </button>
                  <button className="join-item btn btn-sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                </div>
              ) : (
                <div className="join">
                  <button className="join-item btn btn-sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(0)}>«</button>
                  <button className="join-item btn btn-sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === '...'
                      ? <button key={`el-${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                      : <button key={p} onClick={() => setCurrentPage(p as number)}
                          className={`join-item btn btn-sm${p === currentPage ? ' btn-active' : ''}`}>
                          {(p as number) + 1}
                        </button>
                  )}
                  <button className="join-item btn btn-sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                  <button className="join-item btn btn-sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage(totalPages - 1)}>»</button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen}
        title={editing ? `Edit Location -- ${editing.name}` : 'Add New Location'}
        onClose={() => setModalOpen(false)}>
        <LocationForm
          initial={editing ?? undefined}
          existingLocations={data?.content ?? []}
          onSave={handleSave}
          loading={creating || updating}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'disable' ? 'Disable Location' : 'Restore Location'}
        message={
          confirm?.action === 'disable'
            ? `Disable "${confirm?.loc.name}"? It will no longer be selectable.`
            : `Restore "${confirm?.loc.name}"?`
        }
        confirmLabel={confirm?.action === 'disable' ? 'Disable' : 'Restore'}
        danger={confirm?.action === 'disable'}
        loading={disabling || restoring}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}