import { useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, RowClickedEvent, RowDoubleClickedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Types ───────────────────────────────────────────────────────────────────

export type { ColDef };

export interface DataGridProps<T> {
  columnDefs: ColDef<T>[];
  rowData: T[] | undefined;
  loading?: boolean;
  /** Unique field used as row ID */
  getRowId?: (row: T) => string;
  onRowClicked?: (row: T) => void;
  onRowDoubleClicked?: (row: T) => void;
  onSelectionChanged?: (rows: T[]) => void;
  rowSelection?: 'single' | 'multiple';
  /** Extra content above the grid (count bar, filters) */
  toolbar?: ReactNode;
  /** Pixels — default 420 */
  height?: number | string;
  /** Show CSV export button in top-right */
  exportable?: boolean;
  exportFilename?: string;
  /** Add a checkbox column for multi-row selection (like ShopZen theme) */
  checkboxes?: boolean;
  className?: string;
  /** Hide the count/toolbar bar above the grid */
  hideToolbar?: boolean;
  /** Increment to programmatically deselect all rows */
  clearSelectionTrigger?: number;
}

// ─── AG Grid theme vars ───────────────────────────────────────────────────────

const GRID_STYLE = `
.ag-keyguard {
  --ag-background-color:             var(--color-base-100);
  --ag-header-background-color:      var(--color-base-200);
  --ag-header-foreground-color:      var(--color-base-content);
  --ag-header-column-separator-color: var(--color-base-300);
  --ag-border-color:                 var(--color-base-300);
  --ag-row-border-color:             var(--color-base-200);
  --ag-odd-row-background-color:     color-mix(in oklch, var(--color-base-200) 40%, transparent);
  --ag-selected-row-background-color: var(--sb-active-bg, rgba(2,73,80,0.1));
  --ag-row-hover-color:              var(--sb-hover-bg, var(--color-base-200));
  --ag-foreground-color:             var(--color-base-content);
  --ag-secondary-foreground-color:   color-mix(in oklch, var(--color-base-content) 60%, transparent);
  --ag-font-size: 0.875rem;
  --ag-font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --ag-cell-horizontal-padding: 0.65rem;
  --ag-header-height: 34px;
  --ag-row-height: 34px;
  --ag-checkbox-checked-color:       var(--color-primary);
  --ag-input-focus-border-color:     var(--color-primary);
}
.ag-keyguard .ag-header-cell-label { font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.025em; }
.ag-keyguard .ag-cell { display: flex; align-items: center; }
.ag-keyguard .ag-paging-panel { border-top: 1px solid var(--color-base-300); font-size: 0.8125rem; }
.ag-keyguard .ag-root-wrapper { border: 1px solid var(--color-base-300); border-radius: 0.25rem; }
.ag-keyguard.ag-no-border .ag-root-wrapper { border: none; border-radius: 0; }
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = GRID_STYLE;
  document.head.appendChild(el);
  styleInjected = true;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DataGrid<T>({
  columnDefs,
  rowData,
  loading = false,
  getRowId,
  onRowClicked,
  onRowDoubleClicked,
  onSelectionChanged,
  rowSelection = 'single',
  toolbar,
  height = 420,
  exportable = false,
  exportFilename = 'export',
  checkboxes = false,
  className = '',
  hideToolbar = false,
  clearSelectionTrigger,
}: DataGridProps<T>) {
  injectStyle();
  const gridRef   = useRef<AgGridReact<T>>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    gridRef.current?.api?.deselectAll();
  }, [clearSelectionTrigger]);

  const handleReady = useCallback((_e: GridReadyEvent) => {
    // auto-size after data loads
  }, []);

  const handleRowClicked = useCallback((e: RowClickedEvent<T>) => {
    if (e.data) onRowClicked?.(e.data);
  }, [onRowClicked]);

  const handleRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<T>) => {
    if (e.data) onRowDoubleClicked?.(e.data);
  }, [onRowDoubleClicked]);

  const handleSelectionChanged = useCallback((e: SelectionChangedEvent<T>) => {
    const rows = e.api.getSelectedRows();
    onSelectionChanged?.(rows);
  }, [onSelectionChanged]);

  const handleExport = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: `${exportFilename}.csv` });
  }, [exportFilename]);

  const defaultColDef: ColDef<T> = {
    sortable: true,
    resizable: true,
    suppressMovable: false,
    filter: false,
    minWidth: 60,
  };

  const effectiveColumnDefs = useMemo<ColDef<T>[]>(() => {
    if (!checkboxes) return columnDefs;
    const checkboxCol: ColDef<T> = {
      headerName: '',
      width: 42,
      minWidth: 42,
      maxWidth: 42,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
      pinned: 'left',
    };
    return [checkboxCol, ...columnDefs];
  }, [checkboxes, columnDefs]);

  const rowCount = rowData?.length ?? 0;
  const fillMode = height === '100%';

  return (
    <div
      className={`flex flex-col gap-0 ${className}`}
      style={fillMode ? { flex: 1, minHeight: 0 } : undefined}
    >
      {/* Toolbar */}
      {!hideToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.3rem 0.65rem',
            background: 'var(--color-base-200)',
            border: '1px solid var(--color-base-300)',
            borderBottom: 'none',
            borderRadius: '0.25rem 0.25rem 0 0',
            fontSize: '0.8125rem',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            {loading ? (
              <span className="loading loading-dots loading-xs text-primary" />
            ) : (
              <span style={{ color: 'var(--color-base-content)', fontWeight: 600, opacity: 0.7 }}>
                {rowCount.toLocaleString()} {rowCount === 1 ? 'record' : 'records'}
              </span>
            )}
            {toolbar}
          </div>
          {exportable && (
            <button
              onClick={handleExport}
              style={{
                background: 'none',
                border: '1px solid var(--color-base-300)',
                borderRadius: '0.25rem',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--color-base-content)',
                opacity: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              ↓ CSV
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div style={fillMode ? { flex: 1, minHeight: 0, width: '100%' } : { height, width: '100%' }}>
        <AgGridReact<T>
          ref={gridRef}
          className={`ag-theme-alpine ag-keyguard${hideToolbar ? ' ag-no-border' : ''}`}
          theme="legacy"
          columnDefs={effectiveColumnDefs}
          rowData={rowData ?? []}
          defaultColDef={defaultColDef}
          getRowId={getRowId ? (p) => getRowId(p.data as T) : undefined}
          rowSelection={checkboxes ? 'multiple' : rowSelection}
          suppressRowClickSelection={checkboxes}
          onGridReady={handleReady}
          onRowClicked={handleRowClicked}
          onRowDoubleClicked={handleRowDoubleClicked}
          onSelectionChanged={handleSelectionChanged}
          loading={loading}
          pagination={false}
          animateRows={false}
          suppressCellFocus={true}
        />
      </div>
    </div>
  );
}
