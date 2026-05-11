import { useMemo, useState } from 'react';
import { useListConfigsQuery, useUpsertConfigMutation, useDeleteConfigMutation } from '../features/config/configApi';
import type { AppConfigResponse, AppConfigUpdateRequest } from '../types/api';
import PageHeader from '../components/shared/PageHeader';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PermissionGate from '../components/PermissionGate';
import { useToast } from '../components/shared/Toast';
import { FormRow, FormActions } from '../components/shared/Form';
import { DataGrid, type ColDef } from '../components/shared/DataGrid';

const ICO_SETTINGS = [
  'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
  'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
];

function ConfigForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: AppConfigResponse;
  onSave: (key: string, body: AppConfigUpdateRequest) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [key, setKey] = useState(initial?.configKey ?? '');
  const [value, setValue] = useState(initial?.configValue ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(key, { configValue: value, description: description || undefined });
      }}
      className="space-y-3"
    >
      <FormRow label="Key" required>
        <input
          className="input input-bordered w-full font-mono"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={!!initial}
          required
          maxLength={100}
          placeholder="e.g. mail.smtp_host"
        />
      </FormRow>
      <FormRow label="Value" required>
        <input
          className="input input-bordered w-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          maxLength={1000}
        />
      </FormRow>
      <FormRow label="Description">
        <input
          className="input input-bordered w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
        />
      </FormRow>
      <FormActions onCancel={onCancel} loading={loading} submitLabel={initial ? 'Update' : 'Create'} />
    </form>
  );
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [selected, setSelected] = useState<AppConfigResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppConfigResponse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppConfigResponse | null>(null);

  const { data: configs, isLoading } = useListConfigsQuery();
  const [upsert, { isLoading: saving }] = useUpsertConfigMutation();
  const [deleteConfig, { isLoading: deleting }] = useDeleteConfigMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (row: AppConfigResponse) => { setEditing(row); setModalOpen(true); };

  const handleSave = async (key: string, body: AppConfigUpdateRequest) => {
    try {
      await upsert({ key, body }).unwrap();
      addToast({ type: 'success', message: editing ? 'Config updated' : 'Config created' });
      setModalOpen(false);
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Failed to save config' });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteConfig(confirmDelete.configKey).unwrap();
      addToast({ type: 'success', message: 'Config deleted' });
      setSelected(null);
    } catch {
      addToast({ type: 'error', message: 'Failed to delete config' });
    }
    setConfirmDelete(null);
  };

  const cols = useMemo<ColDef<AppConfigResponse>[]>(() => [
    {
      field: 'configKey',
      headerName: 'Key',
      width: 220,
      cellStyle: { fontFamily: 'monospace', fontSize: '0.82rem' },
    },
    { field: 'configValue', headerName: 'Value', flex: 1 },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      valueFormatter: ({ value }: { value: string | undefined }) => value ?? '',
    },
    {
      field: 'mDate',
      headerName: 'Last Modified',
      width: 155,
      valueFormatter: ({ value }: { value: string | undefined }) =>
        value ? new Date(value).toLocaleString() : '',
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        icon={ICO_SETTINGS}
        title="System Settings"
        resource="APP_CONFIG"
        onAdd={openCreate}
        onUpdate={() => selected && openEdit(selected)}
        updateDisabled={!selected}
        extra={
          <PermissionGate resource="APP_CONFIG" action="DELETE">
            <button
              className="btn btn-error btn-sm"
              onClick={() => selected && setConfirmDelete(selected)}
              disabled={!selected}
              title={!selected ? 'Select a row first' : undefined}
            >
              Delete
            </button>
          </PermissionGate>
        }
      />

      <div className="card bg-base-100 shadow" style={{ flex: 1, minHeight: 0 }}>
        <div className="card-body p-0 overflow-hidden" style={{ flex: 1 }}>
          <DataGrid
            columnDefs={cols}
            rowData={configs ?? []}
            loading={isLoading}
            getRowId={(r) => r.configKey}
            onRowClicked={(r) => setSelected(r)}
            onRowDoubleClicked={(r) => { setSelected(r); openEdit(r); }}
            height="100%"
            exportable
            exportFilename="app-config"
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? `Edit — ${editing.configKey}` : 'New Config'}
        onClose={() => setModalOpen(false)}
      >
        <ConfigForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Config"
        message={`Delete "${confirmDelete?.configKey}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
