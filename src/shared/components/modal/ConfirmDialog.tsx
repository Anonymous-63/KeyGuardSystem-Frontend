import Modal from '@/shared/components/modal/Modal';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm',
  danger = false, loading = false, onConfirm, onCancel,
}: Props) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <p className="py-2 text-base-content/70">{message}</p>
      <div className="modal-action">
        <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
        <button
          className={`btn ${danger ? 'btn-error' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner loading-xs" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
